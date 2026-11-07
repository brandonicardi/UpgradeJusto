// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RemoteProductSelector from "../../components/remote-product-selector";
import PurchaseBuilder from "../../components/purchase-builder";
import type { TowerCategory } from "../../lib/towers";
import { bestOffer, isSingleUnitCategory } from "../../lib/catalog-offers";
import { button, byLabel, click, mount, settle, unmountAll } from "./support/dom";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

const future = new Date(Date.now() + 3_600_000).toISOString();
const offer = (id: string, component_id: string, amount: string) => ({ offer_id: id, store: "venex", product_id: "p", component_id, variant_key: "v", amount, currency: "ARS", condition: "cash", availability: "in_stock", stock_quantity: 3, source_url: "https://www.venex.com.ar/x", observed_at: "2026-11-01T10:00:00Z", expires_at: future, status: "fresh" });
const component = (category: TowerCategory, id: string, name: string, offers: ReturnType<typeof offer>[] = []) => ({ id, category, name, attributes: {}, sources: [], prices: [], image: null, offers, lowest_offer_id: offers[0]?.offer_id ?? null });

function stubCatalog(items: ReturnType<typeof component>[]) {
  const request = vi.fn<typeof fetch>().mockImplementation(async input => {
    const url = String(input), detail = items.find(item => url === `/api/catalog/components/${item.id}`);
    if (detail) return Response.json(detail);
    if (url.startsWith("/api/catalog/components?")) return Response.json({ dataset_version: "v1", items, total: items.length, page: 1, page_size: 12 });
    throw new Error(`Solicitud inesperada: ${url}`);
  });
  vi.stubGlobal("fetch", request);
}

function Harness({ category }: { category: TowerCategory }) {
  const [value, setValue] = useState<string | null>(null);
  return <RemoteProductSelector category={category} value={value} onChange={setValue} onClear={() => setValue(null)} />;
}

describe("selector de componentes: elegir colapsa y quitar vuelve a la búsqueda", () => {
  it("la fila entera elige, la tarjeta muestra precio y X, y quitar devuelve el foco al buscador", async () => {
    stubCatalog([component("cpu", "cpu-1", "Ryzen 5 5600", [offer("o1", "cpu-1", "150000.00")]), component("cpu", "cpu-2", "Core i5 12400")]);
    const host = await mount(<Harness category="cpu" />); await settle();
    expect(host.textContent).toContain("2 resultados");
    expect(host.textContent).not.toContain("no es una comprobación"); expect(host.textContent).not.toContain("cobertura técnica");
    expect(host.textContent).toContain("Sin precio por ahora");
    const rows = host.querySelectorAll("ul.remote-results button.remote-pick"); expect(rows).toHaveLength(2);
    expect(host.querySelectorAll("ul.remote-results li > button")).toHaveLength(2); // sin botón duplicado con el nombre
    await click(rows[0]);
    expect(host.querySelector("input[type=text], input:not([type])")).toBeNull(); expect(host.querySelector("ul.remote-results")).toBeNull();
    expect(host.textContent).toContain("Ryzen 5 5600"); expect(host.textContent).toContain("ARS 150.000,00"); expect(host.textContent).toContain("Venex");
    expect(host.textContent).toContain("Foto, procedencia y ofertas");
    await click(button(host, "Quitar Ryzen 5 5600"));
    const search = byLabel(host, "Buscar Procesador en el catálogo"); expect(search).not.toBeNull(); expect(document.activeElement).toBe(search);
    expect(host.querySelectorAll("ul.remote-results button.remote-pick")).toHaveLength(2);
  });
});

describe("Armar: cantidad y cotización sin pasos extra", () => {
  it("una categoría única no muestra cantidad; memoria sí, desde 1, con «Módulos iguales»", async () => {
    stubCatalog([component("cpu", "cpu-1", "Ryzen 5 5600", [offer("o1", "cpu-1", "150000.00")])]);
    const host = await mount(<PurchaseBuilder />); await settle();
    const cpu = host.querySelector("#purchase-cpu")!;
    await click(cpu.querySelector(".build-picker-toggle")); await click(cpu.querySelector("ul.remote-results button.remote-pick"));
    expect(button(cpu, "Quitar Ryzen 5 5600")).not.toBeNull();
    expect(cpu.textContent).not.toContain("Cantidad"); expect(host.textContent).not.toContain("Cantidad explícita");
    expect(host.textContent).not.toContain("Cotización para subtotal"); expect(host.textContent).not.toContain("Agregar compra de");
    expect(host.textContent).toContain("ARS 150.000,00");
    await click(button(cpu, "Quitar Ryzen 5 5600"));
    expect(cpu.querySelector("ul.remote-results")).not.toBeNull(); expect(cpu.textContent).toContain("Todavía sin elegir");
  });
  it("memoria: control Cantidad con 1 y ayuda «Módulos iguales»", async () => {
    stubCatalog([component("ram", "ram-1", "Kit DDR4 8 GB", [offer("o2", "ram-1", "40000.00")])]);
    const host = await mount(<PurchaseBuilder />); await settle();
    const ram = host.querySelector("#purchase-ram")!;
    await click(ram.querySelector(".build-picker-toggle")); await click(ram.querySelector("ul.remote-results button.remote-pick"));
    const quantity = byLabel(ram, "Cantidad") as HTMLInputElement; expect(quantity.value).toBe("1"); expect(ram.textContent).toContain("Módulos iguales");
  });
  it("las categorías únicas coinciden con el backend y la mejor oferta sigue la marcada por la API", () => {
    for (const category of ["cpu", "motherboard", "gpu", "psu", "case", "cooler"]) expect(isSingleUnitCategory(category)).toBe(true);
    for (const category of ["ram", "storage", "fan"]) expect(isSingleUnitCategory(category)).toBe(false);
    const part = { ...component("cpu", "c", "C", [offer("a", "c", "10.00"), offer("b", "c", "5.00")]), lowest_offer_id: "b" };
    expect(bestOffer(part as never, "cash")?.offer_id).toBe("b");
    expect(bestOffer({ ...part, lowest_offer_id: null, offers: [] } as never, "cash")).toBeNull();
  });
});
