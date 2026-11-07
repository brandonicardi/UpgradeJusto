import { expect, type Locator, type Page, type Response as BrowserResponse } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { test } from "../e2e/fixtures";
import { loginBasic } from "../support/basic-scope";
import { evidenceApi } from "../support/visual-evidence";
import { emptyTower, towerUUID, type Tower } from "../../lib/towers";
import type { TowerPlanRead } from "../../lib/tower-plans";
import type { TowerRecommendationPreview } from "../../lib/tower-recommendations";
import type { TowerComponent } from "../../lib/tower-catalog";
import { vendorImageURL, displayImage, offerDisplayStatus } from "../../lib/retail-presentation";
import { parseCatalogTowerPage, catalogBoundOffers } from "../../lib/catalog-tower-consumer";
import { centralPreviewBranch } from "../support/central-preview-branch";
import { closePlanStagesForEvidence, openPlanStagesForEvidence, planAnchorEvidence } from "../support/plan-anchor-evidence";

test.use({ trace: "off", screenshot: "off", video: "off" });
type Capture = { file: string; horizontal_overflow: boolean; overflow_nodes?: { tag: string; classes: string; left: number; right: number; width: number; min_width: string; white_space: string; overflow_wrap: string; display: string }[] };
function safeError(error: unknown): { error_class: string; known_code: string | null; matcher: string | null } {
  const classes = ["Error", "TimeoutError", "AssertionError", "TypeError", "RangeError", "SyntaxError", "AbortError"];
  const codes = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ECANCELED", "ABORT_ERR", "ERR_ABORTED", "ERR_CONNECTION_CLOSED", "ERR_CONNECTION_RESET"];
  const matchers = ["toBe", "toEqual", "toHaveValue", "toBeVisible", "toContainText", "toHaveCount", "toHaveAttribute", "toBeFocused"];
  const data = error as { code?: unknown; matcherResult?: { name?: unknown } } | null;
  const name = error instanceof Error ? error.name : "UnknownError";
  return { error_class: classes.includes(name) ? name : "OtherError", known_code: typeof data?.code === "string" && codes.includes(data.code) ? data.code : null, matcher: typeof data?.matcherResult?.name === "string" && matchers.includes(data.matcherResult.name) ? data.matcherResult.name : null };
}
async function capture(page: Page, directory: string, captures: Capture[], file: string, anchor: Locator, focus?: Locator) {
  await expect(anchor).toBeVisible();
  if (focus) {
    // Native keyboard modality, not CSS injected to fake a focus ring.
    await focus.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab"); await expect(focus).toBeFocused();
  }
  await anchor.evaluate(element => element.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const overflowNodes = overflow ? await page.evaluate(() => [...document.querySelectorAll("main *")].flatMap(element => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || (rect.left >= -1 && rect.right <= innerWidth + 1)) return [];
    const css = getComputedStyle(element);
    // Geometry and static CSS classes only: no text, field values, DOM IDs or DTO.
    return [{ tag: element.tagName.toLowerCase(), classes: (element.getAttribute("class") ?? "").slice(0, 200), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), min_width: css.minWidth, white_space: css.whiteSpace, overflow_wrap: css.overflowWrap, display: css.display }];
  }).sort((a, b) => b.right - a.right).slice(0, 12)) : undefined;
  await page.screenshot({ path: path.join(directory, file), animations: "disabled" });
  captures.push({ file, horizontal_overflow: overflow, ...(overflowNodes ? { overflow_nodes: overflowNodes } : {}) });
}
async function settlePhotos(target: Locator) {
  // Only the first presented photo, not every offscreen lazy image in a frozen
  // history. Scroll naturally to trigger loading; renderer owns error fallback.
  const photo = target.locator(".tower-product-photo:visible").first();
  if (!await photo.count()) return;
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate(element => {
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return false;
    const image = element.querySelector("img");
    return image ? image.complete && image.naturalWidth > 0 : !!element.querySelector("span");
  }), { message: "Visible vendor image must load or use the renderer's actual fallback" }).toBe(true);
  await target.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const sources = await photo.locator("img").evaluateAll(images => images.map(image => image.getAttribute("src")));
  expect(sources.every(source => vendorImageURL(source) !== null), "Only the existing allowlisted vendor raster policy may render photos").toBe(true);
}
async function saveExplicitly(page: Page, editor: Locator, postCount: () => number) {
  let finish!: (value: BrowserResponse) => void;
  const received = new Promise<BrowserResponse>(resolve => { finish = resolve; });
  const observe = (response: BrowserResponse) => { if (new URL(response.url()).pathname === "/api/tower-plans" && response.request().method() === "POST") finish(response); };
  page.on("response", observe);
  try {
    await editor.getByRole("button", { name: "Confirmar y guardar mi plan", exact: true }).click();
    await expect.poll(async () => {
      if (postCount()) return postCount() === 1 ? "POST observado" : "POST duplicado";
      return await page.getByRole("alert", { name: "Estado de guardado del plan", exact: true }).count() ? "Rechazo local sin POST" : "Esperando POST";
    }).toBe("POST observado");
    return await received;
  } finally { page.off("response", observe); }
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`@central38 recorrido visual REAL PC→propuesta descartada→dos etapas→snapshot ${viewport.width}`, async ({ newImageEvidenceContext, socketProxy }) => {
    // Keep the standard30s journey timeout. Build runs these serially on real TEST.
    const context = await newImageEvidenceContext(), page = await context.newPage(); await page.setViewportSize(viewport);
    const parent = path.resolve(process.cwd(), `../.local/tiendas/central-final-${viewport.width}`);
    await mkdir(parent, { recursive: true });
    const directory = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
    await mkdir(directory, { recursive: false });
    let phase = "login", failure: string | null = null, own: Tower | null = null, plan: TowerPlanRead | null = null, planId: string | null = null, applicationOrigin: string | null = null;
    let planCapture: Promise<void> | null = null, planPosts = 0, pcWrites = 0, pcWritesBeforeCleanup = 0, cleanupFailed = false;
    let referenceVersions: { catalog: string; rules: string; references: string } | null = null;
    let proposalCount = 0, rejected = 0, needsVerification = 0, recommended = 0, shown = 0, photosLoaded = 0, placeholders = 0, metadataState = "not_observed";
    let diagnostic: ReturnType<typeof safeError> | null = null, historyRequests = 0, historyResponseSeen = false, historyHTTPStatus: number | null = null;
    const imageEvents: { host: string; event: "requested" | "finished" | "failed" | "response"; status?: number; code?: string }[] = [];
    const imageMetadata = new Map<string, { name: string; image_present: boolean; verified: boolean; exact_variant: boolean; bytes_verified: boolean; allowlisted_raster: boolean; image_matches_evidence: boolean }>();
    const imageMetadataReads: Promise<void>[] = [];
    let metadataReadFailures = 0;
    let observedBranch: ReturnType<typeof centralPreviewBranch> | null = null;
    let manualCandidateOffers = 0, manualCandidateCurrentOffers = 0;
    const imageHost = (value: string) => vendorImageURL(value) ? new URL(value).hostname : null;
    page.on("request", request => { const host = imageHost(request.url()); if (request.resourceType() === "image" && host) imageEvents.push({ host, event: "requested" }); });
    page.on("requestfinished", request => { const host = imageHost(request.url()); if (request.resourceType() === "image" && host) imageEvents.push({ host, event: "finished" }); });
    page.on("requestfailed", request => {
      const host = imageHost(request.url()); if (request.resourceType() !== "image" || !host) return;
      const text = request.failure()?.errorText ?? "";
      const known = ["ERR_TUNNEL_CONNECTION_FAILED", "ERR_PROXY_CONNECTION_FAILED", "ERR_NAME_NOT_RESOLVED", "ERR_CERT_AUTHORITY_INVALID", "ERR_CERT_DATE_INVALID", "ERR_CONNECTION_REFUSED", "ERR_CONNECTION_RESET", "ERR_TIMED_OUT", "ERR_ABORTED", "ERR_FAILED"];
      imageEvents.push({ host, event: "failed", code: known.find(code => text === `net::${code}`) ?? "unclassified" });
    });
    page.on("response", response => {
      const url = new URL(response.url()), host = imageHost(response.url());
      if (response.request().resourceType() === "image" && host) imageEvents.push({ host, event: "response", status: response.status() });
      if (url.origin !== applicationOrigin || !/^\/api\/catalog\/components\/[A-Za-z0-9_-]+$/.test(url.pathname) || !response.ok()) return;
      imageMetadataReads.push(response.json().then((part: TowerComponent) => {
        const evidence = part.image_evidence;
        if (typeof part.id !== "string" || typeof part.name !== "string") { metadataReadFailures++; return; }
        imageMetadata.set(part.id, { name: part.name.slice(0, 200), image_present: typeof part.image === "string", verified: evidence?.status === "verified", exact_variant: evidence?.exact_variant === true, bytes_verified: evidence?.photo_bytes_verified === true, allowlisted_raster: vendorImageURL(part.image) !== null, image_matches_evidence: typeof part.image === "string" && part.image === evidence?.url });
      }).catch(() => { metadataReadFailures++; }));
    });
    const captures: Capture[] = [];
    const recordPlan = (response: BrowserResponse) => {
      if (new URL(response.url()).pathname !== "/api/tower-plans" || response.request().method() !== "POST" || !response.ok()) return;
      planCapture = response.json().then((value: TowerPlanRead) => { if (value.kind === "tower_plan" && towerUUID.test(value.id)) planId = value.id; }).catch(() => undefined);
    };
    page.on("response", recordPlan);
    try {
      await loginBasic(page);
      applicationOrigin = new URL(page.url()).origin;
      phase = "create-own-pc";
      const input = emptyTower(); input.name = "Mi PC para revisar"; input.category_status.cpu = "present"; input.category_status.gpu = "present";
      input.lines = [{ line_id: null, category: "cpu", component_id: "P01", declared_model: null, quantity: 1 }, { line_id: null, category: "gpu", component_id: "P06", declared_model: null, quantity: 1 }];
      const created = await evidenceApi(page, "/api/towers", "POST", input); expect(created.status).toBe(201); own = created.data as Tower;
      page.on("request", request => {
        const route = new URL(request.url()).pathname;
        if (request.method() === "POST" && route.startsWith("/api/tower-plans")) planPosts++;
        if (["POST", "PUT", "DELETE"].includes(request.method()) && (route === "/api/towers" || route === `/api/towers/${own?.id}`)) pcWrites++;
        if (request.method() === "GET" && planId && route === `/api/tower-plans/${planId}/revisions/1`) historyRequests++;
      });
      await page.goto("/pcs"); await page.getByRole("button", { name: input.name, exact: true }).click();
      const detail = page.getByRole("region", { name: "Detalle de PC", exact: true });
      await expect(detail).toContainText("No sé / por confirmar");
      await expect(detail).not.toContainText("Consultando referencia");
      phase = "capture-pc"; await settlePhotos(detail);
      await capture(page, directory, captures, "01-pc-guardada.png", detail.getByRole("heading", { name: input.name, exact: true }));
      const criteria = page.getByRole("form", { name: "Objetivo y presupuesto de torre", exact: true });
      await criteria.getByLabel("Objetivo de mejora", { exact: true }).selectOption("gaming");
      await criteria.getByLabel("Presupuesto ARS (punto decimal, sin miles)", { exact: true }).fill("0.01");
      const materialSummary = page.getByText("Materiales y datos a confirmar", { exact: true });
      await materialSummary.click(); await expect(materialSummary.locator("..").getByRole("checkbox")).not.toBeChecked(); await materialSummary.click();
      phase = "capture-criteria";
      const search = criteria.getByRole("button", { name: "Buscar propuestas para mi torre", exact: true });
      await capture(page, directory, captures, "01b-objetivo-presupuesto.png", page.getByRole("heading", { name: "Qué querés mejorar", exact: true }));
      await capture(page, directory, captures, "01c-accion-consulta.png", search, search);
      phase = "real-preview";
      const received = page.waitForResponse(response => response.url().endsWith(`/api/towers/${own!.id}/recommendations/preview`) && response.request().method() === "POST");
      await search.click(); const previewResponse = await received; expect(previewResponse.status()).toBe(200); const preview = await previewResponse.json() as TowerRecommendationPreview;
      proposalCount = preview.items.length; rejected = preview.items.filter(item => item.status === "rejected").length; needsVerification = preview.items.filter(item => item.status === "requires_verification").length; recommended = preview.items.filter(item => item.status === "recommended").length;
      expect(recommended, "This partial synthetic PC is not evidence of full physical compatibility").toBe(0);
      observedBranch = centralPreviewBranch(preview, Date.now()); const chosen = observedBranch.chosen;
      referenceVersions = { catalog: preview.items[chosen].versions.catalog, rules: preview.items[chosen].versions.rules, references: preview.items[chosen].versions.references };
      const proposals = page.getByRole("region", { name: "Propuestas de torre del servidor", exact: true });
      shown = Math.min(6, proposalCount); await expect(proposals.getByRole("article")).toHaveCount(shown);
      await expect(proposals).not.toContainText("Consultando referencia y versión del catálogo");
      const proposal = proposals.getByRole("article").nth(chosen); await settlePhotos(proposal);
      const proposalText = await proposal.textContent(); metadataState = proposalText?.includes("Catálogo cambió") ? "catalog_changed" : proposalText?.includes("No se pudo verificar la versión") ? "unavailable" : "resolved";
      photosLoaded = await proposal.locator(".tower-product-photo img").evaluateAll(images => images.filter(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0).length);
      placeholders = await proposal.locator(".tower-product-photo > span").count();
      phase = "capture-proposal";
      await capture(page, directory, captures, observedBranch.branch === "quoted_budget_rejection" ? "02-propuesta-real-descartada.png" : "02-propuesta-real-requiere-verificacion.png", proposal.getByRole("heading", { level: 4 }).first());
      await proposal.getByText("Cotizaciones utilizadas y partidas", { exact: true }).click();
      await capture(page, directory, captures, "02b-cotizacion-fecha-condicion.png", proposal.getByText("Cotizaciones utilizadas y partidas", { exact: true }));
      await proposal.getByText("Compatibilidad, cobertura y exclusiones", { exact: true }).click();
      await capture(page, directory, captures, "02c-cobertura-pendiente.png", proposal.getByRole("region", { name: "Cobertura de torre", exact: true }));
      await capture(page, directory, captures, "02d-limites-de-alcance.png", proposal.getByRole("region", { name: "Límites de la comprobación", exact: true }));
      phase = "edit-plan";
      if (observedBranch.branch === "quoted_budget_rejection") await proposal.getByRole("button", { name: "Preparar plan por etapas (no guardar)", exact: true }).click();
      else {
        await expect(proposal).toContainText("Total incompleto / desconocido");
        await expect(proposal).toContainText("No se puede confirmar si alcanza el presupuesto");
        await page.getByRole("button", { name: "Preparar plan manual vacío (no guardar)", exact: true }).click();
      }
      const editor = page.getByRole("form", { name: "Editor de plan de torre", exact: true }); await expect(editor).toBeVisible(); expect(planPosts).toBe(0);
      if (observedBranch.branch === "no_current_preview_quotes_manual") {
        phase = "manual-real-candidate";
        const response = await evidenceApi(page, "/api/catalog/components?category=gpu&page=1&page_size=12&sort=retail_first"); expect(response.status).toBe(200);
        const data = parseCatalogTowerPage(response.data), observedAt = Date.now();
        const candidate = data.items.find(part => displayImage(part) !== null && catalogBoundOffers(part).some(offer => offer.amount !== null));
        expect(Boolean(candidate)).toBe(true); if (!candidate) throw new Error("manual_candidate_unavailable");
        const offers = catalogBoundOffers(candidate); manualCandidateOffers = offers.length;
        manualCandidateCurrentOffers = offers.filter(offer => offer.amount !== null && offerDisplayStatus(offer, observedAt) === "fresh").length;
        expect(manualCandidateOffers).toBeGreaterThan(0); expect(manualCandidateCurrentOffers).toBe(0);
        const first = editor.getByRole("region", { name: "Editar etapa 1", exact: true });
        await expect(first.locator("ol > li")).toHaveCount(0); await expect(editor.getByRole("button", { name: "Confirmar y guardar mi plan", exact: true })).toBeDisabled();
        await first.getByText("Agregar acción a etapa 1", { exact: true }).click();
        await first.getByLabel("Categoría de acción del plan", { exact: true }).selectOption("gpu");
        await first.getByLabel("Identificación para acción 1", { exact: true }).selectOption("catalog");
        const selector = first.getByRole("region", { name: "Selector de Gráfica", exact: true });
        await selector.getByLabel("Buscar Gráfica en el catálogo", { exact: true }).fill(candidate.name.slice(0, 100)); await selector.getByRole("button", { name: "Buscar", exact: true }).click();
        await selector.getByRole("button", { name: candidate.name, exact: true }).click();
        const photo = selector.locator(".tower-product-photo img").first(); await photo.scrollIntoViewIfNeeded();
        await expect.poll(() => photo.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
        expect(await photo.getAttribute("src")).toBe(displayImage(candidate)); photosLoaded = 1; metadataState = "manual_real_catalog_candidate";
        await first.getByLabel("Cantidad para acción 1", { exact: true }).fill("1");
        await capture(page, directory, captures, "02e-candidata-real-manual-sin-precio-vigente.png", selector);
        await first.getByRole("button", { name: "Agregar acción a esta etapa", exact: true }).click(); await first.getByText("Agregar acción a etapa 1", { exact: true }).click();
      }
      await editor.getByLabel("Nombre del plan", { exact: true }).fill("Plan por etapas para revisar");
      await editor.getByRole("button", { name: "Agregar etapa", exact: true }).click();
      const second = editor.getByRole("region", { name: "Editar etapa 2", exact: true });
      await second.getByLabel("Presupuesto ARS de etapa 2", { exact: true }).fill("10.00");
      await expect(second.getByLabel("Confirmé pasta térmica disponible para etapa 2", { exact: true })).not.toBeChecked();
      await second.getByText("Agregar acción a etapa 2", { exact: true }).click();
      await second.getByLabel("Categoría de acción del plan", { exact: true }).selectOption("storage");
      const storageResponse = await evidenceApi(page, "/api/catalog/components?category=storage&page=1&page_size=12&sort=retail_first"); expect(storageResponse.status).toBe(200);
      const storage = parseCatalogTowerPage(storageResponse.data).items[0]; expect(Boolean(storage)).toBe(true);
      await second.getByLabel("Identificación para acción 1", { exact: true }).selectOption("catalog");
      const storageSelector = second.getByRole("region", { name: "Selector de Almacenamiento", exact: true });
      await storageSelector.getByLabel("Buscar Almacenamiento en el catálogo", { exact: true }).fill(storage.name.slice(0, 100)); await storageSelector.getByRole("button", { name: "Buscar", exact: true }).click();
      await storageSelector.getByRole("button", { name: storage.name, exact: true }).click();
      await expect(second.getByLabel("Cantidad para acción 1", { exact: true })).toHaveValue("");
      await second.getByLabel("Cantidad para acción 1", { exact: true }).fill("1");
      await second.getByRole("button", { name: "Agregar acción a esta etapa", exact: true }).click();
      await second.getByText("Agregar acción a etapa 2", { exact: true }).click();
      phase = "capture-editor";
      await capture(page, directory, captures, "03-plan-borrador.png", page.getByRole("heading", { name: "Organizar mi plan por etapas", exact: true }));
      await capture(page, directory, captures, "03b-primera-etapa.png", editor.getByRole("region", { name: "Editar etapa 1", exact: true }));
      await capture(page, directory, captures, "03c-segunda-etapa-cantidad-explicita.png", second);
      const consent = editor.getByLabel("Revisé etapas, cantidades y contexto; confirmo guardar sin modificar mi PC", { exact: true });
      const save = editor.getByRole("button", { name: "Confirmar y guardar mi plan", exact: true });
      await expect(save).toBeDisabled(); expect(planPosts).toBe(0);
      await capture(page, directory, captures, "03d-confirmacion-requerida.png", consent);
      await consent.check(); await capture(page, directory, captures, "03e-confirmacion-explicita-antes-save.png", consent, save);
      phase = "save-explicit";
      const saved = await saveExplicitly(page, editor, () => planPosts); expect(saved.status()).toBe(201); plan = await saved.json() as TowerPlanRead; planId = plan.id;
      if (observedBranch.branch === "no_current_preview_quotes_manual") {
        expect(plan.snapshot.cost.total_ars).toBeNull(); expect(plan.snapshot.cost.within_budget).not.toBe(true);
        expect(plan.snapshot.stages[0].actions[0].category).toBe("gpu"); expect(plan.snapshot.stages[0].actions[0].candidates[0].quantity).toBe(1);
      }
      expect(plan.snapshot.stages[1].actions[0].candidates[0].component_id).toBe(storage.id);
      expect(plan.snapshot.stages.length).toBe(2); expect(plan.snapshot.stages[1].materials.length).toBe(0); expect(plan.snapshot.status).not.toBe("ready"); expect(planPosts).toBe(1); expect(pcWrites).toBe(0);
      expect(isDeepStrictEqual((await evidenceApi(page, `/api/towers/${own.id}`)).data, own), "Plan save must not apply changes to PC").toBe(true);
      const frozen = plan.snapshot;
      phase = "saved-plan-open-link";
      await page.getByRole("link", { name: "Abrir plan guardado e historial", exact: true }).click();
      phase = "saved-plan-await-region";
      const read = page.getByRole("region", { name: "Detalle de plan de torre", exact: true }); await expect(read).toBeVisible();
      await expect(read.locator("details.plan-stage[open]")).toHaveCount(0);
      await openPlanStagesForEvidence(read, plan, value => { phase = `saved-plan-${value}`; });
      phase = "saved-plan-all-opened-metadata";
      await expect(read).not.toContainText("Consultando referencia y versión del catálogo", { timeout: 5000 });
      phase = "saved-plan-settle-photos"; await settlePhotos(read);
      phase = "saved-plan-restore-normal-collapsed"; await closePlanStagesForEvidence(read, plan);
      await expect(read.locator("details.plan-stage[open]")).toHaveCount(0);
      phase = "capture-saved-plan";
      await capture(page, directory, captures, "04-plan-guardado-snapshot.png", read.getByRole("heading", { name: plan.name, exact: true }));
      phase = "saved-plan-comparison-actions";
      await planAnchorEvidence(read, plan, (file, anchor) => capture(page, directory, captures, file, anchor));
      phase = "history-fill-revision";
      const revisionInput = page.getByLabel("Revisión histórica", { exact: true }); await revisionInput.fill("1");
      phase = "history-verify-input"; await expect(revisionInput).toHaveValue("1");
      phase = "history-arm-response";
      const revision = page.waitForResponse(response => response.url().endsWith(`/api/tower-plans/${planId}/revisions/1`) && response.request().method() === "GET");
      // If click/actionability fails first, avoid a later unhandled timeout from
      // this pending observer. The awaited original still reports its failure.
      void revision.catch(() => undefined);
      phase = "history-click-submit";
      await page.getByRole("button", { name: "Consultar revisión histórica", exact: true }).click();
      phase = "history-await-response";
      const historical = await revision; historyResponseSeen = true; historyHTTPStatus = historical.status();
      phase = "history-assert-http-status"; expect(historyHTTPStatus).toBe(200);
      phase = "history-decode-json"; const history = await historical.json() as TowerPlanRead;
      phase = "history-compare-frozen-snapshot";
      expect(isDeepStrictEqual(history.snapshot, frozen), "Historical GET must keep the stored snapshot unchanged").toBe(true);
      phase = "history-await-region";
      const historyView = page.getByRole("region", { name: "Revisión histórica de plan", exact: true }); await expect(historyView).toBeVisible();
      await expect(historyView.locator("details.plan-stage[open]")).toHaveCount(0);
      await openPlanStagesForEvidence(historyView, history, value => { phase = `history-${value}`; });
      phase = "history-all-opened-metadata";
      await expect(historyView).not.toContainText("Consultando referencia y versión del catálogo", { timeout: 5000 });
      phase = "history-settle-photos"; await settlePhotos(historyView);
      phase = "history-restore-normal-collapsed"; await closePlanStagesForEvidence(historyView, history);
      phase = "capture-history";
      await capture(page, directory, captures, "04b-historial-congelado.png", historyView.getByRole("heading", { name: history.name, exact: true }));
      phase = "history-frozen-quotes";
      const quoteStage = historyView.locator("summary").filter({ hasText: /^Etapa 1:/ });
      if (await quoteStage.locator("..").getAttribute("open") === null) await quoteStage.click();
      const storedQuotes = historyView.getByRole("region", { name: "Precios guardados de etapa 1", exact: true }); await expect(storedQuotes).toBeVisible();
      phase = "history-capture-frozen-quotes";
      await capture(page, directory, captures, "04c-ofertas-historicas-sin-recotizar.png", storedQuotes);
      await closePlanStagesForEvidence(historyView, history);
      expect(planPosts).toBe(1); expect(pcWrites).toBe(0);
      phase = "image-evidence-acceptance";
      expect(socketProxy.stats.rejectedOtherConnect, "Opt-in image transport must not attempt external CONNECT through the app-only proxy").toBe(0);
      expect(photosLoaded, "A real quoted retail proposal photo must have naturalWidth > 0; placeholders do not accredit photos").toBeGreaterThan(0);
      phase = "layout-observation";
      expect(captures.every(item => !item.horizontal_overflow), "Evidence is saved even when overflow requires pixel review").toBe(true);
      phase = "complete";
    } catch (error) {
      diagnostic = safeError(error);
      failure = `Central38 visual journey failed phase=${phase} class=${diagnostic.error_class} code=${diagnostic.known_code ?? "none"} matcher=${diagnostic.matcher ?? "none"}`;
      // Actual viewport at failure, not a regenerated/edited baseline. Capture
      // only the test-owned plan page, never account/login or another origin.
      if (phase.startsWith("history-") || phase === "capture-history") {
        try {
          const url = new URL(page.url());
          if (!page.isClosed() && planId && url.origin === applicationOrigin && url.pathname === `/tower-plans/${planId}`) {
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
            await page.screenshot({ path: path.join(directory, "99-diagnostic-history-failure.png"), animations: "disabled" });
            captures.push({ file: "99-diagnostic-history-failure.png", horizontal_overflow: overflow });
          }
        } catch { /* Diagnostic capture must not replace the sanitized cause. */ }
      }
    }
    finally {
      pcWritesBeforeCleanup = pcWrites;
      try {
        await Promise.all(imageMetadataReads);
        if (planCapture) await planCapture;
        if (planId) { const latest = await evidenceApi(page, `/api/tower-plans/${planId}`); if (latest.status === 200) { if ((await evidenceApi(page, `/api/tower-plans/${planId}`, "DELETE", { expected_plan_revision: (latest.data as TowerPlanRead).revision })).status !== 204) { cleanupFailed = true; failure ??= "Central38 cleanup failed phase=own-plan"; } } else if (latest.status !== 404) { cleanupFailed = true; failure ??= "Central38 cleanup failed phase=own-plan-read"; } }
      } catch { cleanupFailed = true; failure ??= "Central38 cleanup failed phase=own-plan"; }
      finally {
        try { if (own && ![204, 404].includes((await evidenceApi(page, `/api/towers/${own.id}`, "DELETE")).status)) { cleanupFailed = true; failure ??= "Central38 cleanup failed phase=own-pc"; } }
        catch { cleanupFailed = true; failure ??= "Central38 cleanup failed phase=own-pc"; }
        finally {
          page.off("response", recordPlan);
           try { await writeFile(path.join(directory, "index.json"), JSON.stringify({ viewport, journey: phase === "complete" ? "complete" : "incomplete", phase, diagnostic, observed_branch: observedBranch, manual_candidate: { offers: manualCandidateOffers, current_offers: manualCandidateCurrentOffers }, history: { requests: historyRequests, response_seen: historyResponseSeen, http_status: historyHTTPStatus }, captures, proposal_counts: { total: proposalCount, visible: shown, rejected, requires_verification: needsVerification, recommended }, metadata: { state: metadataState, photos_loaded: photosLoaded, placeholders }, image_diagnostic: { metadata: [...imageMetadata.values()], events: imageEvents, metadata_read_failures: metadataReadFailures, fixture_external_connect_rejections: socketProxy.stats.rejectedOtherConnect }, reference_versions: referenceVersions, plan_status: plan?.snapshot.status ?? null, plan_posts: planPosts, pc_writes_before_cleanup: pcWritesBeforeCleanup, cleanup: cleanupFailed ? "failed" : "completed" }, null, 2), { flag: "wx" }); }
          finally { await context.close(); }
        }
      }
    }
    if (failure) throw new Error(failure);
  });
}
