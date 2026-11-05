// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogWorkbench from "../../components/catalog-workbench";
import { parseCatalogTowerComponent } from "../../lib/catalog-tower-consumer";
import type { TowerCatalogPage } from "../../lib/tower-catalog";
import { button, click, mount, unmountAll } from "./support/dom";

const pageFetch = vi.hoisted(() => vi.fn());
vi.mock("../../lib/catalog-tower-consumer", async importOriginal => ({ ...(await importOriginal<typeof import("../../lib/catalog-tower-consumer")>()), catalogTowerPage: pageFetch }));
import Catalog from "../../app/catalog/page";

// Datos sintéticos de prueba: no son productos publicados.
const piece = (id: string) => parseCatalogTowerComponent({ id, category: "fan", name: `Ventilador ${id}`, attributes: {}, sources: [], prices: [], image: null, image_evidence: null, offers: [] });
const pageOf = (page: number, total: number, ...ids: string[]): TowerCatalogPage => ({ items: ids.map(piece), total, page, page_size: 2, dataset_version: "sintetico" });
const hrefs = (html: string) => Array.from(html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)</g)).map(match => [match[2], match[1].replaceAll("&amp;", "&")] as const);
const link = (html: string, name: string) => hrefs(html).find(([text]) => text === name)?.[1];

afterEach(async () => { await unmountAll(); pageFetch.mockReset(); });

describe("paginación del catálogo (1.2)", () => {
  async function render(search: Record<string, string>) {
    return renderToStaticMarkup(await Catalog({ searchParams: Promise.resolve(search) }));
  }
  beforeEach(() => pageFetch.mockResolvedValue(pageOf(2, 7, "c", "d")));

  it("al pasar de página conserva nombre, categoría, orden y tamaño en los enlaces", async () => {
    const html = await render({ q: "silencioso", category: "fan", sort: "id", page: "2", page_size: "2" });
    for (const name of ["Página anterior", "Página siguiente"]) {
      const params = new URL(link(html, name)!, "http://localhost").searchParams;
      expect(params.get("q")).toBe("silencioso"); expect(params.get("category")).toBe("fan");
      expect(params.get("sort")).toBe("id"); expect(params.get("page_size")).toBe("2");
    }
    expect(new URL(link(html, "Página anterior")!, "http://localhost").searchParams.get("page")).toBe("1");
    expect(new URL(link(html, "Página siguiente")!, "http://localhost").searchParams.get("page")).toBe("3");
  });
  it("pide al servidor la página y filtros de la URL, y muestra el total que devuelve", async () => {
    const html = await render({ q: "silencioso", category: "fan", sort: "id", page: "2", page_size: "2" });
    const sent = new URLSearchParams(String(pageFetch.mock.calls[0][0]).replace(/^\?/, ""));
    expect(Object.fromEntries(sent)).toEqual({ q: "silencioso", category: "fan", sort: "id", page: "2", page_size: "2" });
    expect(html).toContain("7 componentes · Página 2");
  });
  it("en la última página no ofrece «Página siguiente»; en la primera no ofrece «Anterior»", async () => {
    pageFetch.mockResolvedValue(pageOf(4, 7, "g"));
    expect(link(await render({ page: "4", page_size: "2" }), "Página siguiente")).toBeUndefined();
    pageFetch.mockResolvedValue(pageOf(1, 7, "a", "b"));
    const first = await render({ page_size: "2" });
    expect(link(first, "Página anterior")).toBeUndefined();
    expect(link(first, "Página siguiente")).toContain("page=2");
  });
});

describe("inspección «Ver al lado» al cambiar de página (1.4)", () => {
  // No hay pedidos asíncronos: la ficha sale de los datos de la página actual.
  function Navegador({ pages }: { pages: TowerCatalogPage[] }) {
    const [index, setIndex] = useState(0);
    return <><button type="button" onClick={() => setIndex(1)}>Ir a la página 2</button><button type="button" onClick={() => setIndex(0)}>Volver a la página 1</button><CatalogWorkbench data={pages[index]} /></>;
  }
  const ficha = (host: HTMLElement) => host.querySelector("aside h2")?.textContent;

  it("cambiar de página no deja la pieza inspeccionada de la página anterior", async () => {
    const host = await mount(<Navegador pages={[pageOf(1, 4, "a", "b"), pageOf(2, 4, "c", "d")]} />);
    await click(button(host, /Ver al lado: Ventilador b/));
    expect(ficha(host)).toBe("Ventilador b");
    await click(button(host, "Ir a la página 2"));
    expect(ficha(host)).toBe("Ventilador c");
    expect(host.textContent).not.toContain("Ventilador b");
    expect(host.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
  });
  it("al volver a una página anterior la selección vieja tampoco reaparece", async () => {
    const host = await mount(<Navegador pages={[pageOf(1, 4, "a", "b"), pageOf(2, 4, "c", "d")]} />);
    await click(button(host, /Ver al lado: Ventilador b/));
    await click(button(host, "Ir a la página 2"));
    await click(button(host, /Ver al lado: Ventilador d/));
    expect(ficha(host)).toBe("Ventilador d");
    await click(button(host, "Volver a la página 1"));
    expect(ficha(host)).toBe("Ventilador a");
    expect(host.querySelector('[data-component-id="a"]')?.getAttribute("data-selected")).toBe("true");
  });
  it("cambiar de tarjeta muestra siempre la última elegida", async () => {
    const host = await mount(<Navegador pages={[pageOf(1, 4, "a", "b"), pageOf(2, 4, "c", "d")]} />);
    await click(button(host, /Ver al lado: Ventilador b/));
    await click(button(host, /Ver al lado: Ventilador a/));
    await click(button(host, /Ver al lado: Ventilador b/));
    expect(ficha(host)).toBe("Ventilador b");
  });
});
