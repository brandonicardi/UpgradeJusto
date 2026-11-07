// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PurchaseBuilder from "../../components/purchase-builder";
import { firstBuildReason, proposalBudget } from "../../lib/first-build";
import { button, click, mount, settle, unmountAll } from "./support/dom";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); window.history.replaceState(null, "", "/"); });

const future = "2099-01-01T00:00:00Z";
const offer = (id: string, component_id: string, amount: string) => ({ offer_id: id, store: "venex", product_id: "p", component_id, variant_key: "v", amount, currency: "ARS", condition: "cash", availability: "in_stock", stock_quantity: 3, source_url: "https://www.venex.com.ar/x", observed_at: "2026-11-01T10:00:00Z", expires_at: future, status: "fresh" });
const part = (id: string, name: string) => ({ id, category: "cpu", name, attributes: {}, sources: [], prices: [], image: null, lowest_offer_id: `o-${id}`, offers: [offer(`o-${id}`, id, "100000.00")] });
const byObjective: Record<string, string> = { gaming: "cpu-juegos", productivity: "cpu-trabajo", general: "cpu-general" };

function stubProposals() {
  const asked: string[] = [];
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async input => {
    const url = new URL(String(input), "http://x");
    if (url.pathname.endsWith("/first-build")) {
      const objective = url.searchParams.get("objective") ?? ""; asked.push(objective);
      const id = byObjective[objective];
      return Response.json({ status: "proposed", lines: [{ category: "cpu", component_id: id, offer_id: `o-${id}`, quantity: 1 }], total_ars: "100000.00", verdict: "compatible", notices: [] });
    }
    const id = url.pathname.split("/").pop() ?? "";
    if (Object.values(byObjective).includes(id)) return Response.json(part(id, `Procesador ${id}`));
    return Response.json({ dataset_version: "v1", items: [], total: 0, page: 1, page_size: 12 });
  }));
  return asked;
}
const wait = async (ms: number) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); await settle(); };

describe("Armar: la propuesta sigue al objetivo", () => {
  it("cambiar el objetivo arma otra PC", async () => {
    window.history.replaceState(null, "", "/build?objetivo=work&presupuesto=2200000");
    const asked = stubProposals();
    const host = await mount(<PurchaseBuilder />); await wait(60);
    expect(asked).toEqual(["productivity"]); expect(host.textContent).toContain("Procesador cpu-trabajo");
    await click(button(host, "Juegos")); await wait(700);
    expect(asked).toEqual(["productivity", "gaming"]);
    expect(host.textContent).toContain("Procesador cpu-juegos"); expect(host.textContent).not.toContain("Procesador cpu-trabajo");
  });

  it("si la persona tocó componentes no se pisan: ofrece volver a armar", async () => {
    window.history.replaceState(null, "", "/build?objetivo=work&presupuesto=2200000");
    const asked = stubProposals();
    const host = await mount(<PurchaseBuilder />); await wait(60);
    await click(button(host, "Quitar Procesador cpu-trabajo"));
    await click(button(host, "Juegos")); await wait(700);
    expect(asked).toEqual(["productivity"]);
    await click(button(host, "Armar una PC con estos datos")); await wait(300);
    expect(asked).toEqual(["productivity", "gaming"]); expect(host.textContent).toContain("Procesador cpu-juegos");
  });
});

describe("Armar: datos de la propuesta", () => {
  it("solo pide propuesta con un monto válido", () => {
    expect(proposalBudget(" 2200000 ")).toBe("2200000"); expect(proposalBudget("1234.56")).toBe("1234.56");
    for (const text of ["", "0", "abc", "1,5"]) expect(proposalBudget(text)).toBeNull();
  });
  it("explica la prioridad según el objetivo", () => {
    expect(firstBuildReason("gaming")).toContain("prioridad en la placa de video");
    expect(firstBuildReason("productivity")).toContain("prioridad en el procesador");
  });
});
