import { expect, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { test } from "../e2e/fixtures";
import { parseCatalogTowerPage, catalogBoundOffers } from "../../lib/catalog-tower-consumer";
import { towerUUID, type Tower } from "../../lib/towers";
import type { TowerPlanRead } from "../../lib/tower-plans";
import { purchaseBudget, purchaseSubtotal } from "../../lib/purchase-draft";
import { retailSourceURL } from "../../lib/retail-presentation";
import { planAnchorEvidence } from "../support/plan-anchor-evidence";
test.use({ trace: "off", video: "off", screenshot: "off" });
async function api(page: Page, route: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => { const headers: Record<string, string> = {}; if (args.method !== "GET") { const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json(); headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json"; } const response = await fetch(args.route, { method: args.method, headers, cache: "no-store", body: args.body === undefined ? undefined : JSON.stringify(args.body) }); return { status: response.status, data: response.status === 204 ? null : await response.json() }; }, { route, method, body });
}
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) test(`@v0-integrated vacío→compra real→guardar explícito→motor→plan ${viewport.width}`, async ({ newImageEvidenceContext }) => {
  const context = await newImageEvidenceContext(), page = await context.newPage(); await page.setViewportSize(viewport); page.setDefaultTimeout(5000);
  const parent = path.resolve(process.cwd(), "../.local/tiendas/v0-integrated"); await mkdir(parent, { recursive: true });
  const directory = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`); await mkdir(directory, { recursive: false });
  const captures: { file: string; horizontal_overflow: boolean }[] = [];
  let phase = "own-account", failure: string | null = null, own: Tower | null = null, plan: TowerPlanRead | null = null, pcPosts = 0, planPosts = 0, cleanupFailed = false;
  const observed = { catalog_status: 0, catalog_items: 0, selector_count: 0, search_chars: 0, matching_part_buttons: 0, quantity_inputs: 0, offer_selects: 0, added_lines: 0, over_budget_visible: false, source_visible_after_collapse: false };
  async function shot(file: string, anchor: Locator, top = false) {
    await expect(anchor).toBeVisible({ timeout: 5000 });
    if (top) await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); else await anchor.evaluate(element => element.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
    await page.evaluate(async () => { await document.fonts.ready; });
    await expect.poll(() => page.locator(".tower-product-photo").evaluateAll(photos => photos.every(photo => { const rect = photo.getBoundingClientRect(); return !rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || photo.getAttribute("data-photo-state") !== "loading"; })), { timeout: 5000, message: "Visible photos must load naturally or show renderer fallback before evidence" }).toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); await page.screenshot({ path: path.join(directory, file), animations: "disabled" }); captures.push({ file, horizontal_overflow: overflow });
  }
  try {
    await page.goto("/catalog"); const credentials = { email: `v0-own-${randomUUID()}@example.test`, password: randomUUID() }; expect((await api(page, "/api/auth/register", "POST", credentials)).status).toBe(201); expect((await api(page, "/api/auth/login", "POST", credentials)).status).toBe(200);
    page.on("request", request => { const route = new URL(request.url()).pathname; if (request.method() === "POST" && route === "/api/towers") pcPosts++; if (request.method() === "POST" && route === "/api/tower-plans") planPosts++; });
    phase = "entry"; await page.goto("/"); await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 }); await shot("00-entrada-shell.png", page.locator("body"), true); await shot("01-entrada.png", page.getByRole("heading", { level: 1 })); await page.getByRole("link", { name: /Quiero armar una desde cero/ }).click();
    const builder = page.getByRole("region", { name: "Armado desde cero", exact: true }); await expect(builder).toContainText("Todavía no hay compras", { timeout: 5000 }); await expect(builder).toContainText("Elegí tu primer componente"); expect(pcPosts).toBe(0);
    if (viewport.width === 390) {
      const counts = { page_objective: 0, builder_objective: 0, page_budget: 0, builder_budget: 0, page_condition: 0, builder_condition: 0 };
      Object.assign(observed, { mobile_goal_controls: counts });
      // El objetivo es un grupo de botones; cada opción es un botón dentro del grupo.
      const objectiveControl = builder.getByRole("group", { name: "Objetivo del armado" });
      phase = "mobile-goal-objective-counts";
      counts.page_objective = await page.getByRole("group", { name: "Objetivo del armado" }).count(); counts.builder_objective = await objectiveControl.count();
      expect(counts.page_objective).toBe(1); await expect(objectiveControl).toHaveCount(1, { timeout: 5000 });
      phase = "mobile-goal-objective-visible"; await expect(objectiveControl).toBeVisible({ timeout: 5000 });
      await expect(objectiveControl.getByRole("button")).not.toHaveCount(0);
      await expect(objectiveControl.getByRole("button", { pressed: true })).toHaveCount(1);
      const budgetControl = builder.getByRole("textbox", { name: "Presupuesto ARS del armado", exact: true });
      phase = "mobile-goal-budget-counts";
      counts.page_budget = await page.getByRole("textbox", { name: "Presupuesto ARS del armado", exact: true }).count(); counts.builder_budget = await budgetControl.count();
      expect(counts.page_budget).toBe(1); await expect(budgetControl).toHaveCount(1, { timeout: 5000 });
      phase = "mobile-goal-budget-visible"; await expect(budgetControl).toBeVisible({ timeout: 5000 });
      const conditionControl = builder.getByRole("combobox", { name: /^Condición del armado/ });
      phase = "mobile-goal-condition-counts";
      counts.page_condition = await page.getByRole("combobox", { name: /^Condición del armado/ }).count(); counts.builder_condition = await conditionControl.count();
      expect(counts.page_condition).toBe(1); await expect(conditionControl).toHaveCount(1, { timeout: 5000 });
      phase = "mobile-goal-condition-visible"; await expect(conditionControl).toBeVisible({ timeout: 5000 });
      phase = "mobile-goal-label-geometry";
      const objective = await objectiveControl.boundingBox(), budget = await budgetControl.locator("xpath=ancestor::label[1]").boundingBox(), condition = await conditionControl.locator("xpath=ancestor::label[1]").boundingBox();
      expect(Boolean(objective && budget && condition)).toBe(true);
      if (!objective || !budget || !condition) throw new Error("goal_strip_geometry_unavailable");
      phase = "mobile-goal-strip-single-column";
      // En 390 px los pasos 1 y 2 se apilan: objetivo, presupuesto y condición en ese orden, sin solaparse.
      expect(budget.y >= objective.y + objective.height - 1).toBe(true); expect(condition.y >= budget.y + budget.height - 1).toBe(true);
    }
    await shot("02-armado-vacio.png", builder.getByRole("heading", { level: 1 }));
    phase = "selection-api-fetch"; const catalog = await api(page, "/api/catalog/components?category=cpu&page=1&page_size=12&sort=retail_first"); observed.catalog_status = catalog.status;
    phase = "selection-api-status"; expect(catalog.status).toBe(200);
    phase = "selection-api-parse"; const data = parseCatalogTowerPage(catalog.data); observed.catalog_items = data.items.length;
    phase = "selection-priced-source-prerequisite";
    const chosen = data.items.flatMap(part => catalogBoundOffers(part).filter(offer => offer.condition === "cash" && offer.amount !== null && retailSourceURL(offer.source_url) !== null).map(offer => ({ part, offer }))).find(({ part, offer }) => purchaseBudget(purchaseSubtotal([{ part, offer, quantity: 1 }], "cash"), "0.01").known_excess_ars !== null);
    expect(Boolean(chosen)).toBe(true); if (!chosen) throw new Error("Prerequisite unavailable"); const { part, offer } = chosen;
    phase = "selection-fill-budget"; await page.getByLabel("Presupuesto ARS del armado", { exact: true }).fill("0.01", { timeout: 5000 });
    phase = "selection-open-category"; const choose = page.getByText("Elegir Procesador del catálogo", { exact: true }); await choose.click({ timeout: 5000 }); const selector = page.getByRole("region", { name: "Selector de Procesador", exact: true }); observed.selector_count = await selector.count(); await expect(selector).toHaveCount(1, { timeout: 5000 });
    phase = "selection-fill-search"; observed.search_chars = part.name.slice(0, 80).length; await selector.getByLabel("Buscar Procesador en el catálogo", { exact: true }).fill(part.name.slice(0, 80), { timeout: 5000 });
    phase = "selection-search-click"; await selector.getByRole("button", { name: "Buscar", exact: true }).click({ timeout: 5000 });
    phase = "selection-click-real-part"; const partButton = selector.getByRole("button", { name: part.name, exact: true }); await expect(partButton).toHaveCount(1, { timeout: 5000 }); observed.matching_part_buttons = await partButton.count(); await partButton.click({ timeout: 5000 });
    phase = "selection-fill-quantity"; const quantity = page.getByLabel("Cantidad explícita de Procesador", { exact: true }); await expect(quantity).toHaveCount(1, { timeout: 5000 }); observed.quantity_inputs = await quantity.count(); await quantity.fill("1", { timeout: 5000 });
    phase = "selection-select-offer"; const quote = page.getByRole("combobox", { name: "Cotización para subtotal de Procesador", exact: true }); await expect(quote).toHaveCount(1, { timeout: 5000 }); observed.offer_selects = await quote.count(); await quote.selectOption(offer.offer_id, { timeout: 5000 });
    phase = "selection-add-purchase"; await page.getByRole("button", { name: "Agregar compra de Procesador", exact: true }).click({ timeout: 5000 }); await expect(page.locator(".purchase-part")).toHaveCount(1, { timeout: 5000 }); observed.added_lines = await page.locator(".purchase-part").count();
    phase = "selection-collapse-category"; await choose.click({ timeout: 5000 });
    phase = "selection-price-honesty"; const costs = page.getByRole("region", { name: "Coste de compras seleccionadas", exact: true }); await expect(costs).toContainText("Subtotal de compras seleccionadas"); await expect(costs).toContainText("8 categorías no elegidas"); await expect(costs).toContainText("Excedente conocido sobre presupuesto"); observed.over_budget_visible = await costs.getByText(/Excedente conocido sobre presupuesto/).isVisible(); expect(observed.over_budget_visible).toBe(true);
    const purchaseSource = page.locator(".purchase-part").getByRole("link", { name: "Fuente de esta compra (otra pestaña)", exact: true }); await expect(purchaseSource).toBeVisible(); observed.source_visible_after_collapse = await purchaseSource.isVisible(); expect((await purchaseSource.getAttribute("href")) === retailSourceURL(offer.source_url)).toBe(true);
    expect(pcPosts).toBe(0); await shot("03-compras-elegidas.png", page.getByRole("region", { name: "Compras seleccionadas", exact: true }));
    phase = "explicit-pc-save"; const save = page.getByRole("form", { name: "Guardar armado propuesto", exact: true }); await expect(save.getByRole("button")).toBeDisabled(); await save.getByRole("checkbox").check();
    const creating = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/towers"); void creating.catch(() => undefined); await save.getByRole("button", { name: "Guardar configuración propuesta", exact: true }).click(); const response = await creating; expect(response.status()).toBe(201); own = await response.json() as Tower; expect(towerUUID.test(own.id)).toBe(true); expect(own.name.startsWith("Armado propuesto (por comprar)")).toBe(true); expect(own.lines.length).toBe(1); expect(own.category_status.psu).toBe("absent"); expect(pcPosts).toBe(1);
    phase = "real-engine"; const evaluating = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/towers/${own!.id}/evaluate`); void evaluating.catch(() => undefined); await page.getByRole("button", { name: "Comprobar mi PC", exact: true }).click(); const evaluated = await evaluating; expect(evaluated.status()).toBe(200); expect((await evaluated.json() as { verdict: string }).verdict !== "compatible").toBe(true); await shot("04-motor-y-faltantes.png", page.getByRole("region", { name: "Resultado de torre del servidor", exact: true }));
    phase = "real-plan-editor"; await page.getByRole("button", { name: "Planificar compras seleccionadas", exact: true }).click(); const editor = page.getByRole("form", { name: "Editor de plan de torre", exact: true }); await expect(editor).toBeVisible(); expect(planPosts).toBe(0); await shot("05-plan-antes-de-guardar.png", page.getByRole("heading", { name: "Organizar mi plan por etapas", exact: true })); await editor.getByLabel("Revisé etapas, cantidades y contexto; confirmo guardar sin modificar mi PC", { exact: true }).check();
    const posting = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/tower-plans"); void posting.catch(() => undefined); await editor.getByRole("button", { name: "Confirmar y guardar mi plan", exact: true }).click(); const posted = await posting; expect(posted.status()).toBe(201); plan = await posted.json() as TowerPlanRead; expect(planPosts).toBe(1); expect(plan.snapshot.status !== "ready").toBe(true); expect(plan.snapshot.stages[0].actions.length).toBe(1);
    phase = "frozen-read"; await page.getByRole("link", { name: "Abrir plan guardado e historial", exact: true }).click(); const read = page.getByRole("region", { name: "Detalle de plan de torre", exact: true }); await expect(read).toBeVisible(); expect(isDeepStrictEqual(((await api(page, `/api/tower-plans/${plan.id}`)).data as TowerPlanRead).snapshot, plan.snapshot)).toBe(true); expect(isDeepStrictEqual((await api(page, `/api/towers/${own.id}`)).data, own)).toBe(true); expect(pcPosts).toBe(1); await shot("06-plan-guardado.png", read.getByRole("heading", { name: plan.name, exact: true }));
    phase = "saved-plan-comparison-actions";
    await planAnchorEvidence(page.getByRole("region", { name: "Detalle de plan de torre", exact: true }), plan, shot);
    phase = "responsive-check"; expect(captures.every(item => !item.horizontal_overflow)).toBe(true); phase = "complete";
  } catch (error) {
    const data = error as { name?: unknown; matcherResult?: { name?: unknown } } | null, candidate = data?.matcherResult?.name;
    const matcher = typeof candidate === "string" && ["toBe", "toBeVisible", "toBeDisabled", "toContainText", "toHaveText", "toHaveCount"].includes(candidate) ? candidate : "none";
    failure = JSON.stringify({ phase, error_enum: data?.name === "TimeoutError" ? "timeout" : "v0_integrated", matcher, pc_posts: pcPosts, plan_posts: planPosts, observed });
  }
  finally {
    try { if (plan) cleanupFailed = ![204, 404].includes((await api(page, `/api/tower-plans/${plan.id}`, "DELETE", { expected_plan_revision: plan.revision })).status); } catch { cleanupFailed = true; }
    try { if (own) cleanupFailed = ![204, 404].includes((await api(page, `/api/towers/${own.id}`, "DELETE")).status) || cleanupFailed; } catch { cleanupFailed = true; }
    try { await writeFile(path.join(directory, "index.json"), JSON.stringify({ viewport, phase, state: failure ? "incomplete" : "complete", captures, pc_posts: pcPosts, plan_posts: planPosts, observed, cleanup: cleanupFailed ? "failed" : "completed" }, null, 2), { flag: "wx" }); } finally { await context.close(); }
  }
  if (failure || cleanupFailed) throw new Error(`${failure ?? "phase=cleanup; error_enum=v0_cleanup"}; cleanup=${cleanupFailed ? "failed" : "completed"}`);
});
