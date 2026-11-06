import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { test } from "../e2e/fixtures";
import type { CatalogPage } from "../../lib/catalog";
import type { AdminPage, Extraction, Revision, Row } from "../../lib/curation";
import type { PC } from "../../lib/pcs";
import { safeExceptionCategory } from "../support/safe-exception";
test.use({ trace: "off", screenshot: "off", video: "off" });

test("cancelación UI con respuesta controlada — no acredita LLM", async ({ newIsolatedContext }) => {
  test.setTimeout(45000);
  const context = await newIsolatedContext();
  const page = await context.newPage();
  let stage = "login", extractionPosts = 0, confirmationPosts = 0;
  try {
    expect(await login(page)).toEqual([200, 201, 200, 200, 200, 200]);
    stage = "dataset";
    const catalogReply = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=1", { signal: AbortSignal.timeout(10000) });
    expect(catalogReply.status).toBe(200);
    const catalog: CatalogPage = await catalogReply.json();
    expect(typeof catalog.dataset_version === "string" && catalog.dataset_version.length > 0).toBe(true);
    stage = "before";
    const before = await api(page, "/api/pcs?page=1&page_size=20");
    expect(before.status).toBe(200);
    // Explicit test fixture: only extraction is controlled; auth and PCs use real PG.
    const fixture: Extraction = {
      proposal: { name: "PC extraída", components: [], context: { bios_version: null, notes: null } },
      evidence: (["cpu", "motherboard", "ram", "gpu", "psu", "case"] as const).map(field => ({ field, origin: "unknown", excerpt: null, candidate_ids: [] })),
      warnings: ["Respuesta controlada de prueba UI; no acredita extracción LLM."],
      dataset_version: catalog.dataset_version,
    };
    page.on("request", request => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/pcs/extract/confirm") confirmationPosts++;
    });
    await page.route("**/api/pcs/extract", async route => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      extractionPosts++;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
    });
    stage = "extract";
    await page.goto("/pcs/import", { timeout: 10000 });
    await page.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true }).fill("Prueba sintética UI: componentes desconocidos.", { timeout: 5000 });
    await page.getByRole("button", { name: "Extraer propuesta", exact: true }).click({ timeout: 5000 });
    await expect(page.getByRole("region", { name: "Evidencia de extracción", exact: true })).toBeVisible({ timeout: 5000 });
    expect(extractionPosts).toBe(1);
    stage = "cancel";
    await page.getByRole("button", { name: /Cancelar/i }).click({ timeout: 5000 });
    await expect(page.getByRole("region", { name: "Evidencia de extracción", exact: true })).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByRole("button", { name: "Extraer propuesta", exact: true })).toBeEnabled({ timeout: 5000 });
    await expect(page.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true })).toBeVisible({ timeout: 5000 });
    stage = "after";
    const after = await api(page, "/api/pcs?page=1&page_size=20");
    expect(after.status).toBe(200);
    expect(JSON.stringify(after.data) === JSON.stringify(before.data)).toBe(true);
    expect(confirmationPosts).toBe(0);
  } catch {
    // Never surface Playwright call logs, input, response bodies or private IDs.
    throw new Error(`cancelación UI failed stage=${stage} extractionPosts=${extractionPosts} confirmationPosts=${confirmationPosts}`);
  } finally { await context.close(); }
});

async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
      headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(args.path, { method: args.method, headers, cache: "no-store", body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}
async function login(page: Page, admin = false) {
  await page.goto("/account");
  // Never password fill() or input-bearing call logs; return statuses only.
  const statuses = await page.evaluate(async args => {
    const statuses: number[] = [];
    try {
      // Match authRequest: obtain CSRF for EACH mutation, then refresh after login.
      for (const action of args.register ? ["register", "login"] : ["login"]) {
        const csrf = await fetch("/api/auth/csrf", { cache: "no-store" }); statuses.push(csrf.status);
        if (csrf.status !== 200) return statuses;
        const token = (await csrf.json()).csrf_token;
        if (typeof token !== "string") return statuses;
        const r = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(args.credentials) }); statuses.push(r.status);
        if (r.status !== (action === "register" ? 201 : 200)) return statuses;
      }
      const refreshed = await fetch("/api/auth/csrf", { cache: "no-store" }); statuses.push(refreshed.status);
      if (refreshed.status !== 200) return statuses;
      statuses.push((await fetch("/api/auth/session", { cache: "no-store" })).status);
    } catch { /* Return only numeric progress, never original errors or credentials. */ }
    return statuses;
  }, { register: !admin, credentials: admin ? { email: process.env.UJ_ADMIN_EMAIL!, password: process.env.UJ_ADMIN_PASSWORD! } : { email: `cu33-${randomUUID()}@example.test`, password: randomUUID() } });
  return statuses;
}

test("CU10 PG real + una extracción Groq CU02, confirmación y aislamiento", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  const ca = await newIsolatedContext(), cb = await newIsolatedContext(), cad = await newIsolatedContext();
  const a = await ca.newPage(), b = await cb.newPage(), admin = await cad.newPage();
  let ownPC: string | null = null;
  let restore: { collection: string; row: Row }[] = [];
  let published: string | null = null;
  let failed = false;
  // Values assigned to stage are static labels ONLY. Never copy URLs/IDs/input/errors.
  let stage = "setup";
  let expectedStatuses: number[] = [], actualStatuses: number[] = [];
  let category: ReturnType<typeof safeExceptionCategory> = "unknown";
  let normalNavigationStatus = 0, pageErrorCount = 0;
  const normalGatewayStatuses: number[] = [];
  let alertCount = -1, mainAlertCount = -1, alertContainsExpected = false, alertProbeSucceeded = false;
  let editorCount = -1, rowButtonCount = -1, saveButtonCount = -1;
  let detailBusy = false, collectionMatches = false, rowSelected = false, editorMatches = false, saveEnabled = false;
  async function probeEditor() {
    try {
      const detail = admin.getByRole("region", { name: "Detalle de revisión", exact: true });
      editorCount = await detail.getByRole("textbox", { name: "Datos JSON de la fila", exact: true }).count();
      saveButtonCount = await detail.getByRole("button", { name: "Guardar fila en borrador", exact: true }).count();
      detailBusy = (await detail.getAttribute("aria-busy", { timeout: 5000 })) === "true";
      if (saveButtonCount === 1) saveEnabled = await detail.getByRole("button", { name: "Guardar fila en borrador", exact: true }).isEnabled({ timeout: 5000 });
    } catch { /* Counts and booleans only; never DOM, input or error text. */ }
  }
  // Do not inspect or retain pageerror text: count events only.
  a.on("pageerror", () => { pageErrorCount++; });
  a.on("response", response => {
    if (stage === "normalAdminPage" && new URL(response.url()).pathname === "/api/admin/revisions") normalGatewayStatuses.push(response.status());
  });
  async function probeAlerts() {
    try {
      const probe = await a.evaluate(() => {
        const all = document.querySelectorAll('[role="alert"]');
        const main = document.querySelectorAll('main [role="alert"]');
        return { count: all.length, mainCount: main.length, containsExpected: Array.from(main).some(element => (element.textContent ?? "").includes("Acceso denegado")) };
      });
      alertCount = probe.count; mainAlertCount = probe.mainCount; alertContainsExpected = probe.containsExpected; alertProbeSucceeded = true;
    } catch { /* Diagnostic failure must not expose the page or original exception. */ }
  }
  const mark = (label: string) => { stage = label; expectedStatuses = []; actualStatuses = []; };
  const check = (expected: number[], actual: number[]) => {
    expectedStatuses = expected; actualStatuses = actual.filter(Number.isInteger);
    expect(actualStatuses).toEqual(expectedStatuses);
  };
  const diagnostic = () => `CU02/CU10 failed stage=${stage} category=${category} expected=[${expectedStatuses.join(",")}] actual=[${actualStatuses.join(",")}] normalNavigationStatus=${normalNavigationStatus} normalGatewayStatuses=[${normalGatewayStatuses.join(",")}] pageErrorCount=${pageErrorCount} alertCount=${alertCount} mainAlertCount=${mainAlertCount} alertContainsExpected=${alertContainsExpected} alertProbeSucceeded=${alertProbeSucceeded} editorCount=${editorCount} rowButtonCount=${rowButtonCount} saveButtonCount=${saveButtonCount} detailBusy=${detailBusy} collectionMatches=${collectionMatches} rowSelected=${rowSelected} editorMatches=${editorMatches} saveEnabled=${saveEnabled}`;
  try {
    mark("loginA"); check([200, 201, 200, 200, 200, 200], await login(a));
    mark("loginB"); check([200, 201, 200, 200, 200, 200], await login(b));
    mark("loginAdmin"); check([200, 200, 200, 200], await login(admin, true));
    mark("normal403"); check([403], [(await api(a, "/api/admin/revisions")).status]);
    mark("normalAdminPage");
    const normalNavigation = await a.goto("/admin"); normalNavigationStatus = normalNavigation?.status() ?? 0;
    await probeAlerts();
    // Same scope as auth.spec.ts: framework announcements outside main are not app errors.
    await expect(a.getByRole("main").getByRole("alert")).toContainText("Acceso denegado");
    await probeAlerts();
    mark("revisions");
    const revisions = await api(admin, "/api/admin/revisions?limit=100&offset=0"); check([200], [revisions.status]);
    mark("activeRevision");
    const old = (revisions.data as AdminPage<Revision>).items.find(r => r.active);
    if (!old) throw new Error("No active real dataset available");
    mark("oldPrices"); const oldPrices = await api(admin, `/api/admin/revisions/${old.id}/prices?limit=25&offset=0`); check([200], [oldPrices.status]);
    mark("oldSources"); const oldSources = await api(admin, `/api/admin/revisions/${old.id}/sources?limit=25&offset=0`); check([200], [oldSources.status]);
    mark("requiredRows");
    const price = (oldPrices.data as AdminPage<Row>).items[0], source = (oldSources.data as AdminPage<Row>).items[0];
    if (!price || !source) throw new Error("Real price/source required");
    restore = [{ collection: "prices", row: price }, { collection: "sources", row: source }];
    mark("adminpage"); await admin.goto("/admin");
    mark("draft");
    const draftResponse = admin.waitForResponse(r => r.url().endsWith("/api/admin/revisions") && r.request().method() === "POST");
    await admin.getByRole("button", { name: "Crear borrador desde activa", exact: true }).click();
    const draftReply = await draftResponse; check([201], [draftReply.status()]);
    const id: string = (await draftReply.json()).id;
    await expect(admin.getByRole("region", { name: "Detalle de revisión" })).toBeVisible();
    if (!id) throw new Error("Draft not available");
    for (const item of restore) {
      const phase = item.collection === "prices" ? "saveprice" : "savesource";
      editorCount = rowButtonCount = saveButtonCount = -1;
      detailBusy = collectionMatches = rowSelected = editorMatches = saveEnabled = false;
      mark(`${phase}Select`);
      const detail = admin.getByRole("region", { name: "Detalle de revisión", exact: true });
      const select = detail.getByRole("combobox", { name: "Colección", exact: true });
      await expect(select).toHaveCount(1, { timeout: 5000 });
      await expect(detail).toHaveAttribute("aria-busy", "false", { timeout: 10000 });
      await select.selectOption(item.collection, { timeout: 5000 });
      // loadRows commits collection, rows and cleared editor together, before busy=false.
      await expect(select).toHaveValue(item.collection, { timeout: 10000 });
      await expect(detail).toHaveAttribute("aria-busy", "false", { timeout: 10000 });
      collectionMatches = await select.inputValue({ timeout: 5000 }) === item.collection;
      mark(`${phase}Row`);
      const rowButton = detail.locator(`[data-row-id="${item.row.id}"]`);
      rowButtonCount = await rowButton.count();
      await rowButton.click({ timeout: 5000 });
      const editor = detail.getByRole("textbox", { name: "Datos JSON de la fila", exact: true });
      await expect(editor).toHaveCount(1, { timeout: 5000 });
      await expect(editor).toHaveAttribute("data-row-selected", "true", { timeout: 5000 });
      rowSelected = await editor.getAttribute("data-row-selected", { timeout: 5000 }) === "true";
      await expect.poll(async () => {
        try { return JSON.stringify(JSON.parse(await editor.inputValue({ timeout: 5000 }))) === JSON.stringify(item.row.data); }
        catch { return false; }
      }, { timeout: 5000 }).toBe(true);
      const data = { ...item.row.data, ...(item.collection === "prices" ? { source: `${String(item.row.data.source)} · revisión de prueba CU10` } : { locator: `${String(item.row.data.locator)} · revisión de prueba CU10` }) };
      mark(`${phase}Fill`);
      await editor.fill(JSON.stringify(data), { timeout: 5000 });
      editorMatches = await editor.inputValue({ timeout: 5000 }) === JSON.stringify(data);
      expect(editorMatches).toBe(true);
      mark(`${phase}Send`);
      await probeEditor();
      const [reply] = await Promise.all([
        admin.waitForResponse(r => r.url().endsWith(`/${id}/${item.collection}/${item.row.id}`) && r.request().method() === "PATCH", { timeout: 10000 }),
        (async () => {
          await detail.getByRole("button", { name: "Guardar fila en borrador", exact: true }).click({ timeout: 5000 });
          mark(`${phase}Response`);
        })(),
      ]);
      check([200], [reply.status()]);
      await expect(detail).toHaveAttribute("aria-busy", "false", { timeout: 10000 });
      await expect(admin.getByRole("main").getByRole("status")).toContainText("Fila guardada", { timeout: 5000 });
    }
    mark("publish"); await admin.getByLabel("Confirmo publicar este borrador; después no se puede editar", { exact: true }).check();
    const publishResponse = admin.waitForResponse(r => r.url().endsWith(`/${id}/publish`) && r.request().method() === "POST");
    await admin.getByRole("button", { name: "Publicar borrador", exact: true }).click();
    const publishReply = await publishResponse; check([200], [publishReply.status()]); published = (await publishReply.json()).dataset_version;
    await expect(admin.getByRole("status")).toContainText("Publicación confirmada");
    await expect(admin.getByRole("button", { name: "Guardar fila en borrador", exact: true })).toHaveCount(0);
    mark("immutableOldPrices"); expect((await api(admin, `/api/admin/revisions/${old.id}/prices?limit=25&offset=0`)).data).toEqual(oldPrices.data);
    mark("immutableOldSources"); expect((await api(admin, `/api/admin/revisions/${old.id}/sources?limit=25&offset=0`)).data).toEqual(oldSources.data);
    mark("published409"); check([409], [(await api(admin, `/api/admin/revisions/${published}/prices/${price.id}`, "PATCH", { data: { amount: "1.00" } })).status]);
    mark("catalog");
    const catalogReply = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=50");
    check([200], [catalogReply.status]); const catalog: CatalogPage = await catalogReply.json();
    expect(catalog.dataset_version).toBe(published);
    const ram = catalog.items.find(c => c.category === "ram"); if (!ram) throw new Error("Real RAM required");
    mark("abandonBeforePreview");
    let extractionPosts = 0, confirmationPosts = 0;
    a.on("request", request => {
      if (request.method() !== "POST") return;
      const path = new URL(request.url()).pathname;
      if (path === "/api/pcs/extract") extractionPosts++;
      if (path === "/api/pcs/extract/confirm") confirmationPosts++;
    });
    await a.goto("/pcs/import");
    await a.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true }).fill("Texto pendiente: todavía no solicité extracción.");
    await a.getByRole("link", { name: "Revisar Mis PCs", exact: true }).click();
    const beforePreview = await api(a, "/api/pcs?page=1&page_size=20"); check([200], [beforePreview.status]);
    expect(beforePreview.data.total).toBe(0); expect(extractionPosts).toBe(0); expect(confirmationPosts).toBe(0);
    mark("importpage"); await a.goto("/pcs/import");
    await a.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true }).fill(`Mi PC tiene 2x ${ram.name}. Los otros componentes son desconocidos.`);
    mark("preview"); const previewResponse = a.waitForResponse(r => r.url().endsWith("/api/pcs/extract") && r.request().method() === "POST");
    await a.getByRole("button", { name: "Extraer propuesta", exact: true }).click();
    const previewReply = await previewResponse; check([200], [previewReply.status()]);
    mark("previewEvidence");
    const preview: Extraction = await previewReply.json(); expect(preview.evidence.length).toBe(6);
    mark("previewNoPC"); expect((await api(a, "/api/pcs?page=1&page_size=20")).data.total).toBe(0);
    mark("editProposal");
    await expect(a.getByRole("region", { name: "Evidencia de extracción" })).toBeVisible();
    await expect(a.getByRole("button", { name: "Confirmar y guardar", exact: true })).toBeDisabled();
    const name = `PC CU33 ${randomUUID()}`;
    await a.getByLabel("Nombre de PC", { exact: true }).fill(name);
    await a.getByLabel("Memoria RAM", { exact: true }).selectOption(ram.id);
    await a.getByLabel("Cantidad de módulos RAM idénticos", { exact: true }).fill("3");
    await a.getByLabel("BIOS declarada", { exact: true }).fill("Declaración manual de prueba");
    await a.getByLabel("Confirmo explícitamente guardar esta propuesta corregida", { exact: true }).check();
    mark("confirm"); const savedResponse = a.waitForResponse(r => r.url().endsWith("/api/pcs/extract/confirm") && r.request().method() === "POST");
    await a.getByRole("button", { name: "Confirmar y guardar", exact: true }).click();
    const savedReply = await savedResponse; check([201], [savedReply.status()]);
    const saved: PC = await savedReply.json(); ownPC = saved.id;
    expect(extractionPosts).toBe(1); expect(confirmationPosts).toBe(1);
    expect(saved.components.find(c => c.category === "ram")?.quantity).toBe(3);
    mark("reloadPC"); await a.goto("/pcs"); await a.reload(); await a.getByRole("button", { name, exact: true }).click();
    await expect(a.getByRole("region", { name: "Detalle de PC" })).toContainText(name);
    await expect(a.getByRole("region", { name: "Detalle de PC" }).getByRole("heading", { name: "Tu PC actual", exact: true })).toBeVisible();
    for (const method of ["GET", "PUT", "DELETE"]) {
      mark(method === "GET" ? "isolationGET" : method === "PUT" ? "isolationPUT" : "isolationDELETE");
      check([404], [(await api(b, `/api/pcs/${ownPC}`, method, method === "PUT" ? { ...preview.proposal, revision: 1 } : undefined)).status]);
    }
    mark("isolationList"); expect((await api(b, "/api/pcs?page=1&page_size=20")).data.total).toBe(0);
  } catch (error) { failed = true; category = safeExceptionCategory(error); await probeAlerts(); await probeEditor(); throw new Error(diagnostic()); }
  finally {
    // Restore via NEW revision, never overwrite an immutable published dataset.
    try {
      if (ownPC) { mark("cleanupPC"); check([204], [(await api(a, `/api/pcs/${ownPC}`, "DELETE")).status]); }
      if (published) {
        mark("cleanupDraft"); const draft = await api(admin, "/api/admin/revisions", "POST", { base_version: published }); check([201], [draft.status]);
        for (const item of restore) {
          mark(item.collection === "prices" ? "cleanupPrice" : "cleanupSource");
          check([200], [(await api(admin, `/api/admin/revisions/${draft.data.id}/${item.collection}/${item.row.id}`, "PATCH", { data: item.row.data })).status]);
        }
        mark("cleanupPublish"); check([200], [(await api(admin, `/api/admin/revisions/${draft.data.id}/publish`, "POST", { expected_active_version: published })).status]);
      }
    } catch (error) { if (!failed) { category = safeExceptionCategory(error); await probeAlerts(); throw new Error(diagnostic()); } }
    finally { await Promise.allSettled([ca.close(), cb.close(), cad.close()]); }
  }
});

test("@session-navigation permisos reales y logout/login en la misma ruta", async ({ newIsolatedContext }) => {
  test.setTimeout(60000);
  const ca = await newIsolatedContext(), cb = await newIsolatedContext();
  const normal = await ca.newPage(), admin = await cb.newPage();
  let phase = "setup";
  try {
    expect(await login(normal)).toEqual([200, 201, 200, 200, 200, 200]);
    await normal.goto("/catalog");
    expect((await api(normal, "/api/admin/revisions")).status).toBe(403);
    await expect(normal.getByRole("navigation", { name: "Principal", exact: true }).getByRole("link", { name: "Administrar catálogo", exact: true })).toHaveCount(0);
    phase = "known-admin";
    expect(await login(admin, true)).toEqual([200, 200, 200, 200]);
    await admin.goto("/account");
    expect((await api(admin, "/api/admin/revisions")).status).toBe(200);
    const link = admin.getByRole("navigation", { name: "Principal", exact: true }).getByRole("link", { name: "Administrar catálogo", exact: true });
    await expect(link).toBeVisible();
    phase = "logout-same-route";
    const loggedOut = admin.waitForResponse(response => response.url().endsWith("/api/auth/logout") && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    expect((await loggedOut).status()).toBe(204);
    await expect(admin).toHaveURL(/\/account$/);
    await expect(link).toHaveCount(0);
    expect((await api(admin, "/api/admin/revisions")).status).toBe(401);
    phase = "login-same-route";
    await admin.evaluate(credentials => {
      const email = document.querySelector<HTMLInputElement>('input[name="email"]');
      const password = document.querySelector<HTMLInputElement>('input[name="password"]');
      if (!email || !password) throw new Error("Account fields unavailable");
      email.value = credentials.email; password.value = credentials.password;
    }, { email: process.env.UJ_ADMIN_EMAIL!, password: process.env.UJ_ADMIN_PASSWORD! });
    const loggedIn = admin.waitForResponse(response => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Entrar", exact: true }).click();
    expect((await loggedIn).status()).toBe(200);
    await expect(admin).toHaveURL(/\/account$/);
    await expect(link).toBeVisible();
    await admin.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await expect(link).toHaveCount(0);
  } catch { throw new Error(`Session navigation failed phase=${phase}`); }
  finally { await Promise.allSettled([ca.close(), cb.close()]); }
});
