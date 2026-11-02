import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { loginBasic } from "../support/basic-scope";
import { emptyTower, type Tower } from "../../lib/towers";
import type { TowerRecommendationPreview } from "../../lib/tower-recommendations";
import type { Locator, Page, Response as BrowserResponse, Route } from "@playwright/test";
import type { TowerCatalogPage } from "../../lib/tower-catalog";
import { formatRetailARS } from "../../lib/retail-presentation";
test.use({ trace: "off", screenshot: "off", video: "off" });
async function api(page: Page, path: string, method: string, body?: unknown) {
  return page.evaluate(async args => {
    const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const response = await fetch(`/api/towers${args.path}`, { method: args.method, cache: "no-store", headers: { "X-CSRF-Token": csrf.csrf_token, "Content-Type": "application/json" }, body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

function metadataIds(result: TowerRecommendationPreview, count: number): Set<string> {
  return new Set(result.items.slice(0, count).flatMap(item => item.actions.flatMap(action => action.candidates.flatMap(candidate => candidate.component_id ? [candidate.component_id] : []))));
}
function isMetadataVersion(url: URL, origin: string): boolean {
  return url.origin === origin && url.pathname === "/api/catalog/components" && url.searchParams.size === 2 && url.searchParams.getAll("page").length === 1 && url.searchParams.get("page") === "1" && url.searchParams.getAll("page_size").length === 1 && url.searchParams.get("page_size") === "1";
}
function observePreviewMetadata(page: Page, origin: string, pcId: string) {
  let recording = false, previews = 0, writes = 0, guardsFinished = 0, guardFailures = 0;
  const ids = new Map<string, number>(), unexpected: string[] = [], guardStatuses: number[] = [];
  let allowed: Set<string> | null = null;
  page.on("request", request => {
    const url = new URL(request.url()); if (url.origin !== origin) return;
    if (request.method() === "POST" && url.pathname === `/api/towers/${pcId}/recommendations/preview`) previews++;
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method()) && (/^\/api\/(?:towers|pcs)(?:\/[^/]+)?$/.test(url.pathname) || ["/api/towers/extract/confirm", "/api/pcs/extract/confirm"].includes(url.pathname) || url.pathname.startsWith("/api/plans"))) writes++;
    if (!recording || request.method() !== "GET") return;
    const match = /^\/api\/catalog\/components\/([^/]+)$/.exec(url.pathname);
    if (match) {
      const id = decodeURIComponent(match[1]); ids.set(id, (ids.get(id) ?? 0) + 1);
      if (allowed && !allowed.has(id)) unexpected.push(id);
    }
  });
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.origin === origin && url.pathname === `/api/towers/${pcId}/recommendations/preview` && response.request().method() === "POST") recording = true;
    if (recording && isMetadataVersion(url, origin)) {
      guardStatuses.push(response.status());
      void response.finished().then(error => { if (error) guardFailures++; else guardsFinished++; }).catch(() => { guardFailures++; });
    }
  });
  return {
    // The browser may consume JSON before the test process does. Validate those
    // initial observed IDs retrospectively, then update allowance BEFORE reveal.
    // Never delay/modify the real preview response to control that race.
    allow(next: Set<string>) { allowed = next; for (const id of ids.keys()) if (!next.has(id)) unexpected.push(id); },
    ids, unexpected, guardStatuses,
    counts: () => ({ previews, writes, guardsFinished, guardFailures }),
  };
}
async function assertOrderedCards(region: Locator, result: TowerRecommendationPreview, count: number) {
  const cards = region.getByRole("article");
  await expect(cards).toHaveCount(count);
  await expect(region.getByRole("status", { name: "Cantidad de propuestas visibles", exact: true })).toHaveText(`Mostrando ${count} de ${result.items.length} propuestas, en el orden del servidor.`);
  for (let i = 0; i < count; i++) {
    const item = result.items[i], card = cards.nth(i);
    // Keys are React-only, not DOM attributes. Verify the ordinal's public quote,
    // status and benefit against that exact server key, without private React APIs.
    await expect(card, `Ordinal ${i + 1} must retain server key ${item.key}'s data`).toHaveAttribute("aria-label", `Propuesta ${i + 1}`);
    if (item.status === "rejected") await expect(card.getByRole("heading", { level: 4 })).toHaveText("Propuesta descartada por el servidor");
    await expect(card).toContainText(`Estado técnico de propuesta: ${item.status}`);
    const cost = card.getByRole("region", { name: "Coste de la propuesta", exact: true });
    await expect(cost).toContainText(item.cost.total_ars === null ? "Total incompleto / desconocido" : formatRetailARS(item.cost.total_ars));
    await expect(cost).toContainText(`Subtotal conocido: ${formatRetailARS(item.cost.known_subtotal_ars)}`);
    for (const line of item.cost.lines) await expect(card).toContainText(line.offer_id);
    const quotes = card.locator(".tower-offer"); await expect(quotes).toHaveCount(item.offers.length);
    for (let offerIndex = 0; offerIndex < item.offers.length; offerIndex++) {
      const offer = item.offers[offerIndex], quote = quotes.nth(offerIndex);
      await expect(quote).toContainText(formatRetailARS(offer.amount));
      await expect(quote.getByRole("link", { name: "Publicación de la tienda", exact: false, includeHidden: true })).toHaveAttribute("href", new URL(offer.source_url).href);
    }
    if (item.benefit.before !== null) await expect(card).toContainText(item.benefit.before);
    if (item.benefit.after !== null) await expect(card).toContainText(item.benefit.after);
  }
}
async function openRealMetaPreview(page: Page, own: Tower, observer: ReturnType<typeof observePreviewMetadata>) {
  await page.goto("/pcs");
  // Drain the saved-PC names separately so those independent consumers are not
  // counted as proposal metadata requests in this preview's observation window.
  const baseNames = Promise.all(["P01", "P06"].map(id => page.waitForResponse(response => new URL(response.url()).pathname === `/api/catalog/components/${id}` && response.request().method() === "GET")));
  await page.getByRole("button", { name: own.name, exact: true }).click();
  for (const response of await baseNames) { expect(response.status()).toBe(200); await response.finished(); }
  const form = page.getByRole("form", { name: "Objetivo y presupuesto de torre", exact: true });
  await form.getByLabel("Objetivo de mejora", { exact: true }).selectOption("gaming");
  await form.getByLabel("Presupuesto ARS (punto decimal, sin miles)", { exact: true }).fill("0.01");
  // Observe the unmodified real response. Its body may already have reached the
  // browser; observer.allow also checks any requests recorded in that interval.
  const received = page.waitForResponse(response => response.url().endsWith(`/api/towers/${own.id}/recommendations/preview`) && response.request().method() === "POST");
  await form.getByRole("button", { name: "Buscar propuestas para mi torre", exact: true }).click();
  const response = await received; expect(response.status()).toBe(200); const result = await response.json() as TowerRecommendationPreview;
  observer.allow(metadataIds(result, 6));
  expect(result.items.length, "Real fixture prerequisite: enough server proposals for two pages; do not fabricate expired/missing quotes").toBeGreaterThanOrEqual(12);
  expect(result.items.some(item => item.status === "rejected" && item.cost.total_ars !== null && item.cost.within_budget === false && item.cost.lines.length > 0 && item.offers.length > 0), "Real fixture prerequisite: at least one complete quoted budget rejection, not a vacuous partial-only result").toBe(true);
  expect(new Set(result.items.map(item => item.key)).size).toBe(result.items.length);
  return { result, region: page.getByRole("region", { name: "Propuestas de torre del servidor", exact: true }) };
}
async function createMetaPC(page: Page, name: string): Promise<Tower> {
  const draft = emptyTower(); draft.name = name; draft.category_status.cpu = "present"; draft.category_status.gpu = "present";
  draft.lines = [{ line_id: null, category: "cpu", component_id: "P01", declared_model: null, quantity: 1 }, { line_id: null, category: "gpu", component_id: "P06", declared_model: null, quantity: 1 }];
  const created = await api(page, "", "POST", draft); expect(created.status).toBe(201); return created.data as Tower;
}
test("@tower06-meta real:6→12 conserva orden/quotes, dedupe GET-ID y no solicita metadatos ocultos", async ({ page }) => {
  await loginBasic(page); const own = await createMetaPC(page, "Torre propia META real"), origin = new URL(page.url()).origin;
  const observer = observePreviewMetadata(page, origin, own.id);
  try {
    const { result, region } = await openRealMetaPreview(page, own, observer);
    const first = metadataIds(result, 6), next = metadataIds(result, 12);
    await expect.poll(() => observer.counts().guardsFinished).toBe(2);
    await expect(region).not.toContainText("Consultando referencia y versión del catálogo");
    await expect(region).not.toContainText("Catálogo cambió"); await expect(region).not.toContainText("No se pudo verificar la versión del catálogo");
    await assertOrderedCards(region, result, 6);
    expect([...observer.ids.keys()].sort()).toEqual([...first].sort()); expect(observer.unexpected).toEqual([]);
    observer.allow(next); await region.getByRole("button", { name: "Mostrar 6 más", exact: true }).click();
    const additional = [...next].some(id => !first.has(id));
    if (additional) await expect.poll(() => observer.counts().guardsFinished).toBe(4);
    await expect(region).not.toContainText("Consultando referencia y versión del catálogo");
    await assertOrderedCards(region, result, 12);
    expect([...observer.ids.keys()].sort()).toEqual([...next].sort()); expect([...observer.ids.values()].every(count => count === 1)).toBe(true); expect(observer.unexpected).toEqual([]);
    expect(observer.guardStatuses.every(status => status === 200)).toBe(true); expect(observer.counts()).toMatchObject({ previews: 1, writes: 0, guardFailures: 0 });
    expect((await api(page, `/${own.id}`, "GET")).data).toEqual(own);
  } finally { expect((await api(page, `/${own.id}`, "DELETE")).status).toBe(204); }
});
test("@tower06-meta control sintético:metadata version injected después del lote real invalida nombres/fotos sin cambiar quotes", async ({ page }) => {
  test.info().annotations.push({ type: "test-control", description: "test control metadata version injected: only the public page1/page_size1 dataset_version is synthetic; preview/evaluation/benefit/prices remain real. Not a CU10 republish test." });
  await loginBasic(page); const own = await createMetaPC(page, "Torre propia META control"), origin = new URL(page.url()).origin;
  const observer = observePreviewMetadata(page, origin, own.id);
  let inject = false, injected = 0;
  const realGuardPages: TowerCatalogPage[] = [];
  let captureFailed = false;
  const matcher = (url: URL) => isMetadataVersion(url, origin);
  const captureRealGuard = (response: BrowserResponse) => {
    if (inject || response.request().method() !== "GET" || !matcher(new URL(response.url()))) return;
    // Read only the actual browser response. No APIRequestContext/route.fetch:
    // the socket fixture rejects transports it does not explicitly support.
    void response.json().then((data: TowerCatalogPage) => {
      if (response.status() !== 200 || typeof data.dataset_version !== "string" || !Array.isArray(data.items)) { captureFailed = true; return; }
      realGuardPages.push(data);
    }).catch(() => { captureFailed = true; });
  };
  const handler = async (route: Route) => {
    // The initial guard requests keep the browser's dedicated source socket,
    // IP signing and exact origin. Do not replace their network response.
    if (!inject) { await route.continue(); return; }
    const realPage = realGuardPages[1];
    if (!realPage) throw new Error("Test control requires both real initial catalog guard bodies before injection");
    injected++;
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Cache-Control": "no-store" }, body: JSON.stringify({ ...realPage, dataset_version: "synthetic-catalog-change" }) });
  };
  try {
    page.on("response", captureRealGuard);
    await page.route(matcher, handler);
    const { result, region } = await openRealMetaPreview(page, own, observer);
    await expect.poll(() => observer.guardStatuses.length).toBe(2);
    expect(observer.guardStatuses).toEqual([200, 200]);
    await expect.poll(() => observer.counts().guardsFinished).toBe(2);
    await expect.poll(() => realGuardPages.length).toBe(2); expect(captureFailed).toBe(false);
    expect(realGuardPages.map(value => value.dataset_version)).toEqual([result.items[0].versions.catalog, result.items[0].versions.catalog]);
    await expect(region).not.toContainText("Consultando referencia y versión del catálogo");
    await expect(region).not.toContainText("Catálogo cambió"); await assertOrderedCards(region, result, 6);
    const first = metadataIds(result, 6);
    let target = 12;
    // Later cards may consist solely of already-cached SKUs. Find the first real
    // six-card reveal requiring new metadata; never fabricate/reorder candidates.
    while (target < result.items.length && ![...metadataIds(result, target)].some(id => !first.has(id))) target = Math.min(result.items.length, target + 6);
    expect([...metadataIds(result, target)].some(id => !first.has(id)), "Real fixture prerequisite: a later visible card must introduce a new SKU to trigger another guarded batch").toBe(true);
    inject = true;
    for (let count = 12; count <= target + 5; count += 6) {
      const shown = Math.min(count, result.items.length); observer.allow(metadataIds(result, shown));
      await region.getByRole("button", { name: "Mostrar 6 más", exact: true }).click(); await expect(region.getByRole("article")).toHaveCount(shown);
      if (shown === target) break;
    }
    await expect(region).toContainText("Catálogo cambió; volvé a consultar");
    await expect(region.getByRole("img")).toHaveCount(0); await expect(region).not.toContainText("Consultando referencia y versión del catálogo");
    await assertOrderedCards(region, result, target);
    const cards = region.getByRole("article");
    for (let i = 0; i < target; i++) for (const id of metadataIds({ ...result, items: [result.items[i]] }, 1)) await expect(cards.nth(i)).toContainText(`Catálogo cambió; volvé a consultar (${id})`);
    expect(injected).toBe(1); expect([...observer.ids.values()].every(count => count === 1)).toBe(true); expect(observer.unexpected).toEqual([]);
    // Version mismatch is before ID work in this new batch; no new variant names
    // or photos are fetched, and original quotes/statuses remain on their cards.
    expect([...observer.ids.keys()].sort()).toEqual([...first].sort()); expect(observer.counts()).toMatchObject({ previews: 1, writes: 0, guardFailures: 0 });
    expect((await api(page, `/${own.id}`, "GET")).data).toEqual(own);
  } finally {
    page.off("response", captureRealGuard);
    try { await page.unroute(matcher, handler); }
    finally { expect((await api(page, `/${own.id}`, "DELETE")).status).toBe(204); }
  }
});
for (const scenario of [{ objective: "general", budget: "1000000.00" }, { objective: "gaming", budget: "0.01" }] as const) {
  test(`@tower06 ${scenario.objective}: propuesta real parcial, presupuesto${scenario.budget} y cero autoguardado`, async ({ page }) => {
    await loginBasic(page);
    const draft = emptyTower(); draft.name = `Torre propia CU06 ${scenario.objective}`;
    // Original curated references; missing tower evidence remains unknown.
    draft.category_status.cpu = "present"; draft.category_status.gpu = "present";
    draft.lines = [{ line_id: null, category: "cpu", component_id: "P01", declared_model: null, quantity: 1 }, { line_id: null, category: "gpu", component_id: "P06", declared_model: null, quantity: 1 }];
    const created = await api(page, "", "POST", draft); expect(created.status).toBe(201); const own = created.data as Tower;
    let writes = 0, previews = 0;
    page.on("request", request => {
      const path = new URL(request.url()).pathname;
      if (request.method() === "POST" && path.endsWith("/recommendations/preview")) previews++;
      if (["POST", "PUT", "DELETE"].includes(request.method()) && (/^\/api\/towers(?:\/[^/]+)?$/.test(path) || path.startsWith("/api/plans"))) writes++;
    });
    try {
      await page.goto("/pcs"); await page.getByRole("button", { name: draft.name, exact: true }).click();
      const form = page.getByRole("form", { name: "Objetivo y presupuesto de torre", exact: true });
      await form.getByLabel("Objetivo de mejora", { exact: true }).selectOption(scenario.objective);
      await form.getByLabel("Presupuesto ARS (punto decimal, sin miles)", { exact: true }).fill(scenario.budget);
      await expect(form.getByRole("checkbox")).not.toBeChecked(); expect(previews).toBe(0);
      const received = page.waitForResponse(response => response.url().endsWith(`/api/towers/${own.id}/recommendations/preview`) && response.request().method() === "POST");
      await form.getByRole("button", { name: "Buscar propuestas para mi torre", exact: true }).click(); const response = await received; expect(response.status()).toBe(200);
      const result = await response.json() as TowerRecommendationPreview;
      expect(result.mode).toBe("automatic"); expect(result.objective).toBe(scenario.objective); expect(result.items.every(item => item.status !== "recommended")).toBe(true);
      expect(result.items.length + result.missing_fields.length + result.limitations.length).toBeGreaterThan(0);
      if (scenario.objective === "gaming") {
        // Only assert insufficient budget where the service actually supplied a
        // nonzero complete quote. Unknown prices stay unknown, not fabricated.
        for (const item of result.items) if (item.cost.total_ars !== null && item.cost.total_ars !== "0.00") expect(item.cost.within_budget).toBe(false);
      }
      await expect(page.getByRole("region", { name: "Propuestas de torre del servidor", exact: true })).toBeVisible();
      expect((await api(page, `/${own.id}`, "GET")).data).toEqual(own); expect(writes).toBe(0);
      await form.getByLabel("Presupuesto ARS (punto decimal, sin miles)", { exact: true }).fill("2.00");
      await expect(page.getByRole("region", { name: "Propuestas de torre del servidor", exact: true })).toHaveCount(0); expect(previews).toBe(1);
    } finally { expect((await api(page, `/${own.id}`, "DELETE")).status).toBe(204); }
  });
}
