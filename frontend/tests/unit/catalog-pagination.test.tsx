import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const pageFetch = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../lib/catalog-tower-consumer", async importOriginal => ({ ...(await importOriginal<typeof import("../../lib/catalog-tower-consumer")>()), catalogTowerPage: pageFetch }));
import Catalog from "../../app/catalog/page";
afterEach(() => pageFetch.mockReset());
describe("catálogo desde el servidor", () => {
  it("conserva búsqueda, categoría, orden, página y tamaño de página", async () => {
    pageFetch.mockResolvedValue({ items: [], total: 50, page: 2, page_size: 12, dataset_version: "prueba" });
    const html = renderToStaticMarkup(await Catalog({ searchParams: Promise.resolve({ q: "silencioso", category: "fan", sort: "id", page: "2", page_size: "6" }) }));
    const sent = new URLSearchParams(pageFetch.mock.calls[0][0]);
    expect(Object.fromEntries(sent)).toEqual({ q: "silencioso", category: "fan", sort: "id", page: "2", page_size: "6" });
    for (const page of [1, 3]) expect(html).toContain(`page=${page}&amp;page_size=6&amp;sort=id&amp;category=fan&amp;q=silencioso`);
    expect(html).toContain("50 piezas");
    expect(html).toContain("Todas las piezas");
    expect(html).not.toMatch(/Aplicar filtros|Por página|Ver al lado|Datos curados/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
  it("pide al servidor el orden por precio y lo conserva al paginar", async () => {
    pageFetch.mockResolvedValue({ items: [], total: 50, page: 1, page_size: 12, dataset_version: "prueba" });
    const html = renderToStaticMarkup(await Catalog({ searchParams: Promise.resolve({ sort: "price_asc" }) }));
    expect(new URLSearchParams(pageFetch.mock.calls[0][0]).get("sort")).toBe("price_asc");
    expect(html).toContain("page=2&amp;page_size=12&amp;sort=price_asc");
  });
  it("no ofrece siguiente en la última página ni anterior en la primera", async () => {
    pageFetch.mockResolvedValue({ items: [], total: 13, page: 2, page_size: 12, dataset_version: "prueba" });
    const last = renderToStaticMarkup(await Catalog({ searchParams: Promise.resolve({ page: "2" }) }));
    expect(last).not.toContain("Página siguiente"); expect(last).toContain("Página anterior");
    pageFetch.mockResolvedValue({ items: [], total: 13, page: 1, page_size: 12, dataset_version: "prueba" });
    const first = renderToStaticMarkup(await Catalog({ searchParams: Promise.resolve({}) }));
    expect(first).not.toContain("Página anterior"); expect(first).toContain("Página siguiente");
  });
});
