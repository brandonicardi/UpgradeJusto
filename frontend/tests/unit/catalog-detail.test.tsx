import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { parseCatalogTowerComponent } from "../../lib/catalog-tower-consumer";

// Datos sintéticos de prueba: no son ofertas ni productos publicados.
const base = { id: "ficha-1", category: "fan", name: "Ventilador de prueba", attributes: { rpm: null }, sources: [], prices: [], image: null, image_evidence: null,
  offers: [{ offer_id: "o1", store: "venex", product_id: "p", component_id: "ficha-1", variant_key: "v", amount: "1500.00", currency: "ARS", condition: "cash", availability: "unknown", stock_quantity: null, source_url: "https://venex.com.ar/p", observed_at: "2020-01-01T00:00:00Z", expires_at: "2020-01-02T00:00:00Z", status: "stale" }] };

vi.mock("../../lib/catalog-tower-consumer", async importOriginal => ({
  ...(await importOriginal<typeof import("../../lib/catalog-tower-consumer")>()),
  catalogTowerComponent: vi.fn(async () => parseCatalogTowerComponent(base)),
  catalogTowerPage: vi.fn(async () => ({ items: [], total: 0, page: 1, page_size: 1, dataset_version: "sintetico" })),
}));
afterEach(() => vi.restoreAllMocks());

describe("ficha de la pieza", () => {
  it("muestra faltantes, ícono sin foto verificada, oferta vencida sin rótulo de vigente y enlace a /pcs sin pedidos de escritura", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { default: Detail } = await import("../../app/catalog/[id]/page");
    const html = renderToStaticMarkup(await Detail({ params: Promise.resolve({ id: "ficha-1" }) }));
    expect(html).toContain("Ventilador de prueba");
    expect(html).toContain("Sin foto · ilustración");
    expect(html).toContain("Falta un dato");
    expect(html).toContain("puede estar viejo · no es precio vigente");
    expect(html).not.toContain("Dentro del plazo registrado");
    expect(html).not.toContain('class="piece-verdict"');
    expect(html).not.toContain("El más bajo");
    expect(html).toContain("Sin precio");
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method && init.method !== "GET")).toHaveLength(0);
  });
});
