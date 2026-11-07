import { describe, expect, it } from "vitest";
import { proposalReasons, proposalSwap, proposalTitle } from "../../lib/recommendation-card-presentation";
import { metadataKey, type MetadataSnapshot } from "../../lib/preview-metadata";
import { emptyTower, type Tower, type TowerCategory } from "../../lib/towers";
import type { TowerAction } from "../../lib/tower-compatibility";

const action = (category: TowerCategory = "gpu", kind: TowerAction["action"] = "replace_category"): TowerAction => ({ category, action: kind, line_id: null, candidates: [{ component_id: "new-id", declared_model: null, quantity: 1 }] });
const versions = { catalog: "test", rules: "test", identity: "test", references: "test", search: "test" };
const pc = (): Tower => ({ ...emptyTower(), id: "pc-id", name: "Mi PC", revision: 1, origin_schema: 2 });
const metadata = (): MetadataSnapshot => ({ status: "active", entries: new Map([
  [metadataKey("old-id", "test"), { status: "ready", part: { id: "old-id", category: "gpu", name: "Placa actual", attributes: {}, sources: [], prices: [] } }],
  [metadataKey("new-id", "test"), { status: "ready", part: { id: "new-id", category: "gpu", name: "Placa propuesta", attributes: {}, sources: [], prices: [] } }],
]) });

describe("Resumen breve de una propuesta", () => {
  it.each([
    ["gpu", "la placa de video"], ["cpu", "el procesador"], ["motherboard", "la placa madre"],
    ["ram", "la memoria"], ["psu", "la fuente"], ["case", "el gabinete"],
    ["storage", "el almacenamiento"], ["cooler", "el cooler"], ["fan", "los ventiladores"],
  ] as const)("nombra %s en voseo sin términos de la acción técnica", (category, piece) => {
    expect(proposalTitle([action(category)])).toBe(`Cambiá ${piece}`);
    expect(proposalTitle([action(category, "replace_line")])).toBe(`Cambiá ${piece}`);
    expect(proposalTitle([action(category, "remove_line")])).toBe(`Quitá ${piece}`);
  });
  it("sumar memoria o almacenamiento y varias acciones no alargan el título", () => {
    expect(proposalTitle([action("ram", "add_line")])).toBe("Sumá más memoria");
    expect(proposalTitle([action("storage", "add_line")])).toBe("Sumá almacenamiento");
    expect(proposalTitle([action(), action("cpu"), action("ram")])).toBe("Cambiá la placa de video y más");
    expect(proposalTitle([action(), action("psu")])).toBe("Cambiá la placa de video y la fuente");
    expect(proposalTitle([])).toBe("Cambio propuesto");
  });
  it("Hoy/Pasás a usa los nombres disponibles, sólo de la primera acción y candidata", () => {
    const tower = pc(); tower.lines = [{ line_id: null, category: "gpu", component_id: "old-id", declared_model: null, quantity: 1 }];
    const actions = [action(), action("cpu")];
    actions[0].candidates.push({ component_id: null, declared_model: "Otra candidata", quantity: 1 });
    expect(proposalSwap({ actions, versions }, tower, metadata())).toEqual({ actual: "Placa actual", nueva: "Placa propuesta" });
    tower.lines[0].declared_model = "Mi placa declarada"; actions[0].candidates[0].declared_model = "Nueva declarada";
    expect(proposalSwap({ actions, versions }, tower, metadata())).toEqual({ actual: "Mi placa declarada", nueva: "Nueva declarada" });
    tower.lines.push({ ...tower.lines[0], declared_model: "Segunda placa" });
    expect(proposalSwap({ actions, versions }, tower, metadata()).actual).toBe("Mi placa declarada, Segunda placa");
  });
  it("no muestra IDs ni nombres de otra categoría o catálogo no confirmado", () => {
    const tower = pc(); tower.lines = [{ line_id: null, category: "gpu", component_id: "old-id", declared_model: null, quantity: 1 }];
    for (const status of ["catalog_changed", "unavailable"] as const) {
      expect(proposalSwap({ actions: [action()], versions }, tower, { ...metadata(), status })).toEqual({ actual: "Por confirmar", nueva: "Componente por confirmar" });
    }
    expect(proposalSwap({ actions: [action("cpu")], versions }, tower, metadata())).toEqual({ actual: "Por confirmar", nueva: "Componente por confirmar" });
    tower.lines = []; tower.category_status.gpu = "absent";
    expect(proposalSwap({ actions: [action()], versions }, tower, metadata()).actual).toBe("Sin componente de este tipo");
    expect(proposalSwap({ actions: [], versions }, undefined, metadata())).toEqual({ actual: "Por confirmar", nueva: "Componente por confirmar" });
    const withoutCandidate = action(); withoutCandidate.candidates = [];
    expect(proposalSwap({ actions: [withoutCandidate], versions }, tower, metadata()).nueva).toBe("Componente por confirmar");
  });
  it.each(["unknown", "supported", "not_an_improvement"] as const)("muestra tres motivos para beneficio %s sin inventar rendimiento", status => {
    const reasons = proposalReasons({ status, before: "10", after: "20", source: [], workload: null });
    expect(reasons).toHaveLength(3); expect(reasons[0]).toBe("Antes: 10 → Después: 20");
    expect(reasons[1]).toContain(status === "supported" ? "respalda una mejora" : status === "not_an_improvement" ? "no respalda una mejora" : "sin evidencia suficiente");
    expect(reasons[2]).toContain("no son FPS garantizados");
    expect(proposalReasons({ status, before: null, after: null, source: [], workload: null })[0]).toBe("Antes: Desconocido → Después: Desconocido");
  });
});
