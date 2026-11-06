import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TowerPlanActionEditor from "../../components/tower-plan-action-editor";
import TowerPlanEditor from "../../components/tower-plan-editor";
import { boughtOn, doneCount, finishedParts, planMetadataQueries, priceRangeText, spentText, stageKicker } from "../../lib/mi-plan-view";
import { metadataKey, type MetadataSnapshot } from "../../lib/preview-metadata";
import type { StageState, TowerPlanRead } from "../../lib/tower-plans";
import type { Tower } from "../../lib/towers";

const line = (category: string, component_id: string, quantity = 1) => ({ line_id: null, category, component_id, declared_model: null, quantity });
const stage = (position: number, category: string, cumulative: string | null, observed: string[], lines = [line(category, `c${position}`)]) => ({
  position, actions: [{ action: "replace_category", category, line_id: null, candidates: [{ component_id: `c${position}`, declared_model: null, quantity: 2 }] }],
  cumulative_cost: { total_ars: cumulative }, offers: observed.map(observed_at => ({ observed_at })), evaluated_configuration: { lines },
});
const plan = { snapshot: { versions: { catalog: "v1" }, base_configuration: { lines: [line("cpu", "base-cpu")] }, stages: [stage(1, "ram", "92500.00", ["2026-10-20T12:00:00Z"]), stage(2, "gpu", "482400.00", ["2026-10-28T12:00:00Z", "2026-10-26T12:00:00Z"]), stage(3, "storage", null, [])] } } as unknown as TowerPlanRead;
const listo = (id: string, name: string, category: string) => [metadataKey(id, "v1"), { status: "ready" as const, part: { id, name, category } }] as const;

describe("armado de «Mi plan»", () => {
  it("dice entre qué días se vieron los precios, sin inventar fechas", () => {
    expect(priceRangeText(plan)).toBe("Suma de precios vistos entre el 20/10 y el 28/10");
    expect(priceRangeText({ snapshot: { stages: [stage(1, "ram", null, ["2026-10-20T12:00:00Z"])] } } as unknown as TowerPlanRead)).toBe("Precios vistos el 20/10");
    expect(priceRangeText({ snapshot: { stages: [stage(1, "ram", null, [])] } } as unknown as TowerPlanRead)).toBeNull();
  });
  it("lo comprado es lo que acumuló el servidor hasta la última etapa marcada; no se suma nada en pantalla", () => {
    expect(spentText(plan, ["hecha", "actual", "pendiente"])).toBe("$ 92.500");
    expect(spentText(plan, ["hecha", "hecha", "actual"])).toBe("$ 482.400");
    expect(spentText(plan, ["actual", "pendiente", "pendiente"])).toBeNull();
    expect(spentText(plan, ["hecha", "pendiente", "hecha"] as StageState[])).toBeNull();
    expect(spentText(plan, ["hecha", "hecha", "hecha"])).toBeNull();
  });
  it("cuenta etapas compradas y lee el día de cada compra", () => {
    expect(doneCount(["hecha", "hecha", "actual"])).toBe(2);
    expect(boughtOn({ k: "2026-10-20T15:00:00Z" }, "k")).toBe("20/10");
    expect(boughtOn({ k: "no es fecha" }, "k")).toBeNull();
    expect(boughtOn(undefined, "k")).toBeNull();
  });
  it("«Tu PC al terminar» muestra solo lo que el plan toca, con los nombres del catálogo", () => {
    const metadata = { status: "active", entries: new Map([listo("c3", "SSD 1 TB", "storage")]) } as unknown as MetadataSnapshot;
    const partes = finishedParts(plan, metadata);
    expect(partes.map(p => [p.label, p.name])).toEqual([["Memoria", "Por confirmar"], ["Placa de video", "Por confirmar"], ["Almacenamiento", "SSD 1 TB"]]);
  });
  it("pide al catálogo las piezas del plan y de la base, una sola vez", () => {
    expect(planMetadataQueries(plan).map(q => q.id).sort()).toEqual(["base-cpu", "c1", "c2", "c3"]);
  });
  it("rotula la etapa que sigue", () => {
    expect(stageKicker(2, "gpu", "actual")).toBe("Etapa 2 · Placa de video · la que sigue");
    expect(stageKicker(1, "ram", "hecha")).toBe("Etapa 1 · Memoria");
    expect(stageKicker(3, undefined, "pendiente")).toBe("Etapa 3");
  });
  it("los editores nuevos no piden la BIOS de una placa candidata", () => {
    const pc = { id: "11111111-1111-4111-8111-111111111111", name: "La de casa", revision: 1, lines: [], category_status: {} } as unknown as Tower;
    const actions = renderToStaticMarkup(createElement(TowerPlanActionEditor, { pc, disabled: false, onAdd: () => {} }));
    expect(actions).not.toMatch(/\bBIOS\b/i);
    const editor = renderToStaticMarkup(createElement(TowerPlanEditor, { pc, onSaved: () => {}, seed: { name: "Plan", pc_id: pc.id, expected_pc_revision: 1, expected_catalog_version: "v1", objective: "general", workload: null, budget_ars: "400000", price_condition: "cash", stages: [{ name: "Etapa 1", budget_ars: "400000", materials: [], actions: [] }] } }));
    expect(editor).not.toMatch(/\bBIOS\b/i);
    expect(editor).toContain("Borrador de etapas: no guardado");
  });
  it("muestra la BIOS histórica de un plan guardado sin afirmar que se revisó", () => {
    const pc = { id: "11111111-1111-4111-8111-111111111111", name: "La de casa", revision: 1, lines: [], category_status: {} } as unknown as Tower;
    const editor = renderToStaticMarkup(createElement(TowerPlanEditor, { pc, onSaved: () => {}, seed: { name: "Plan", pc_id: pc.id, expected_pc_revision: 1, expected_catalog_version: "v1", objective: "general", workload: null, budget_ars: "400000", price_condition: "cash", stages: [{ name: "Etapa 1", budget_ars: "400000", materials: [], actions: [{ action: "replace_category", category: "motherboard", line_id: null, candidates: [{ component_id: "b1", declared_model: null, quantity: 1 }], candidate_context: { bios_version: "P2.30" } }] }] } }));
    expect(editor).toContain("BIOS declarada: P2.30");
    expect(editor).not.toMatch(/BIOS revisada|BIOS compatible|BIOS verificada/i);
  });
});
