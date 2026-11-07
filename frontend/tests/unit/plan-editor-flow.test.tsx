// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyTower, type Tower } from "../../lib/towers";
import type { TowerAction } from "../../lib/tower-compatibility";
import type { TowerPlanDraft } from "../../lib/tower-plans";
import TowerPlanActionEditor from "../../components/tower-plan-action-editor";
import TowerPlanEditor from "../../components/tower-plan-editor";
import { button, byLabel, click, mount, settle, type, unmountAll } from "./support/dom";

afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

const id = "12345678-1234-1234-1234-123456789abc", lineId = "12345678-1234-1234-1234-123456789abd";
const own = (lines: Tower["lines"] = []): Tower => ({ ...emptyTower(), id, name: "Mi PC", revision: 1, origin_schema: 2, lines });
const disk = (): TowerAction => ({ action: "replace_category", category: "storage", line_id: null, candidates: [{ component_id: null, declared_model: "SSD de prueba", quantity: 1 }] });
const seed = (stages: TowerPlanDraft["stages"]): TowerPlanDraft => ({ name: "Plan", pc_id: id, expected_pc_revision: 1, expected_catalog_version: "v1", objective: "general", workload: null, budget_ars: "400000", price_condition: "cash", stages });
const stage = (actions: TowerAction[]): TowerPlanDraft["stages"][number] => ({ name: "Compra", budget_ars: "100000", materials: [], actions });
const typeModel = async (host: HTMLElement, text: string) => { await click(button(host, "No lo encuentro, escribir el modelo")); await type(byLabel(host, "Modelo del componente"), text); };

describe("flujo guiado para sumar un componente", () => {
  it("empieza por la categoría y no muestra nada más hasta elegirla", async () => {
    const host = await mount(<TowerPlanActionEditor pc={own()} disabled={false} onAdd={() => {}} />);
    expect(host.textContent).toContain("¿Qué querés comprar?"); expect(host.querySelector("select")).toBeNull();
    expect(button(host, "Sumar a esta compra")!.disabled).toBe(true);
    await click(button(host, "Placa de video"));
    expect(button(host, "Placa de video")!.getAttribute("aria-pressed")).toBe("true");
    expect(host.textContent).toContain("No lo encuentro, escribir el modelo"); expect(byLabel(host, "Cantidad")).toBeNull();
  });

  it("elige un componente del catálogo, queda colapsado con X y habilita sumar", async () => {
    const part = { id: "gpu-1", category: "gpu" as const, name: "RTX 4060", attributes: {}, sources: [], prices: [], image: null };
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async input => String(input).startsWith("/api/catalog/components?") ? Response.json({ dataset_version: "v1", items: [part], total: 1, page: 1, page_size: 12 }) : Response.json(part)));
    const onAdd = vi.fn(), host = await mount(<TowerPlanActionEditor pc={own()} disabled={false} onAdd={onAdd} />);
    await click(button(host, "Placa de video"));
    await click(button(host, "Buscar")); await settle();
    await click(host.querySelector<HTMLButtonElement>("button.remote-pick"));
    expect(button(host, "Quitar RTX 4060")).not.toBeNull();
    await click(button(host, "Sumar a esta compra"));
    expect(onAdd).toHaveBeenCalledTimes(1); expect(onAdd.mock.calls[0][0]).toMatchObject({ action: "replace_category", category: "gpu", line_id: null, candidates: [{ component_id: "gpu-1", declared_model: null, quantity: 1 }] });
    expect(button(host, "Sumar a esta compra")!.disabled).toBe(true);
  });

  it("la cantidad aparece solo en memoria, almacenamiento y ventiladores, y arranca en 1", async () => {
    const onAdd = vi.fn(), host = await mount(<TowerPlanActionEditor pc={own()} disabled={false} onAdd={onAdd} />);
    for (const name of ["Procesador", "Placa madre", "Placa de video", "Fuente", "Gabinete", "Cooler"]) { await click(button(host, name)); expect(byLabel(host, "Cantidad"), name).toBeNull(); }
    for (const name of ["Memoria", "Almacenamiento", "Ventiladores"]) { await click(button(host, name)); expect(byLabel(host, "Cantidad"), name).toBeNull(); await typeModel(host, "Modelo"); expect((byLabel(host, "Cantidad") as HTMLInputElement).value, name).toBe("1"); }
    await click(button(host, "Memoria")); await typeModel(host, "Kit 8 GB");
    await type(byLabel(host, "Cantidad"), "2"); await click(button(host, "Sumar a esta compra"));
    expect(onAdd.mock.calls[0][0].candidates[0]).toMatchObject({ declared_model: "Kit 8 GB", quantity: 2 });
    await click(button(host, "Procesador")); await typeModel(host, "Ryzen 5 5600"); await click(button(host, "Sumar a esta compra"));
    expect(onAdd.mock.calls[1][0].candidates[0].quantity).toBe(1);
  });

  it("pregunta reemplazar o sumar solo si ya tiene almacenamiento o ventiladores", async () => {
    const withDisk = own([{ line_id: lineId, category: "storage", component_id: null, declared_model: "SSD viejo", quantity: 1 }]);
    const onAdd = vi.fn(), host = await mount(<TowerPlanActionEditor pc={withDisk} disabled={false} onAdd={onAdd} />);
    await click(button(host, "Almacenamiento"));
    expect(host.textContent).toContain("Reemplazar los que tengo"); expect(host.textContent).toContain("Sumar uno más"); expect(host.textContent).not.toMatch(/uno solo/);
    await typeModel(host, "SSD nuevo"); await click(byLabel(host, "Sumar uno más")); await click(button(host, "Sumar a esta compra"));
    expect(onAdd.mock.calls[0][0]).toMatchObject({ action: "add_line", category: "storage", line_id: null });
    await click(button(host, "Memoria")); expect(host.textContent).not.toContain("Reemplazar los que tengo");
    await click(button(host, "Ventiladores")); expect(host.textContent).not.toContain("Reemplazar los que tengo");
  });

  it("sin almacenamiento previo siempre reemplaza la categoría", async () => {
    const onAdd = vi.fn(), host = await mount(<TowerPlanActionEditor pc={own()} disabled={false} onAdd={onAdd} />);
    await click(button(host, "Almacenamiento")); expect(host.textContent).not.toContain("Sumar uno más");
    await typeModel(host, "SSD"); await click(button(host, "Sumar a esta compra"));
    expect(onAdd.mock.calls[0][0].action).toBe("replace_category");
  });

  it("Cancelar avisa a quien lo abrió", async () => {
    const onCancel = vi.fn(), host = await mount(<TowerPlanActionEditor pc={own()} disabled={false} onAdd={() => {}} onCancel={onCancel} />);
    await click(button(host, "Cancelar")); expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("editor de compras", () => {
  it("una compra con componentes ofrece «+ Sumar un componente», y al sumar se cierra el flujo", async () => {
    const host = await mount(<TowerPlanEditor pc={own()} seed={seed([stage([disk()])])} onSaved={() => {}} />);
    expect(host.textContent).toContain("Compra 1"); expect(host.textContent).toContain("SSD de prueba"); expect(host.textContent).not.toContain("¿Qué querés comprar?");
    expect(button(host, /^Comprar antes/)).toBeNull(); expect(button(host, /^Sacar compra/)).toBeNull();
    await click(button(host, "+ Sumar un componente")); expect(host.textContent).toContain("¿Qué querés comprar?");
    await click(button(host, "Fuente")); await typeModel(host, "Fuente 500 W"); await click(button(host, "Sumar a esta compra"));
    expect(host.textContent).toContain("Fuente 500 W"); expect(host.textContent).not.toContain("¿Qué querés comprar?"); expect(button(host, "+ Sumar un componente")).not.toBeNull();
  });

  it("una compra nueva nace vacía con el flujo abierto y sin trabar", async () => {
    const host = await mount(<TowerPlanEditor pc={own()} seed={seed([stage([disk()])])} onSaved={() => {}} />);
    await click(button(host, "Agregar otra compra"));
    expect(host.textContent).toContain("Todavía está vacía"); expect(host.textContent).toContain("¿Qué querés comprar?");
    expect(button(host, "Guardar mi plan")!.disabled).toBe(false);
    expect(button(host, /^Comprar antes/)).not.toBeNull(); expect(button(host, /^Comprar después/)).not.toBeNull();
    expect(host.textContent).not.toContain("Sumá al menos un cambio");
  });

  it("sin ningún componente no deja guardar y da la pista", async () => {
    const host = await mount(<TowerPlanEditor pc={own()} seed={seed([stage([])])} onSaved={() => {}} />);
    expect(host.textContent).toContain("Todavía está vacía"); expect(host.textContent).toContain("Sumá un componente para guardar.");
    expect(button(host, "Guardar mi plan")!.disabled).toBe(true);
    expect(host.textContent).not.toContain("Todavía no se guardó nada"); expect(host.textContent).not.toContain("Borrador de compras");
  });

  it("al guardar descarta las compras vacías", async () => {
    const bodies: string[] = [];
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      if (String(input) === "/api/auth/csrf") return Response.json({ csrf_token: "synthetic" });
      bodies.push(String(init?.body)); return new Response("{}", { status: 503 });
    }));
    const host = await mount(<TowerPlanEditor pc={own()} seed={seed([stage([disk()])])} onSaved={() => {}} />);
    await click(button(host, "Agregar otra compra")); await click(button(host, "Guardar mi plan")); await settle();
    expect(bodies).toHaveLength(1); const sent = JSON.parse(bodies[0]);
    expect(sent.stages).toHaveLength(1); expect(sent.stages[0].actions).toHaveLength(1);
  });

  it("sacar un componente deja la compra vacía y se puede sumar de nuevo", async () => {
    const host = await mount(<TowerPlanEditor pc={own()} seed={seed([stage([disk()])])} onSaved={() => {}} />);
    await click(button(host, /^Sacar SSD de prueba/));
    expect(host.textContent).toContain("Todavía está vacía"); expect(button(host, "+ Sumar un componente")).not.toBeNull();
  });
});
