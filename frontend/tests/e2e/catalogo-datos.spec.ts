import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { parseCatalogTowerComponent, parseCatalogTowerPage, catalogBoundOffers } from "../../lib/catalog-tower-consumer";
import { cardPrice } from "../../lib/catalog-offers";
import { displayImage, displayRetailDate, formatRetailARS, offerDisplayStatus, retailSourceURL } from "../../lib/retail-presentation";
test.use({ trace: "off", video: "off", screenshot: "off" });

function envelope(value: unknown) {
  const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  return Object.freeze({ object: item !== null, items_array: Array.isArray(item?.items), dataset_version_string: typeof item?.dataset_version === "string", page_number: typeof item?.page === "number", page_size_number: typeof item?.page_size === "number", total_number: typeof item?.total === "number" });
}
// Diagnostic paths are constructed ONLY from this closed contract, never IDs,
// field names discovered in a payload, source values or exception messages.
function contractPath(value: unknown): string | null {
  const record = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const root = record(value); if (!root) return "$";
  if (typeof root.dataset_version !== "string") return "$.dataset_version";
  for (const key of ["total", "page", "page_size"] as const) if (typeof root[key] !== "number" || !Number.isSafeInteger(root[key]) || (root[key] as number) < (key === "total" ? 0 : 1)) return `$.${key}`;
  if (!Array.isArray(root.items)) return "$.items";
  const nullableString = (value: unknown) => value === null || typeof value === "string";
  for (const [index, value] of root.items.entries()) {
    const item = record(value), prefix = `$.items[${index}]`; if (!item) return prefix;
    for (const key of ["id", "name", "category"] as const) if (typeof item[key] !== "string") return `${prefix}.${key}`;
    const attributes = record(item.attributes); if (!attributes || Object.values(attributes).some(value => !nullableString(value))) return `${prefix}.attributes`;
    if (item.image !== undefined && !nullableString(item.image)) return `${prefix}.image`;
    if (!Array.isArray(item.sources)) return `${prefix}.sources`;
    if (item.sources.some(value => { const source = record(value); return !source || typeof source.id !== "string" || typeof source.url !== "string"; })) return `${prefix}.sources[].id_or_url`;
    if (!Array.isArray(item.prices)) return `${prefix}.prices`;
    if (item.prices.some(value => { const price = record(value); return !price || ["amount", "currency", "date", "source"].some(key => typeof price[key] !== "string"); })) return `${prefix}.prices[].amount_currency_date_source`;
    if (item.image_evidence !== undefined && item.image_evidence !== null) {
      const image = record(item.image_evidence); if (!image) return `${prefix}.image_evidence`;
      for (const key of ["url", "alt", "source_url", "retrieved_at", "rights_note"] as const) if (!nullableString(image[key])) return `${prefix}.image_evidence.${key}`;
      if (typeof image.exact_variant !== "boolean") return `${prefix}.image_evidence.exact_variant`;
      if (image.photo_bytes_verified !== undefined && typeof image.photo_bytes_verified !== "boolean") return `${prefix}.image_evidence.photo_bytes_verified`;
    }
    if (item.offers !== undefined && !Array.isArray(item.offers)) return `${prefix}.offers`;
    if (Array.isArray(item.offers)) for (const [offerIndex, value] of item.offers.entries()) {
      const offer = record(value), path = `${prefix}.offers[${offerIndex}]`; if (!offer) return path;
      for (const key of ["offer_id", "store", "product_id", "component_id", "variant_key", "currency", "condition", "availability", "source_url", "observed_at", "expires_at", "status"] as const) if (typeof offer[key] !== "string") return `${path}.${key}`;
      if (!nullableString(offer.amount)) return `${path}.amount`;
      if (offer.stock_quantity !== null && (typeof offer.stock_quantity !== "number" || !Number.isSafeInteger(offer.stock_quantity) || offer.stock_quantity < 0)) return `${path}.stock_quantity`;
    }
  }
  return null; // No type mismatch found; enums/semantics remain parser authority.
}

test("@catalog-data38 API real9categorías/ofertas/foto y ficha sin sustitutos históricos", async ({ newImageEvidenceContext }) => {
  const context = await newImageEvidenceContext(), page = await context.newPage(); let phase = "catalog-before-goto";
  let apiAttempted = false, raw: unknown;
  const observed: { navigation_status: number | null; same_application_origin: boolean; catalog_heading: boolean; h1_count: number; dom: "unknown" | "catalog_loaded" | "catalog_failure" | "not_found" | "other"; category_comboboxes: number; category_options: number; api_status: number | null; api_json: boolean; envelope: ReturnType<typeof envelope> | null; contract_path: string | null; api_raw_items_count: number; item_count: number; image_candidates: number; offer_candidates: number; combined_candidates: number } = { navigation_status: null, same_application_origin: false, catalog_heading: false, h1_count: 0, dom: "unknown", category_comboboxes: 0, category_options: 0, api_status: null, api_json: false, envelope: null, contract_path: null, api_raw_items_count: 0, item_count: 0, image_candidates: 0, offer_candidates: 0, combined_candidates: 0 };
  async function domProbe() {
    observed.catalog_heading = await page.getByRole("heading", { level: 1, name: "Todos los componentes", exact: true }).count() === 1;
    observed.h1_count = await page.getByRole("heading", { level: 1 }).count();
    const failure = await page.getByRole("heading", { name: "No se pudo cargar el catálogo", exact: true }).count() > 0;
    const notFound = await page.getByRole("heading", { name: "This page could not be found.", exact: true }).count() > 0;
    observed.dom = failure ? "catalog_failure" : observed.catalog_heading ? "catalog_loaded" : notFound ? "not_found" : "other";
    const category = page.getByRole("navigation", { name: "Tipo de componente", exact: true }); observed.category_comboboxes = await category.count(); observed.category_options = await category.locator('a').count() - 1;
  }
  async function apiProbe() {
    apiAttempted = true;
    const response = await page.evaluate(async () => { const response = await fetch("/api/catalog/components?page=1&page_size=12&sort=retail_first", { cache: "no-store" }); const json = response.headers.get("Content-Type")?.includes("application/json") === true; return { status: response.status, json, payload: json ? await response.json() : null }; });
    observed.api_status = response.status; observed.api_json = response.json; raw = response.payload;
    observed.envelope = envelope(raw); observed.contract_path = contractPath(raw);
    const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
    observed.api_raw_items_count = Array.isArray(record?.items) ? record.items.length : 0;
  }
  // Tabla «Dónde la vimos y a cuánto» de la ficha: una fila por oferta ARS de la pieza, con tienda, condición, importe, fecha y enlace.
  // Una oferta vencida o sin importe se muestra marcada como no vigente; una vigente, sin esa marca.
  async function expectOffersTable(part: ReturnType<typeof parseCatalogTowerComponent>) {
    const section = page.locator("section.piece-block").filter({ has: page.getByRole("heading", { name: "Dónde la vimos y a cuánto", exact: true }) });
    await expect(section).toBeVisible();
    const offers = catalogBoundOffers(part), flat = (text: string | null) => (text ?? "").replace(/\s+/g, " ");
    await expect(section.locator("tbody tr")).toHaveCount(offers.length);
    if (!offers.length) await expect(section).toContainText("Sin precio");
    for (const [index, offer] of offers.entries()) {
      const row = section.locator("tbody tr").nth(index), cells = row.locator("td");
      const store = offer.store === "compragamer" ? "Compra Gamer" : "Venex", source = retailSourceURL(offer.source_url);
      expect(flat(await cells.nth(0).textContent())).toContain(store);
      expect(await cells.nth(0).textContent()).toContain(offer.condition === "cash" ? "Contado" : "Lista");
      if (source) await expect(cells.nth(0).getByRole("link", { name: store, exact: true })).toHaveAttribute("href", source);
      else await expect(cells.nth(0).getByRole("link")).toHaveCount(0);
      expect(flat(await cells.nth(1).textContent())).toBe(flat(formatRetailARS(offer.amount)));
      expect(flat(await cells.nth(2).textContent())).toContain(flat(displayRetailDate(offer.observed_at)));
      const vigente = offerDisplayStatus(offer, Date.now()) === "fresh" && formatRetailARS(offer.amount) !== "Importe no disponible";
      if (vigente) await expect(row).not.toContainText("no es precio vigente");
      else await expect(row).toContainText("no es precio vigente");
    }
  }
  try {
    const navigation = await page.goto("/catalog?page=1&page_size=12&sort=retail_first");
    observed.navigation_status = navigation?.status() ?? null;
    observed.same_application_origin = new URL(page.url()).origin === "http://127.0.0.1:3000";
    phase = "catalog-navigation-status"; expect(observed.navigation_status).toBe(200); expect(observed.same_application_origin).toBe(true);
    phase = "catalog-wait-heading"; await expect(page.getByRole("heading", { level: 1, name: "Todos los componentes", exact: true })).toBeVisible({ timeout: 5000 });
    const category = page.getByRole("navigation", { name: "Tipo de componente", exact: true });
    phase = "catalog-wait-combobox"; await expect(category).toBeVisible({ timeout: 5000 });
    phase = "catalog-9filters";
    await expect(category.locator('a')).toHaveCount(10, { timeout: 5000 }); await domProbe();
    expect(observed.category_comboboxes).toBe(1); expect(observed.category_options).toBe(9);
    await expect(page.getByRole("combobox", { name: "Ordenar", exact: true })).toHaveValue("retail_first");
    phase = "catalog-api-fetch"; await apiProbe();
    phase = "catalog-api-status"; expect(observed.api_status).toBe(200); expect(observed.api_json).toBe(true);
    phase = "catalog-api-parse"; const data = parseCatalogTowerPage(raw);
    observed.item_count = data.items.length; expect(observed.item_count > 0).toBe(true);
    phase = "catalog-candidate";
    observed.image_candidates = data.items.filter(part => displayImage(part) !== null).length;
    observed.offer_candidates = data.items.filter(part => catalogBoundOffers(part).some(offer => offer.amount !== null)).length;
    observed.combined_candidates = data.items.filter(part => displayImage(part) !== null && catalogBoundOffers(part).some(offer => offer.amount !== null)).length;
    const candidate = data.items.find(part => displayImage(part) !== null && catalogBoundOffers(part).some(offer => offer.amount !== null));
    expect(Boolean(candidate), "Real-data prerequisite: explicit server retail_first page1 published image and bound retail amount").toBe(true);
    if (!candidate) throw new Error("Missing prerequisite");
    phase = "bound-retail-row";
    const row = page.locator("article[data-component-id]").filter({ has: page.locator(`a[href="/catalog/${candidate.id}"]`) });
    // Tarjeta de la grilla (PartCard): nombre en el enlace a la ficha, precio con tienda y condición, y foto.
    await expect(row.locator("h2")).toHaveText(candidate.name);
    const shown = cardPrice(candidate), rowText = (await row.textContent()) ?? "";
    if (shown.monto) {
      // Sólo una oferta vigente se muestra como precio; si no, la tarjeta dice «Sin precio», nunca un importe vencido.
      // La tarjeta del catálogo muestra el importe exacto de la API (puntos de miles, coma decimal salvo «,00»), día/mes y tienda.
      const [entero, decimales] = shown.monto.split(".");
      expect(rowText.replace(/\s/g, " ")).toContain(entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (decimales === "00" ? "" : `,${decimales}`));
      expect(rowText).toContain(shown.tienda ?? "");
      expect(rowText).toContain(shown.fecha!.slice(0, 10).split("-").reverse().slice(0, 2).join("/"));
      await expect(row.locator("a")).toHaveCount(1);
    } else expect(rowText).toContain("Sin precio");
    await row.scrollIntoViewIfNeeded(); const cardPhoto = row.locator("img");
    await expect(cardPhoto).toHaveCount(1);
    await expect.poll(() => cardPhoto.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    expect((await cardPhoto.getAttribute("src")) === displayImage(candidate)).toBe(true);
    // La tarjeta completa abre la ficha; la evidencia de todas las ofertas sigue allí.
    await row.locator("a").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(candidate.name);
    await expectOffersTable(candidate);
    const hero = page.locator(".piece-hero");
    await hero.scrollIntoViewIfNeeded(); const photo = hero.locator(".tower-product-photo img");
    await expect.poll(() => photo.evaluateAll(images => images.some(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    expect((await photo.first().getAttribute("src")) === displayImage(candidate)).toBe(true);
    phase = "sort-preserves-access-to-all-records";
    const ordinaryReply = await page.evaluate(async () => { const response = await fetch("/api/catalog/components?page=1&page_size=12&sort=id", { cache: "no-store" }); return { status: response.status, data: await response.json() }; });
    expect(ordinaryReply.status).toBe(200); const ordinary = parseCatalogTowerPage(ordinaryReply.data); expect(ordinary.total).toBe(data.total);
    await page.goto("/catalog");
    await page.getByRole("combobox", { name: "Ordenar", exact: true }).selectOption("id");
    await expect(page.getByRole("combobox", { name: "Ordenar", exact: true })).toHaveValue("id");
    await expect(page.locator("article[data-component-id]").first()).toHaveAttribute("data-component-id", ordinary.items[0].id);
    expect(new URL(page.url()).searchParams.get("sort")).toBe("id");
    if (ordinary.total > ordinary.page_size) {
      const next = page.getByRole("link", { name: "Página siguiente", exact: true });
      const href = await next.getAttribute("href"); expect(href !== null && new URL(href, page.url()).searchParams.get("sort") === "id").toBe(true);
    }
    for (const current of ["fan", "storage", "cooler"]) {
      phase = `filter-${current}`; await page.goto(`/catalog?category=${current}&page=1&page_size=12&sort=retail_first`); await expect(page.getByRole("navigation", { name: "Tipo de componente" }).locator('a[aria-current="page"]')).toHaveAttribute("href", new RegExp(`category=${current}`)); await expect(page.locator("article[data-component-id]").first()).toBeVisible(); expect(await page.locator('img[alt*="undefined"]').count()).toBe(0);
    }
    for (const id of data.items.slice(0, 2).map(part => part.id)) {
      phase = "detail-resource-proof";
      const raw = await page.evaluate(async id => { const response = await fetch(`/api/catalog/components/${id}`, { cache: "no-store" }); if (!response.ok) throw new Error("Part unavailable"); return response.json(); }, id);
      expect(Object.hasOwn(raw, "image_evidence") && Object.hasOwn(raw, "offers")).toBe(true);
      const part = parseCatalogTowerComponent(raw); await page.goto(`/catalog/${id}`); await expect(page.getByRole("heading", { level: 1 })).toHaveText(part.name);
      await expectOffersTable(part);
      expect(await page.locator('img[alt*="undefined"]').count()).toBe(0);
    }
    phase = "complete";
  } catch (error) {
    try { await domProbe(); } catch { /* Only closed enums/counts; preserve original failure. */ }
    // One read-only diagnostic probe if the DOM/navigation assertion prevented
    // reaching the API. Never retry an API attempt or modify product responses.
    if (!apiAttempted && observed.same_application_origin) try { await apiProbe(); } catch { /* Preserve original phase, no raw exception. */ }
    const data = error as { name?: unknown; matcherResult?: { name?: unknown } } | null, candidate = data?.matcherResult?.name;
    const matcher = typeof candidate === "string" && ["toBe", "toBeVisible", "toHaveText", "toHaveValue", "toHaveCount"].includes(candidate) ? candidate : null;
    const timeout = data?.name === "TimeoutError";
    throw new Error(JSON.stringify({ phase, matcher, error_enum: timeout ? "timeout" : matcher ? "assertion" : "catalog_resource_integration", observed }));
  }
  finally { await context.close(); }
});
