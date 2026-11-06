// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import CatalogWorkbench from "../../components/catalog-workbench";
import { cardPrice } from "../../lib/catalog-offers";
import { parseCatalogTowerComponent } from "../../lib/catalog-tower-consumer";
import { mount, unmountAll } from "./support/dom";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Datos sintéticos de prueba: no son ofertas ni productos publicados.
function part(id: string, amount: string | null = "1500.00", verified = false) {
  const url = `https://imagenes.compragamer.com/productos/${id}.jpg`;
  return { id, category: "fan", name: `Ventilador ${id}`, attributes: {}, sources: [], prices: [], image: verified ? url : null,
    image_evidence: verified ? { url, alt: null, source_url: "https://compragamer.com/p", retrieved_at: "2026-10-26T00:00:00Z", rights_note: null, exact_variant: true, status: "verified", photo_bytes_verified: true } : null,
    offers: [{ offer_id: `${id}-o`, store: "venex", product_id: id, component_id: id, variant_key: id, amount, currency: "ARS", condition: "cash", availability: "unknown", stock_quantity: null, source_url: "https://venex.com.ar/p", observed_at: "2026-10-25T00:00:00Z", expires_at: "2026-10-26T00:00:00Z", status: "fresh" }] };
}
const page = (...ids: string[]) => ({ items: ids.map(id => parseCatalogTowerComponent(part(id))), total: ids.length, page: 1, page_size: 12, dataset_version: "sintetico" });
beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-25T12:00:00Z")); });
afterAll(() => { vi.useRealTimers(); });
afterEach(unmountAll);

describe("precio de la tarjeta: vigencia y enlace", () => {
  const withOffer = (patch: Record<string, unknown>) => {
    const raw = part("a");
    raw.offers = [{ ...raw.offers[0], ...patch }];
    return parseCatalogTowerComponent(raw);
  };
  it("una oferta vencida no se muestra como precio: «Sin precio»", async () => {
    const vencida = withOffer({});
    expect(cardPrice(vencida, Date.parse("2026-10-27T00:00:00Z"))).toEqual({});
    expect(cardPrice(withOffer({ status: "stale" }))).toEqual({});
    const host = await mount(<CatalogWorkbench data={{ items: [withOffer({ status: "stale" })], total: 1, page: 1, page_size: 12, dataset_version: "sintetico" }} />);
    expect(host.querySelector("article")?.textContent).toContain("Sin precio");
  });
  it("una URL no válida no genera enlace", () => {
    expect(cardPrice(withOffer({ source_url: "javascript:alert(1)" })).enlace).toBeUndefined();
    expect(cardPrice(withOffer({ source_url: "https://sitio-raro.example/p" })).enlace).toBeUndefined();
    expect(cardPrice(withOffer({}))).toMatchObject({ enlace: "https://venex.com.ar/p" });
  });
});

describe("grilla del catálogo", () => {
  it("muestra una tarjeta por pieza, sin veredicto y con ícono si no hay foto verificada", async () => {
    const host = await mount(<CatalogWorkbench data={page("a", "b")} />);
    expect(host.querySelectorAll("article[data-component-id]")).toHaveLength(2);
    expect(host.querySelector("article")?.textContent).not.toMatch(/Encaja|No encaja|Falta un dato/);
    expect(host.querySelector("article img")).toBeNull();
    expect(host.querySelector("article svg")).not.toBeNull();
    expect(host.textContent).toContain("25/10 · Venex");
  });
  it("sin importe usable la tarjeta dice «Sin precio», nunca cero", () => {
    expect(cardPrice(parseCatalogTowerComponent(part("a", null)))).toEqual({});
    expect(cardPrice(parseCatalogTowerComponent(part("a", "900719925474099300.19")))).toEqual({});
    expect(cardPrice(parseCatalogTowerComponent(part("a")))).toMatchObject({ monto: "1500.00", tienda: "Venex" });
  });
  it("cada tarjeta completa abre la ficha, sin panel lateral ni enlaces anidados", async () => {
    const first = page("a", "b");
    const host = await mount(<CatalogWorkbench data={first} />);
    expect(host.querySelector("aside")).toBeNull();
    expect(host.textContent).not.toContain("Ver al lado");
    expect(host.querySelectorAll("article > a")).toHaveLength(2);
    expect(host.querySelector("article a a")).toBeNull();
    expect(host.querySelector('[data-component-id="b"] > a')?.getAttribute("href")).toBe("/catalog/b");
  });
});
