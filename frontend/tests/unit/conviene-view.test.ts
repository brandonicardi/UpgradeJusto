import { describe, expect, it } from "vitest";
import { altLabel, benefitLine, introLine, joinLabels, planLead, swapSides, whyReasons, budgetState, chooseMain, convieneDraft, metadataQueriesFor, moneyText, pcAfterChange, planDraftFor, proposalCategory, unknownChecks, workloadNote } from "../../lib/conviene-view";
import { checkRows } from "../../lib/conviene-presentation";
import { metadataKey, type MetadataSnapshot } from "../../lib/preview-metadata";
import type { TowerRecommendationItem } from "../../lib/tower-recommendations";
import type { Tower } from "../../lib/towers";

const line = (category: string, component_id: string | null, quantity = 1, declared_model: string | null = null) => ({ line_id: null, category, component_id, declared_model, quantity });
const pc = { id: "11111111-1111-4111-8111-111111111111", revision: 3, name: "La de casa", lines: [line("gpu", "old-gpu"), line("cpu", "cpu-1")] } as unknown as Tower;
const proposal = (over: Record<string, unknown> = {}) => ({
  key: "p1", status: "recommended", missing_fields: [], offers: [], dependencies: [], versions: { catalog: "v1" },
  actions: [{ action: "replace_category", category: "gpu", line_id: null, candidates: [{ component_id: "new-gpu", declared_model: null, quantity: 1 }] }],
  evaluation: { verdict: "compatible", rule_results: [{ rule_id: "T04", state: "pass" }, { rule_id: "T05", state: "unknown" }], evaluated_configuration: { lines: [line("gpu", "new-gpu"), line("cpu", "cpu-1"), line("ram", "ram-1", 2)] } },
  cost: { total_ars: "389900.00", within_budget: true, known_subtotal_ars: "0.00", lines: [], missing_fields: [], excluded: [] },
  benefit: { status: "supported", before: "A", after: "B", source: [], workload: null },
  ...over,
}) as unknown as TowerRecommendationItem;
const listo = (id: string, name: string, category: string) => [metadataKey(id, "v1"), { status: "ready" as const, part: { id, name, category } }] as const;
const metadata = { status: "active", entries: new Map([listo("new-gpu", "RTX 5070", "gpu"), listo("cpu-1", "Ryzen 5 5600", "cpu"), listo("ram-1", "16 GB DDR4", "ram")]) } as unknown as MetadataSnapshot;

describe("armado de «Lo que te conviene»", () => {
  it("la bajada y el plan usan las palabras de la maqueta sin jerga", () => {
    expect(introLine("Jugar mejor")).toBe("Miramos tu PC entera y buscamos el cambio que más mejora tus juegos sin pasarte del presupuesto.");
    expect(introLine("Trabajar más rápido")).toBe("Miramos tu PC entera y buscamos el cambio que más te sirve para trabajar más rápido sin pasarte del presupuesto.");
    expect(planLead("gpu")).toBe("Empezá por la placa de video. Cuando puedas, sumá lo que sigue.");
    expect(planLead(null)).toBe("Empezá por este cambio. Cuando puedas, sumá lo que sigue.");
  });
  it("productividad se pide con la referencia de Blender y la pantalla lo dice sin jerga", () => {
    const draft = convieneDraft("productivity", "400000");
    expect(draft).toMatchObject({ objective: "productivity", workload: "blender-cpu", price_condition: "cash", budget_ars: "400000" });
    expect(workloadNote(draft)).toContain("render en Blender");
    expect(convieneDraft("gaming", "400000").workload).toBeNull();
    expect(workloadNote(convieneDraft("general", "400000"))).toBeNull();
  });
  it("«Tu PC con este cambio» pone la pieza nueva primero y usa los nombres del catálogo", () => {
    const filas = pcAfterChange(proposal(), metadata);
    expect(filas.map(f => [f.label, f.name, f.isNew])).toEqual([["Placa de video", "RTX 5070", true], ["Procesador", "Ryzen 5 5600", false], ["Memoria", "2 × 16 GB DDR4", false]]);
  });
  it("sin nombre en el catálogo dice «Por confirmar» y no inventa uno", () => {
    const vacio = { status: "unavailable", entries: new Map() } as unknown as MetadataSnapshot;
    expect(pcAfterChange(proposal(), vacio).every(f => f.name.includes("Por confirmar"))).toBe(true);
  });
  it("pide al catálogo las piezas propuestas y las de la PC, sin repetir", () => {
    const ids = metadataQueriesFor([proposal(), proposal({ key: "p2" })], pc).map(q => q.id).sort();
    expect(ids).toEqual(["cpu-1", "new-gpu", "old-gpu", "ram-1"]);
  });
  it("los importes se muestran como los informó el servidor y nunca como cero inventado", () => {
    expect(moneyText("389900.00")).toBe("$ 389.900");
    expect(moneyText("289000.5")).toBe("$ 289.000,50");
    expect(moneyText("400000")).toBe("$ 400.000");
    expect(moneyText(null)).toBeNull();
    expect(moneyText("abc")).toBeNull();
  });
  it("«Hoy tenés» y «Pasás a» llevan la cantidad, para que dos memorias distintas no parezcan la misma", () => {
    const sides = swapSides(proposal({ actions: [{ action: "replace_category", category: "ram", line_id: null, candidates: [{ component_id: "ram-1", declared_model: null, quantity: 2 }] }] }), { lines: [line("ram", "ram-1")], category_status: {} } as unknown as Tower, metadata);
    expect(sides).toEqual({ actual: "16 GB DDR4", nueva: "2 × 16 GB DDR4" });
    expect(swapSides(proposal(), { lines: [], category_status: { gpu: "absent" } } as unknown as Tower, metadata)).toEqual({ actual: "Sin componente de este tipo", nueva: "RTX 5070" });
    expect(swapSides(proposal(), null, { status: "unavailable", entries: new Map() } as unknown as MetadataSnapshot)).toEqual({ actual: "Por confirmar", nueva: "Componente por confirmar" });
  });
  it("la mejora usa la unidad solo si la API la declara y nunca promete FPS", () => {
    expect(benefitLine(proposal({ benefit: { status: "supported", before: "16", after: "32", label: "RAM capacity GB only; not universal performance" } }))).toBe("Tu memoria pasa de 16 GB a 32 GB.");
    expect(benefitLine(proposal())).toBe("En la referencia, el puntaje pasa de A a B.");
    expect(benefitLine(proposal({ benefit: { status: "unknown", before: null, after: null } }))).toContain("Todavía no tenemos una referencia");
    expect(benefitLine(proposal({ benefit: { status: "not_an_improvement", before: "1", after: "1" } }))).toContain("no mejora");
    const motivos = whyReasons(proposal());
    expect(motivos[1]).toBe("Revisamos con tu PC: Largo de la gráfica.");
    expect(motivos.at(-1)).toContain("no una promesa de FPS");
    const muchas = proposal({ evaluation: { verdict: "compatible", rule_results: ["T01", "T02", "T03", "T04", "T05"].map(rule_id => ({ rule_id, state: "pass" })), evaluated_configuration: { lines: [] } } });
    expect(whyReasons(muchas)[1]).toBe("Revisamos con tu PC: Procesador y placa, Memoria RAM, Interfaz de la gráfica y 2 más.");
  });
  it("las listas de comprobaciones se acortan sin perder cuántas faltan", () => {
    expect(joinLabels(["A", "B"])).toBe("A, B");
    expect(joinLabels(["A", "B", "C", "D", "E"])).toBe("A, B, C y 2 más");
    expect(joinLabels([])).toBe("");
  });
  it("nombra lo que el motor no pudo resolver", () => {
    expect(unknownChecks(proposal())).toEqual(["Fuente de alimentación"]);
  });
  it("un dato que no aplica se muestra «No evaluado», no «Falta un dato»", () => {
    const item = proposal({ evaluation: { verdict: "compatible", rule_results: [{ rule_id: "T04", state: "not_applicable" }, { rule_id: "T05", state: "unknown" }], evaluated_configuration: { lines: [] } } });
    expect(checkRows(item)).toEqual([
      { id: "T04", label: "Largo de la gráfica", estado: "no_evaluado" },
      { id: "T05", label: "Fuente de alimentación", estado: "requiere_verificacion" },
    ]);
    expect(unknownChecks(item)).toEqual(["Fuente de alimentación"]);
  });
  it("el presupuesto solo repite lo que dijo el servidor", () => {
    expect(budgetState(proposal())).toBe("dentro");
    expect(budgetState(proposal({ cost: { total_ars: "500000.00", within_budget: false } }))).toBe("fuera");
    expect(budgetState(proposal({ cost: { total_ars: null, within_budget: true } }))).toBe("desconocido");
    expect(budgetState(proposal({ cost: { total_ars: "1.00", within_budget: null } }))).toBe("desconocido");
  });
  it("elegir una alternativa la sube a principal; si ya no está, manda el orden del servidor", () => {
    const items = [{ key: "a" }, { key: "b" }, { key: "c" }];
    expect(chooseMain(items, "c")).toEqual({ main: { key: "c" }, others: [{ key: "a" }, { key: "b" }] });
    expect(chooseMain(items, "zzz").main).toEqual({ key: "a" });
    expect(chooseMain([], null)).toEqual({ main: null, others: [] });
  });
  it("«más barata» solo se dice de la que corresponde", () => {
    expect(altLabel("gpu", "p1", "p1")).toBe("Placa de video · más barata");
    expect(altLabel("gpu", "p1", "p2")).toBe("Placa de video");
    expect(altLabel(null, null, "p2")).toBe("Cambio propuesto");
    expect(proposalCategory(proposal())).toBe("gpu");
  });
  it("el borrador de plan lleva las acciones del servidor y no guarda ni confirma nada", () => {
    const draft = planDraftFor(pc, proposal(), convieneDraft("gaming", "400000"));
    expect(draft).toMatchObject({ name: "Mejora de La de casa", pc_id: pc.id, expected_pc_revision: 3, expected_catalog_version: "v1", objective: "gaming", workload: null, budget_ars: "400000" });
    expect(draft.stages).toHaveLength(1);
    expect(draft.stages[0]).toMatchObject({ name: "Placa de video", materials: [] });
    expect(draft.stages[0].actions[0].candidates[0].component_id).toBe("new-gpu");
  });
});
