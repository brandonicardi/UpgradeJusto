import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TowerPlanActionEditor from "../../components/tower-plan-action-editor";
import TowerPlanEditor from "../../components/tower-plan-editor";
import { boughtOn, comparePlans, doneCount, finishedParts, gainText, monthsText, monthsToFinish, parseMonthly, pcChanges, planMetadataQueries, plainPlanNote, plainPlanNotes, plainWords, priceChangeText, priceRangeText, stageKicker, stageTitle } from "../../lib/mi-plan-view";
import { metadataKey, type MetadataSnapshot } from "../../lib/preview-metadata";
import type { TowerPlanRead } from "../../lib/tower-plans";
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
    expect(priceRangeText(plan)).toBe("Con los precios del 20/10 al 28/10");
    expect(priceRangeText({ snapshot: { stages: [stage(1, "ram", null, ["2026-10-20T12:00:00Z"])] } } as unknown as TowerPlanRead)).toBe("Con los precios del 20/10");
    expect(priceRangeText({ snapshot: { stages: [stage(1, "ram", null, [])] } } as unknown as TowerPlanRead)).toBeNull();
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
  it("rotula la compra que sigue", () => {
    expect(stageKicker(2, "gpu", "actual")).toBe("Compra 2 · Placa de video · la que sigue");
    expect(stageKicker(1, "ram", "hecha")).toBe("Compra 1 · Memoria");
    expect(stageKicker(3, undefined, "pendiente")).toBe("Compra 3");
  });
  it("los editores nuevos no piden la BIOS de una placa candidata", () => {
    const pc = { id: "11111111-1111-4111-8111-111111111111", name: "La de casa", revision: 1, lines: [], category_status: {} } as unknown as Tower;
    const actions = renderToStaticMarkup(createElement(TowerPlanActionEditor, { pc, disabled: false, onAdd: () => {} }));
    expect(actions).not.toMatch(/\bBIOS\b/i);
    const editor = renderToStaticMarkup(createElement(TowerPlanEditor, { pc, onSaved: () => {}, seed: { name: "Plan", pc_id: pc.id, expected_pc_revision: 1, expected_catalog_version: "v1", objective: "general", workload: null, budget_ars: "400000", price_condition: "cash", stages: [{ name: "Etapa 1", budget_ars: "400000", materials: [], actions: [] }] } }));
    expect(editor).not.toMatch(/\bBIOS\b/i);
    expect(editor).toContain("Compra 1"); expect(editor).not.toContain("Borrador de compras");
  });
  it("muestra la BIOS histórica de un plan guardado sin afirmar que se revisó", () => {
    const pc = { id: "11111111-1111-4111-8111-111111111111", name: "La de casa", revision: 1, lines: [], category_status: {} } as unknown as Tower;
    const editor = renderToStaticMarkup(createElement(TowerPlanEditor, { pc, onSaved: () => {}, seed: { name: "Plan", pc_id: pc.id, expected_pc_revision: 1, expected_catalog_version: "v1", objective: "general", workload: null, budget_ars: "400000", price_condition: "cash", stages: [{ name: "Etapa 1", budget_ars: "400000", materials: [], actions: [{ action: "replace_category", category: "motherboard", line_id: null, candidates: [{ component_id: "b1", declared_model: null, quantity: 1 }], candidate_context: { bios_version: "P2.30" } }] }] } }));
    expect(editor).toContain("BIOS que indicaste: P2.30");
    expect(editor).not.toMatch(/BIOS revisada|BIOS compatible|BIOS verificada/i);
  });
  it("dice «compra» en lugar de «etapa» y «componente» en lugar de «pieza»", () => {
    expect(stageTitle("Etapa 2")).toBe("Compra 2");
    expect(stageTitle("Primera etapa")).toBe("Primera compra");
    expect(stageTitle("Más memoria")).toBe("Más memoria");
    expect(plainWords("Pieza por confirmar")).toBe("Componente por confirmar");
  });
  it("la ganancia sale solo de datos de referencia respaldados; sin dato no se dice nada", () => {
    const ok = (before: string, after: string, label = "Reference score") => ({ status: "supported" as const, before, after, label });
    expect(gainText(ok("100", "200"))).toBe("Rinde cerca del doble");
    expect(gainText(ok("100", "130"))).toBe("Rinde cerca de 30 % más");
    expect(gainText(ok("16", "32", "Capacity 16 GB to 32 GB"))).toBe("Pasás de 16 GB a 32 GB");
    expect(gainText({ status: "unknown", before: null, after: null, label: "" })).toBeNull();
    expect(gainText({ status: "supported", before: null, after: null, label: "" })).toBeNull();
    expect(gainText({ status: "not_an_improvement", before: "100", after: "100", label: "" })).toBeNull();
    expect(gainText(ok("200", "100"))).toBeNull();
  });
  it("compara el plan nuevo con el anterior sin calcular diferencias en pesos", () => {
    const snap = (total: string | null, verdicts: string[]) => ({ cost: { total_ars: total }, stages: verdicts.map((verdict, index) => ({ name: `Etapa ${index + 1}`, evaluation: { verdict } })) }) as never;
    const up = comparePlans(snap("100.00", ["compatible", "compatible"]), snap("120.00", ["compatible", "requiere_verificacion"]));
    expect(up).toMatchObject({ direction: "sube", stopsFitting: ["Compra 2"] });
    expect(priceChangeText(up)).toBe("Los precios subieron: el plan pasó de $ 100 a $ 120.");
    expect(comparePlans(snap("120.00", ["compatible"]), snap("100.00", ["compatible"])).direction).toBe("baja");
    expect(comparePlans(snap("100.00", ["compatible"]), snap("100.00", ["compatible"])).direction).toBe("igual");
    const unknown = comparePlans(snap("100.00", ["compatible"]), snap(null, ["compatible"]));
    expect(unknown.direction).toBe("sin_dato");
    expect(priceChangeText(unknown)).toContain("falta el precio");
  });
  it("estima los meses con lo que falta y un aporte escrito a mano", () => {
    expect(parseMonthly("$ 100.000")).toBe(100000);
    expect(parseMonthly("100000,50")).toBe(100000);
    expect(parseMonthly("")).toBeNull();
    expect(parseMonthly("0")).toBeNull();
    expect(monthsToFinish("449900.00", 100000)).toBe(5);
    expect(monthsToFinish("0.00", 100000)).toBe(0);
    expect(monthsToFinish(null, 100000)).toBeNull();
    expect(monthsToFinish("100.00", null)).toBeNull();
    expect(monthsText(5, true)).toBe("Terminás en unos 5 meses.");
    expect(monthsText(1, true)).toBe("Terminás en 1 mes.");
    expect(monthsText(0, true)).toBe("Ya no te falta nada.");
    expect(monthsText(null, true)).toBe("Escribí cuánto podés apartar por mes.");
    expect(monthsText(null, false)).toContain("falta el precio");
  });
  it("cuenta qué cambia en Mi PC: de a qué, qué se suma y qué falta saber", () => {
    const metadata = { status: "active", entries: new Map([listo("base-cpu", "Ryzen 5", "cpu"), listo("c1", "RAM 16 GB", "ram")]) } as unknown as MetadataSnapshot;
    const changes = pcChanges(plan, metadata, 0);
    expect(changes).toEqual([{ category: "ram", label: "Memoria", text: "Se suma RAM 16 GB" }]);
    expect(pcChanges(plan, metadata).find(change => change.category === "gpu")?.text).toBe("Falta un dato");
  });
  it("los límites en inglés y los códigos se traducen o se esconden, nunca se muestran crudos", () => {
    expect(plainPlanNote("Reference scores are not FPS or guaranteed physical system performance.")).toBe("Los puntajes de referencia no son FPS ni garantizan cómo rinde tu PC.");
    expect(plainPlanNote("stages.2.offer:unidentified_component")).toBe("Compra 2: no pudimos identificar el componente, así que falta su precio.");
    expect(plainPlanNote("context.bios_version")).toBeNull();
    expect(plainPlanNote("algo.que.no.conocemos")).toBeNull();
    const notes = plainPlanNotes(["offer.missing", "offer.missing", "stages.1.dependency:thermal_compound", "Unknown necessary tower evidence including T10 blocks ready; no policy bypass.", "xyz"]);
    expect(notes).toEqual(["Falta un precio.", "Compra 1: falta pasta térmica.", "Si falta un dato necesario de tu PC, el plan no figura como listo."]);
    expect(notes.join(" ")).not.toMatch(/stages\.|offer:|dependency|[A-Z][a-z]+ [a-z]+ (is|are|never)/);
  });
});
