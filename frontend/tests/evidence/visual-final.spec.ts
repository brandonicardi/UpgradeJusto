import { expect } from "@playwright/test";
import { test } from "../e2e/fixtures";
import { assertBasic, basicApi, demoInput, evaluateBasic, loginBasic, openBasic, recommendRam, recommendGpu, simulateBasic } from "../support/basic-scope";
import { evidenceDirectory, captureBoth, evidenceApi, enterPrivateMessage } from "../support/visual-evidence";
import type { PC } from "../../lib/pcs";
import type { CatalogPage } from "../../lib/catalog";
import type { AdminPage, Revision } from "../../lib/curation";
import type { Message, PageOf } from "../../lib/assistant";

test.use({ trace: "off", screenshot: "off", video: "off" });

test("@visual-core catálogo, PC, evaluaciones, mejoras, planes y publicación reales", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  const context = await newIsolatedContext(), publicContext = await newIsolatedContext();
  const page = await context.newPage(), publicPage = await publicContext.newPage();
  page.setDefaultTimeout(15000); publicPage.setDefaultTimeout(15000);
  const pcs: PC[] = [];
  let planId: string | null = null, phase = "setup", failure: string | null = null;
  try {
    const directory = await evidenceDirectory();
    phase = "account-empty";
    await page.goto("/account");
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeEnabled();
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
    await captureBoth(page, directory, "01-cuenta-vacia");
    await loginBasic(page);
    await page.goto("/pcs");
    await expect(page.getByRole("button", { name: "Crear mi primera PC", exact: true })).toBeVisible();
    await captureBoth(page, directory, "01b-configuracion-vacia");
    for (const [which, name] of [["A", "Mi PC de escritorio"], ["B", "PC para comparar"]] as const) {
      const created = await basicApi(page, "", "POST", { ...demoInput(which), name });
      expect(created.status).toBe(201); pcs.push(created.data as PC);
    }
    phase = "catalog";
    await page.goto("/"); await page.getByRole("main").getByRole("link", { name: "Explorar el catálogo", exact: true }).click(); await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByRole("main").getByRole("status")).toContainText("14 componentes");
    await captureBoth(page, directory, "02-catalogo");
    await page.goto("/catalog/P04"); await expect(page.getByRole("region", { name: "Resumen del componente", exact: true })).toBeVisible();
    await captureBoth(page, directory, "03-ficha-componente");
    phase = "compatible";
    await openBasic(page, pcs[0]); assertBasic(await evaluateBasic(page, pcs[0]), "compatible");
    const evaluation = page.getByRole("region", { name: "Resultado parcial del servidor", exact: true });
    await expect(evaluation).toContainText("Compatible para uso sin overclock");
    await captureBoth(page, directory, "04-pc-compatible", evaluation);
    phase = "editor";
    await page.getByRole("button", { name: "Editar PC", exact: true }).click();
    await captureBoth(page, directory, "05-editor-pc");
    await page.getByRole("button", { name: "Cancelar edición", exact: true }).click();
    phase = "incompatible";
    await openBasic(page, pcs[1]); assertBasic(await simulateBasic(page, pcs[1], "gpu", "P16"), "incompatible");
    await expect(evaluation).toContainText("No cumple");
    await captureBoth(page, directory, "06-incompatible", evaluation);
    phase = "unknown";
    assertBasic(await simulateBasic(page, pcs[1], "motherboard", "P03"), "requiere_verificacion");
    await expect(evaluation).toContainText("Falta información");
    await captureBoth(page, directory, "07-falta-informacion", evaluation);
    phase = "recommendation";
    await openBasic(page, pcs[0]);
    const output = page.getByRole("region", { name: "Preview de recomendaciones del servidor", exact: true });
    const ram = (await recommendRam(page, pcs[0], "1000000")).items[0];
    expect(ram.status).toBe("recommended"); expect(ram.cost.total_ars).toBe("766417.98"); expect(ram.cost.within_budget).toBe(true);
    expect(ram.benefit.status).toBe("supported"); assertBasic(ram.evaluation, "compatible");
    await expect(output.getByText("16 GB → 32 GB", { exact: true })).toBeVisible();
    await captureBoth(page, directory, "08-mejora-memoria", output);
    phase = "budget";
    const low = (await recommendRam(page, pcs[0], "766417.97")).items[0];
    expect(low.status).toBe("rejected"); expect(low.cost.within_budget).toBe(false);
    await expect(output).toContainText("Te faltan");
    await captureBoth(page, directory, "09-presupuesto-insuficiente", output);
    phase = "gpu-psu";
    await openBasic(page, pcs[0]);
    const gpu = (await recommendGpu(page, pcs[0], false)).items[0]; expect(gpu.status).toBe("rejected"); assertBasic(gpu.evaluation, "incompatible");
    const combo = (await recommendGpu(page, pcs[0], true)).items[0];
    expect(combo.status).toBe("recommended"); expect(combo.cost.total_ars).toMatch(/^1882130(?:\.0{1,2})?$/); expect(combo.benefit.status).toBe("supported");
    assertBasic(combo.evaluation, "compatible"); await captureBoth(page, directory, "10-mejora-grafica-fuente", output);
    phase = "plan";
    const plan = await evidenceApi(page, "/api/plans", "POST", { name: "Más memoria, por etapas", pc_id: pcs[0].id, expected_pc_revision: pcs[0].revision, objective: "general", budget_ars: "1000000", stages: [{ name: "Ampliar la capacidad de memoria", replacements: [{ category: "ram", candidates: [{ component_id: "P05", quantity: 2 }] }] }] });
    expect(plan.status).toBe(201); planId = plan.data.id;
    await page.goto("/plans"); await page.getByRole("button", { name: "Más memoria, por etapas", exact: true }).click();
    await expect(page.getByRole("region", { name: "Resultado etapa 1", exact: true })).toContainText("Compatible para uso sin overclock");
    await captureBoth(page, directory, "11-plan-y-publicacion");
    await page.getByRole("button", { name: "Preparar recálculo", exact: true }).click();
    await captureBoth(page, directory, "12-editor-plan");
    await page.getByRole("button", { name: "Cancelar edición de plan", exact: true }).click();
    phase = "share";
    const share = await evidenceApi(page, `/api/plans/${planId}/shares`, "POST", { expected_plan_revision: plan.data.revision, title: "Plan de memoria compartido" });
    expect(share.status).toBe(201);
    const navigation = publicPage.waitForResponse(response => response.request().isNavigationRequest());
    await publicPage.evaluate(path => location.assign(path), `http://127.0.0.1:3000${share.data.path}`);
    expect((await navigation).status()).toBe(200);
    await expect(publicPage.getByRole("heading", { name: "Plan compartido", exact: true })).toBeVisible();
    await expect(publicPage.locator("script,form,img,iframe")).toHaveCount(0);
    await captureBoth(publicPage, directory, "13-plan-compartido");
    expect((await evidenceApi(page, `/api/plans/${planId}/shares/${share.data.id}`, "DELETE")).status).toBe(204);
    for (const pc of pcs) expect((await basicApi(page, `/${pc.id}`)).data).toEqual(pc);
  } catch { failure = `Final visual core failed phase=${phase}`; }
  finally {
    try {
      if (planId && ![204, 404].includes((await evidenceApi(page, `/api/plans/${planId}`, "DELETE")).status)) failure ??= "Final visual core failed phase=cleanup-plan";
      for (const pc of pcs) if (![204, 404].includes((await basicApi(page, `/${pc.id}`, "DELETE")).status)) failure ??= "Final visual core failed phase=cleanup-pc";
    } catch { failure ??= "Final visual core failed phase=cleanup"; }
    finally { await Promise.allSettled([context.close(), publicContext.close()]); }
  }
  if (failure) throw new Error(failure);
});

test("@visual-curation propuesta real editable y administración de sólo lectura", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  if (process.env.UJ_TEST_EXTRACTION_LIVE !== "1" || !process.env.UJ_ADMIN_EMAIL || !process.env.UJ_ADMIN_PASSWORD) throw new Error("Visual curation requires Build's existing explicit LIVE and test admin configuration");
  const context = await newIsolatedContext(), adminContext = await newIsolatedContext();
  const page = await context.newPage(), admin = await adminContext.newPage();
  page.setDefaultTimeout(15000); admin.setDefaultTimeout(15000);
  let phase = "setup", failure: string | null = null, statusCode = 0, errorEnum = "unclassified";
  try {
    const directory = await evidenceDirectory(); await loginBasic(page);
    const before = await basicApi(page, "?page=1&page_size=20"); expect(before.status).toBe(200);
    const catalog = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=50", { signal: AbortSignal.timeout(15000) }); expect(catalog.status).toBe(200);
    const ram = (await catalog.json() as CatalogPage).items.find(item => item.category === "ram"); if (!ram) throw new Error("Published RAM unavailable");
    phase = "capture-import";
    const importNavigation = await page.goto("/pcs/import"); statusCode = importNavigation?.status() ?? 0;
    await captureBoth(page, directory, "14-importar-texto");
    phase = "fill-text"; statusCode = 0;
    // Same explicit numeric quantity format as the approved functional CU02 gate.
    await page.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true }).fill(`Mi PC tiene 2x ${ram.name}. Los otros componentes son desconocidos.`);
    phase = "extract-response";
    const extracting = page.waitForResponse(response => response.url().endsWith("/api/pcs/extract") && response.request().method() === "POST", { timeout: 100000 });
    await page.getByRole("button", { name: "Extraer propuesta", exact: true }).click();
    const extractionResponse = await extracting; statusCode = extractionResponse.status();
    if (statusCode !== 200) {
      const payload: unknown = await extractionResponse.json().catch(() => null);
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const record = payload as Record<string, unknown>;
        const code = typeof record.error_code === "string" ? record.error_code : typeof record.code === "string" ? record.code : typeof record.detail === "string" ? record.detail : null;
        if (code === "RAM quantity requires explicit review") errorEnum = "ram_quantity_requires_explicit_review";
        else if (code === "Invalid extraction evidence") errorEnum = "invalid_extraction_evidence";
      }
    }
    expect(statusCode).toBe(200);
    phase = "proposal-evidence";
    const proposal: unknown = await extractionResponse.json();
    expect(!!proposal && typeof proposal === "object" && "evidence" in proposal && Array.isArray(proposal.evidence) && proposal.evidence.length === 6).toBe(true);
    phase = "proposal-visible";
    await expect(page.getByRole("form", { name: "Propuesta editable", exact: true })).toBeVisible();
    phase = "confirmation-disabled";
    await expect(page.getByRole("button", { name: "Confirmar y guardar", exact: true })).toBeDisabled();
    phase = "capture-proposal";
    await captureBoth(page, directory, "15-propuesta-editable-real");
    phase = "proposal-no-persistence";
    expect((await basicApi(page, "?page=1&page_size=20")).data).toEqual(before.data);
    await page.getByRole("button", { name: "Cancelar propuesta", exact: true }).click();
    phase = "admin-login"; await admin.goto("/account");
    const status = await admin.evaluate(async credentials => {
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
      return (await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token }, body: JSON.stringify(credentials) })).status;
    }, { email: process.env.UJ_ADMIN_EMAIL, password: process.env.UJ_ADMIN_PASSWORD });
    statusCode = status; expect(statusCode).toBe(200); await admin.goto("/admin");
    const revisions = await evidenceApi(admin, "/api/admin/revisions?limit=100&offset=0"); expect(revisions.status).toBe(200);
    const active = (revisions.data as AdminPage<Revision>).items.find(revision => revision.active); if (!active) throw new Error("Active revision unavailable");
    phase = "admin-readonly";
    await admin.locator("button[data-revision-id]").filter({ hasText: "Activa" }).click();
    await admin.getByLabel("Colección", { exact: true }).selectOption("components");
    await expect(admin.getByRole("region", { name: "Detalle de revisión", exact: true })).toContainText("Solo lectura");
    await captureBoth(admin, directory, "16-administracion-publicada");
    expect((await evidenceApi(admin, "/api/admin/revisions?limit=100&offset=0")).data).toEqual(revisions.data);
    await admin.goto("/account"); await admin.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
   } catch { failure = `Final visual curation failed phase=${phase} statusCode=${statusCode} errorEnum=${errorEnum}`; }
  finally { await Promise.allSettled([context.close(), adminContext.close()]); }
  if (failure) throw new Error(failure);
});

test("@visual-live conversación natural sintética, un turno real sin contenido forzado", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  if (process.env.UJ_TEST_ASSISTANT_LIVE !== "1") throw new Error("Natural visual LIVE requires explicit real provider gate; no fallback");
  const context = await newIsolatedContext(), page = await context.newPage(); page.setDefaultTimeout(15000);
  let conversationId: string | null = null, phase = "setup", failure: string | null = null, posts = 0;
  try {
    const directory = await evidenceDirectory(); await loginBasic(page); await page.goto("/chat");
    await page.getByLabel("Título de conversación", { exact: true }).fill("Más memoria para mi PC");
    const creating = page.waitForResponse(response => response.url().endsWith("/api/conversations") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Crear conversación privada", exact: true }).click();
    const created = await creating; expect(created.status()).toBe(201); conversationId = (await created.json()).id;
    phase = "mobile-conversation-management";
    await page.setViewportSize({ width: 390, height: 844 });
    const management = page.getByRole("button", { name: "Conversaciones", exact: true });
    await expect(management).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByLabel("Título de conversación", { exact: true })).toBeHidden();
    await management.focus(); await page.keyboard.press("Enter");
    await expect(management).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Título de conversación", { exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(management).toHaveAttribute("aria-expanded", "false");
    await expect(management).toBeFocused();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.getByLabel("Título de conversación", { exact: true })).toBeVisible();
    page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === `/api/conversations/${conversationId}/messages`) posts++; });
    phase = "natural-turn";
    await enterPrivateMessage(page, "¿Qué debo revisar al pasar de 16 a 32 GB de RAM? Resumilo sin FPS.");
    const sending = page.waitForResponse(response => response.url().endsWith(`/api/conversations/${conversationId}/messages`) && response.request().method() === "POST", { timeout: 30000 });
    await page.getByRole("button", { name: "Enviar turno real", exact: true }).click();
    const sent = await sending; expect(sent.status()).toBe(200); expect(sent.headers()["content-type"]).toContain("text/event-stream");
    await expect.poll(async () => {
      const history = await evidenceApi(page, `/api/conversations/${conversationId}/messages?page=1&page_size=20`);
      const messages = history.data as PageOf<Message>;
      return history.status === 200 && messages.items.length === 2 && messages.items.some(message => message.role === "assistant" && message.status === "completed" && message.content.trim().length > 0);
    }, { timeout: 110000, message: "Natural LIVE must persist a completed real answer; bodies suppressed" }).toBe(true);
    await expect(page.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true })).toBeEnabled({ timeout: 20000 });
    const historyPanel = page.getByRole("region", { name: "Historial persistido", exact: true });
    await expect.poll(async () => (await historyPanel.locator(".message-assistant").count()) === 1, { message: "Persisted answer must render" }).toBe(true);
    expect(posts).toBe(1);
    phase = "natural-chat-capture"; await captureBoth(page, directory, "17-asistente-natural", historyPanel);
    expect(((await basicApi(page, "?page=1&page_size=20")).data as { total: number }).total).toBe(0);
  } catch { failure = `Final visual natural LIVE failed phase=${phase}`; }
  finally {
    try { if (conversationId && ![204, 404].includes((await evidenceApi(page, `/api/conversations/${conversationId}`, "DELETE")).status)) failure ??= "Final visual natural LIVE failed phase=cleanup"; }
    catch { failure ??= "Final visual natural LIVE failed phase=cleanup"; }
    finally { await context.close(); }
  }
  if (failure) throw new Error(failure);
});

test("@visual-polish catálogo ancho completo y navegación de filtros por teclado", async ({ newIsolatedContext }) => {
  test.setTimeout(60000);
  const context = await newIsolatedContext(), page = await context.newPage();
  let phase = "catalog", failure: string | null = null;
  try {
    const directory = await evidenceDirectory(); await page.goto("/catalog");
    await expect(page.getByRole("main").getByRole("status")).toContainText("14 componentes");
    const category = page.getByLabel("Categoría", { exact: true });
    const pageSize = page.getByRole("combobox", { name: /^Por página/ });
    await expect(pageSize).toHaveAttribute("name", "page_size");
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      phase = "focus"; await page.setViewportSize(viewport);
      await category.focus(); await expect(category).toBeFocused();
      phase = "home"; await category.press("Home");
      await expect(category).toBeFocused(); await expect(category).toHaveValue("");
      phase = "tab"; await category.press("Tab"); await expect(pageSize).toBeFocused();
      phase = "reverse"; await pageSize.press("Shift+Tab"); await expect(category).toBeFocused();
      phase = "width";
      if (viewport.width === 390) expect(await category.evaluate(element => {
        const form = element.closest("form")!; const style = getComputedStyle(form);
        return element.getBoundingClientRect().width >= form.getBoundingClientRect().width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight) - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth) - 1;
      }), "Mobile category must span available form width").toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Catalog must not overflow horizontally").toBe(true);
    }
    phase = "capture"; await captureBoth(page, directory, "18-catalogo-pulido");
  } catch {
    const activeName = await page.evaluate(() => {
      const name = document.activeElement?.getAttribute("name");
      return name === "category" || name === "page_size" || name === "q" ? name : "other";
    }).catch(() => "other");
    failure = `Catalog polish failed phase=${phase} activeName=${activeName}`;
  }
  finally { await context.close(); }
  if (failure) throw new Error(failure);
});

test("@visual-data riesgo PSU y publicación con fallo conocido y dato pendiente", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  const context = await newIsolatedContext(), anonymous = await newIsolatedContext();
  const page = await context.newPage(), publicPage = await anonymous.newPage();
  const pcs: PC[] = [], planIds: string[] = [], shares: { plan: string; id: string }[] = [];
  let phase = "setup", failure: string | null = null;
  try {
    const directory = await evidenceDirectory(); await loginBasic(page);
    const a = await basicApi(page, "", "POST", { ...demoInput("A"), name: "Mi PC de escritorio" }); expect(a.status).toBe(201); pcs.push(a.data as PC);
    const b = await basicApi(page, "", "POST", { ...demoInput("B"), name: "PC para comprobar montaje", context: { bios_version: null, notes: null } }); expect(b.status).toBe(201); pcs.push(b.data as PC);
    phase = "psu-conflict"; await openBasic(page, pcs[0]);
    const combo = (await recommendGpu(page, pcs[0], true)).items[0];
    expect(combo.status).toBe("recommended"); expect(combo.cost.total_ars).toMatch(/^1882130(?:\.0{1,2})?$/);
    assertBasic(combo.evaluation, "compatible");
    expect(combo.evaluation.additional_checks?.some(check => check.id === "psu_12v_documentation_conflict" && check.status === "unknown")).toBe(true);
    const output = page.getByRole("region", { name: "Preview de recomendaciones del servidor", exact: true });
    await expect(output.getByText("La documentación de la fuente es contradictoria: revisá las especificaciones y el cableado antes de instalar.", { exact: true })).toBeVisible();
    await captureBoth(page, directory, "19-conflicto-documentacion-fuente", output);
    for (const index of [0, 1]) {
      phase = index === 0 ? "share-compatible" : "share-blockers";
      const replacements = index === 0 ? [{ category: "gpu", candidates: [{ component_id: "P15", quantity: 1 }] }, { category: "psu", candidates: [{ component_id: "P08", quantity: 1 }] }] : [{ category: "gpu", candidates: [{ component_id: "P16", quantity: 1 }] }];
      const plan = await evidenceApi(page, "/api/plans", "POST", { name: index === 0 ? "Gráfica y fuente" : "Montaje por revisar", pc_id: pcs[index].id, expected_pc_revision: pcs[index].revision, objective: "general", budget_ars: "2000000", stages: [{ name: "Comprobar antes de instalar", replacements }] });
      expect(plan.status).toBe(201); planIds.push(plan.data.id);
      if (index === 1) {
        expect(plan.data.stages[0].evaluation.verdict).toBe("incompatible");
        expect(plan.data.stages[0].evaluation.rule_results.some((rule: { state: string }) => rule.state === "unknown")).toBe(true);
      }
      const share = await evidenceApi(page, `/api/plans/${plan.data.id}/shares`, "POST", { expected_plan_revision: plan.data.revision, title: index === 0 ? "Plan de gráfica y fuente" : "Plan con datos por revisar" });
      expect(share.status).toBe(201); shares.push({ plan: plan.data.id, id: share.data.id });
      const navigation = publicPage.waitForResponse(response => response.request().isNavigationRequest());
      await publicPage.evaluate(path => location.assign(path), `http://127.0.0.1:3000${share.data.path}`); expect((await navigation).status()).toBe(200);
      await expect(publicPage.getByRole("heading", { name: "Plan compartido", exact: true })).toBeVisible();
      if (index === 0) await expect(publicPage.getByText("La documentación de la fuente es contradictoria: revisá las especificaciones y el cableado antes de instalar.", { exact: true })).toBeVisible();
      else { await expect(publicPage.getByText("Procesador y placa: Falta información.", { exact: true })).toBeVisible(); await expect(publicPage.getByText("Espacio para la gráfica: No cumple.", { exact: true })).toBeVisible(); }
      await captureBoth(publicPage, directory, index === 0 ? "20-compartido-con-advertencia" : "21-compartido-fallo-y-pendiente");
    }
    for (const pc of pcs) expect((await basicApi(page, `/${pc.id}`)).data).toEqual(pc);
  } catch { failure = `Visual data presentation failed phase=${phase}`; }
  finally {
    try {
      for (const share of shares) if (![204, 404].includes((await evidenceApi(page, `/api/plans/${share.plan}/shares/${share.id}`, "DELETE")).status)) failure ??= "Visual data presentation failed phase=cleanup-share";
      for (const id of planIds) if (![204, 404].includes((await evidenceApi(page, `/api/plans/${id}`, "DELETE")).status)) failure ??= "Visual data presentation failed phase=cleanup-plan";
      for (const pc of pcs) if (![204, 404].includes((await basicApi(page, `/${pc.id}`, "DELETE")).status)) failure ??= "Visual data presentation failed phase=cleanup-pc";
    } catch { failure ??= "Visual data presentation failed phase=cleanup"; }
    finally { await Promise.allSettled([context.close(), anonymous.close()]); }
  }
  if (failure) throw new Error(failure);
});

test("@visual-import propuesta real con advertencias humanas sin confirmar guardado", async ({ newIsolatedContext }) => {
  test.setTimeout(150000);
  if (process.env.UJ_TEST_EXTRACTION_LIVE !== "1") throw new Error("Visual import requires the existing real extraction opt-in");
  const context = await newIsolatedContext(), page = await context.newPage();
  let phase = "setup", statusCode = 0, failure: string | null = null;
  try {
    const directory = await evidenceDirectory(); await loginBasic(page);
    const before = await basicApi(page, "?page=1&page_size=20"); expect(before.status).toBe(200);
    const response = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=50"); expect(response.status).toBe(200);
    const ram = (await response.json() as CatalogPage).items.find(item => item.category === "ram"); if (!ram) throw new Error("Published RAM unavailable");
    await page.goto("/pcs/import");
    await page.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true }).fill(`Mi PC tiene 2x ${ram.name}. Los otros componentes son desconocidos.`);
    phase = "extract-response";
    const extracting = page.waitForResponse(reply => reply.url().endsWith("/api/pcs/extract") && reply.request().method() === "POST", { timeout: 100000 });
    await page.getByRole("button", { name: "Extraer propuesta", exact: true }).click();
    const extracted = await extracting; statusCode = extracted.status(); expect(statusCode).toBe(200);
    const payload = await extracted.json(); expect(payload.evidence).toHaveLength(6);
    phase = "proposal";
    await expect(page.getByRole("form", { name: "Propuesta editable", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar y guardar", exact: true })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Evidencia de extracción", exact: true })).toContainText("Revisá y confirmá los componentes por completar");
    await captureBoth(page, directory, "22-propuesta-advertencias-humanas");
    expect((await basicApi(page, "?page=1&page_size=20")).data).toEqual(before.data);
    await page.getByRole("button", { name: "Cancelar propuesta", exact: true }).click();
  } catch { failure = `Visual import presentation failed phase=${phase} statusCode=${statusCode}`; }
  finally { await context.close(); }
  if (failure) throw new Error(failure);
});
