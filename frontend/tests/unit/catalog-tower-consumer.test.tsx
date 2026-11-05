import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { categories, parseQuery } from "../../lib/catalog";
import { catalogBoundOffers, parseCatalogTowerComponent, parseCatalogTowerPage, parseTowerCatalogQuery, towerQueryString } from "../../lib/catalog-tower-consumer";
import { displayRetailDate } from "../../lib/retail-presentation";
import { displayImage } from "../../lib/retail-presentation";
import CatalogRetailOffers from "../../components/catalog-retail-offers";
import { TowerCatalogCard } from "../../app/catalog/presentation";
import CatalogWorkbench from "../../components/catalog-workbench";

// Synthetic DTO fixtures only; not published quotes/products or browser evidence.
function part() {
  return { id: "synthetic-fan", category: "fan", name: "Modelo completo MPN-EXACT (variante A)", attributes: { current: null }, sources: [], prices: [{ amount: "1.99", currency: "USD", date: "2020-01-01", source: "https://example.com/history" }], image: "https://imagenes.compragamer.com/productos/synthetic.jpg", image_evidence: { url: "https://imagenes.compragamer.com/productos/synthetic.jpg", alt: null, source_url: "https://compragamer.com/producto/synthetic", retrieved_at: "2026-10-26T00:00:00Z", rights_note: null, exact_variant: true, status: "verified", photo_bytes_verified: false }, offers: [{ offer_id: "synthetic-cash", store: "compragamer", product_id: "synthetic", component_id: "synthetic-fan", variant_key: "synthetic", amount: "900719925474099300.19", currency: "ARS", condition: "cash", availability: "unknown", stock_quantity: null, source_url: "https://compragamer.com/producto/synthetic", observed_at: "2026-10-25T00:00:00Z", expires_at: "2026-10-26T00:00:00Z", status: "fresh" }] };
}
describe("catalog tower consumer functional integration, not visual approval", () => {
  it("explicitly defaults only the tower UI to retail_first and preserves the closed sort across pages and filters", () => {
    expect(parseTowerCatalogQuery({}).sort).toBe("retail_first");
    expect(parseQuery({})).not.toHaveProperty("sort");
    for (const sort of ["retail_first", "id"] as const) {
      const query = parseTowerCatalogQuery({ sort, category: "fan", q: "  Modelo & A  ", page: "6", page_size: "50" });
      const encoded = new URLSearchParams(towerQueryString(query, 7));
      expect(encoded.get("sort")).toBe(sort); expect(encoded.get("category")).toBe("fan"); expect(encoded.get("q")).toBe("Modelo & A"); expect(encoded.get("page")).toBe("7"); expect(encoded.get("page_size")).toBe("50"); expect(query.page).toBe(6);
    }
    for (const sort of ["", "catalog", "price", "RETAIL_FIRST", ["id"], ["id", "retail_first"]]) expect(() => parseTowerCatalogQuery({ sort })).toThrow();
  });
  it("accepts nine categories without changing legacy six-category query", () => {
    expect(Object.keys(categories)).toHaveLength(6);
    for (const category of ["fan", "storage", "cooler"]) { expect(parseTowerCatalogQuery({ category }).category).toBe(category); expect(() => parseQuery({ category })).toThrow(); }
    for (const search of [{ category: "unknown" }, { page: "10001" }, { page_size: "51" }, { q: "a".repeat(101) }]) expect(() => parseTowerCatalogQuery(search)).toThrow();
  });
  it("parses actual resource shapes rather than casting away offers/image evidence", () => {
    const source = part(), before = JSON.stringify(source), parsed = parseCatalogTowerComponent(source);
    expect(parsed.offers?.[0].amount).toBe("900719925474099300.19"); expect(parsed.image_evidence?.photo_bytes_verified).toBe(false); expect(parsed.attributes.current).toBeNull(); expect(parsed.name).toBe(source.name); expect(JSON.stringify(source)).toBe(before);
    expect(parseCatalogTowerPage({ items: [source], total: 1, page: 1, page_size: 12, dataset_version: "synthetic" }).items[0].category).toBe("fan");
    expect(() => parseCatalogTowerComponent({ ...source, offers: [{ ...source.offers[0], condition: "installments" }] })).toThrow();
  });
  it("renders the same actual variant in the comparable row and contextual detail, without synthesizing a quote", () => {
    const item = parseCatalogTowerComponent(part());
    const html = renderToStaticMarkup(<CatalogWorkbench data={{ items: [item], total: 1, page: 1, page_size: 12, dataset_version: "synthetic" }} />);
    expect(html).toContain('class="v0-catalog-workbench"'); expect(html).toContain('aria-label="Ficha de la pieza seleccionada"');
    expect(html).toContain('data-component-id="synthetic-fan"'); expect(html).toContain('data-selected="true"');
    expect(html).toContain(item.name); expect(html).toContain("ARS 900.719.925.474.099.300,19");
    expect(html).toContain('href="/catalog/synthetic-fan"'); expect(html).not.toContain("389.900");
  });
  it("shows stale exact ARS amount, source/condition/dates, not foreign dataset substitution", () => {
    const parsed = parseCatalogTowerComponent(part()), html = renderToStaticMarkup(<CatalogRetailOffers part={parsed} now={Date.parse("2026-10-27T00:00:00Z")} />);
    expect(html).toContain("ARS 900.719.925.474.099.300,19"); expect(html).toContain("Oferta histórica: plazo vencido"); expect(html).toContain("Contado"); expect(html).toContain(displayRetailDate("2026-10-25T00:00:00Z")); expect(html).toContain(displayRetailDate("2026-10-26T00:00:00Z")); expect(html).toContain("Stock por confirmar"); expect(html).not.toContain("USD"); expect(html).not.toContain("Precio por confirmar");
  });
  it("distinguishes null amount, zero amount, list condition and component binding", () => {
    const source = part(), parsed = parseCatalogTowerComponent({ ...source, offers: [{ ...source.offers[0], amount: null }, { ...source.offers[0], offer_id: "synthetic-list", condition: "list", amount: "0.00" }, { ...source.offers[0], offer_id: "foreign-component", component_id: "another" }] });
    expect(catalogBoundOffers(parsed)).toHaveLength(2);
    const html = renderToStaticMarkup(<CatalogRetailOffers part={parsed} now={0} />); expect(html).toContain("Sin precio"); expect(html).toContain("ARS 0,00"); expect(html).toContain("Lista (no cuotas)");
  });
  it("keeps exact image association/host guards and nine-category labels without undefined illustrations", () => {
    const parsed = parseCatalogTowerComponent(part()); expect(displayImage(parsed)).not.toBeNull();
    expect(displayImage({ ...parsed, image_evidence: { ...parsed.image_evidence!, exact_variant: false } })).toBeNull();
    const html = renderToStaticMarkup(<TowerCatalogCard component={parsed} />); expect(html).toContain(part().name); expect(html).toContain("Ventiladores"); expect(html).not.toContain("Ilustración de categoría"); expect(html).not.toContain("undefined");
  });
});
