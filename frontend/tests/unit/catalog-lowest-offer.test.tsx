// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogWorkbench from "../../components/catalog-workbench";
import PiecePrices from "../../components/catalog-piece-prices";
import { cardPrice } from "../../lib/catalog-offers";
import { parseCatalogTowerComponent, parseTowerCatalogQuery, towerQueryString } from "../../lib/catalog-tower-consumer";
import { towerCatalogProxy } from "../../lib/tower-catalog-proxy";
import { mount, type, unmountAll } from "./support/dom";
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Datos sintéticos de prueba: no son ofertas ni productos publicados.
const offer = (id: string, amount: string | null, patch: Record<string, unknown> = {}) => ({ offer_id: id, store: "venex", product_id: "p", component_id: "x", variant_key: "v", amount, currency: "ARS", condition: "cash", availability: "in_stock", stock_quantity: null, source_url: "https://venex.com.ar/p", observed_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86_400_000).toISOString(), status: "fresh", ...patch });
const raw = (extra: Record<string, unknown> = {}) => ({ id: "x", category: "fan", name: "Ventilador x", attributes: {}, sources: [], prices: [], image: null, image_evidence: null, offers: [offer("alta", "2000.00"), offer("baja", "1000.00")], ...extra });
const page = (items: unknown[]) => ({ items: items.map(parseCatalogTowerComponent), total: items.length, page: 1, page_size: 12, dataset_version: "sintetico" });
afterEach(async () => { await unmountAll(); push.mockReset(); vi.unstubAllGlobals(); });

describe("lowest_offer_id: contrato", () => {
  it("acepta un texto no vacío y descarta cualquier otra cosa", () => {
    expect(parseCatalogTowerComponent(raw({ lowest_offer_id: "baja" })).lowest_offer_id).toBe("baja");
    for (const basura of [null, undefined, "", "   ", 7, true, {}, ["baja"]]) expect(parseCatalogTowerComponent(raw({ lowest_offer_id: basura })).lowest_offer_id).toBeNull();
    expect(parseCatalogTowerComponent(raw()).lowest_offer_id).toBeNull();
  });
});

describe("ficha: «El más bajo» lo marca el servidor", () => {
  const html = (lowest: string | null | undefined, offers = [offer("alta", "2000.00"), offer("baja", "1000.00")]) => renderToStaticMarkup(<PiecePrices part={parseCatalogTowerComponent(raw({ offers, lowest_offer_id: lowest }))} />);
  it("marca solo la oferta cuyo id coincide, aunque no sea la de menor importe", () => {
    const out = html("alta");
    expect(out.match(/El más bajo/g)).toHaveLength(1);
    const rows = out.split("<tr").slice(2);
    expect(rows.find(row => row.includes("El más bajo"))).toContain("ARS $ 2.000<");
    expect(rows.find(row => row.includes("ARS $ 1.000<"))).not.toContain("El más bajo");
  });
  it("sin id del servidor o con un id desconocido, ninguna oferta lleva la marca", () => {
    for (const lowest of [null, undefined, "otra"]) expect(html(lowest)).not.toContain("El más bajo");
  });
  it("incluye la nota de la maqueta y las columnas de tienda, precio y fecha", () => {
    const out = html("baja");
    expect(out).toContain("Precios de contado. Los de más de 7 días no cuentan para “el más bajo”. Verificá stock antes de comprar.");
    for (const columna of ["Tienda", "Precio", "Visto el"]) expect(out).toContain(`<th>${columna}</th>`);
  });
});

describe("tarjeta del catálogo", () => {
  it("muestra el precio de la oferta marcada; sin marca, el comportamiento anterior", () => {
    expect(cardPrice(parseCatalogTowerComponent(raw({ lowest_offer_id: "baja" })))).toMatchObject({ monto: "1000.00" });
    expect(cardPrice(parseCatalogTowerComponent(raw({ lowest_offer_id: null })))).toMatchObject({ monto: "2000.00" });
    expect(cardPrice(parseCatalogTowerComponent(raw({ lowest_offer_id: "otra" })))).toMatchObject({ monto: "2000.00" });
    expect(cardPrice(parseCatalogTowerComponent(raw({ offers: [], lowest_offer_id: null })))).toEqual({});
  });
  it("sin precio usable sigue diciendo «Sin precio»", async () => {
    const host = await mount(<CatalogWorkbench data={page([raw({ offers: [offer("sola", null)], lowest_offer_id: null })])} />);
    expect(host.querySelector("article")?.textContent).toContain("Sin precio");
  });
  it("el cliente no reordena: respeta el orden que llegó", async () => {
    const host = await mount(<CatalogWorkbench data={page([raw({ id: "x", name: "Cara", offers: [offer("c", "9000.00", { component_id: "x" })] }), raw({ id: "y", name: "Barata", offers: [offer("b", "10.00", { component_id: "y" })] })])} />);
    expect([...host.querySelectorAll("article h2")].map(node => node.textContent)).toEqual(["Cara", "Barata"]);
  });
});

describe("orden por precio", () => {
  it("ofrece las dos opciones nuevas y elegirlas navega con el orden en la URL", async () => {
    const host = await mount(<CatalogWorkbench data={page([raw()])} query={{ q: "", category: "fan", sort: "retail_first", page: 3, page_size: 12 }} />);
    const select = [...host.querySelectorAll("select")].find(node => node.textContent?.includes("Más baratas primero"))!;
    expect([...select.options].map(option => [option.value, option.textContent])).toEqual([["retail_first", "Con fotos y precios primero"], ["id", "Orden habitual"], ["price_asc", "Más baratas primero"], ["price_desc", "Más caras primero"]]);
    await type(select, "price_desc");
    const url = new URL(push.mock.calls[0][0], "http://x");
    expect(url.pathname).toBe("/catalog"); expect(url.searchParams.get("sort")).toBe("price_desc"); expect(url.searchParams.get("category")).toBe("fan"); expect(url.searchParams.get("page")).toBe("1");
  });
  it("el orden se valida, viaja en la URL y en el pedido al servidor", () => {
    for (const sort of ["price_asc", "price_desc"] as const) {
      const query = parseTowerCatalogQuery({ sort, page: "2" });
      expect(query.sort).toBe(sort); expect(new URLSearchParams(towerQueryString(query)).get("sort")).toBe(sort);
    }
    for (const sort of ["price", "PRICE_ASC", "price_asc,id", ["price_asc", "id"]]) expect(() => parseTowerCatalogQuery({ sort })).toThrow();
  });
  it("el proxy deja pasar los órdenes nuevos y sigue rechazando los desconocidos", async () => {
    const fetcher = vi.fn(async () => Response.json({ items: [], total: 0, page: 1, page_size: 12, dataset_version: "s" })); vi.stubGlobal("fetch", fetcher);
    for (const sort of ["price_asc", "price_desc"]) {
      expect((await towerCatalogProxy(new Request(`http://localhost/api/catalog/components?sort=${sort}`))).status).toBe(200);
      expect(new URL(String((fetcher.mock.calls.at(-1) as unknown[])[0])).searchParams.get("sort")).toBe(sort);
    }
    expect((await towerCatalogProxy(new Request("http://localhost/api/catalog/components?sort=precio"))).status).toBe(422);
  });
});
