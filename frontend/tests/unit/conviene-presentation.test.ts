import { describe, expect, it } from "vitest";
import { closestOverBudget, benefitReasons, budgetBarPercent, cheapestFirst, checkRows, discardReason, groupProposals, isDiscarded, proposalOffer } from "../../lib/conviene-presentation";
import type { TowerRecommendationItem } from "../../lib/tower-recommendations";

type Partial2 = { key: string; status?: string; verdict?: string; total?: string | null; rules?: [string, "pass" | "fail" | "unknown"][]; benefit?: Partial<TowerRecommendationItem["benefit"]>; offers?: unknown[] };
const item = ({ key, status = "recommended", verdict = "compatible", total = "100000.00", rules = [["T04", "pass"]], benefit = {}, offers = [] }: Partial2) => ({
  key, status, actions: [], versions: { catalog: "c" }, offers, dependencies: [], missing_fields: [],
  evaluation: { verdict, rule_results: rules.map(([rule_id, state]) => ({ rule_id, state })) },
  cost: { total_ars: total, known_subtotal_ars: "0.00", within_budget: true, lines: [], missing_fields: [], excluded: [] },
  benefit: { status: "supported", before: "A", after: "B", source: [], workload: null, ...benefit },
}) as unknown as TowerRecommendationItem;

describe("propuestas de «Lo que te conviene»", () => {
  it("separa la principal, las alternativas y las descartadas sin cambiar el orden del servidor", () => {
    const items = [item({ key: "a", verdict: "incompatible" }), item({ key: "b" }), item({ key: "c", status: "rejected" }), item({ key: "d", verdict: "requiere_verificacion", status: "requires_verification" }), item({ key: "e" })];
    const grupos = groupProposals(items);
    expect(grupos.principal?.key).toBe("b");
    expect(grupos.alternativas.map(i => i.key)).toEqual(["d", "e"]);
    expect(grupos.descartadas.map(i => i.key)).toEqual(["a", "c"]);
    expect(isDiscarded(items[3])).toBe(false);
  });
  it("sin propuestas no hay principal", () => {
    expect(groupProposals([])).toEqual({ principal: null, alternativas: [], descartadas: [] });
    expect(groupProposals([item({ key: "x", verdict: "incompatible" })]).principal).toBeNull();
  });
  it("«más baratas primero» ordena por el importe del servidor y deja al final las que no tienen precio", () => {
    const orden = cheapestFirst([item({ key: "caro", total: "479000.00" }), item({ key: "sin", total: null }), item({ key: "barato", total: "289000.50" }), item({ key: "igual", total: "479000" }), item({ key: "sin2", total: null })]);
    expect(orden.map(i => i.key)).toEqual(["barato", "caro", "igual", "sin", "sin2"]);
  });
  it("nombra las comprobaciones con palabras comunes y nunca mezcla el estado", () => {
    const propuesta = item({ key: "x", rules: [["T05", "fail"], ["T04", "pass"], ["T08", "unknown"]] });
    expect(checkRows(propuesta)).toEqual([
      { id: "T05", label: "Fuente de alimentación", estado: "incompatible" },
      { id: "T04", label: "Largo de la gráfica", estado: "compatible" },
      { id: "T08", label: "Almacenamiento", estado: "requiere_verificacion" },
    ]);
    expect(discardReason(propuesta)).toBe("no encaja: no pasó fuente de alimentación.");
    expect(discardReason(item({ key: "y", status: "rejected", rules: [] }))).toBe("no la pudimos aprobar para tu PC.");
  });
  it("cada descarte dice su motivo real: no encaja, se pasa del presupuesto o no mejora", () => {
    const pasado = item({ key: "p", status: "rejected", rules: [] }) as unknown as { cost: { within_budget: boolean } };
    pasado.cost.within_budget = false;
    expect(discardReason(pasado as unknown as TowerRecommendationItem)).toBe("se pasa del presupuesto.");
    expect(discardReason(item({ key: "n", status: "rejected", rules: [], benefit: { status: "not_an_improvement" } }))).toBe("no mejora tu PC según la referencia.");
    expect(discardReason(item({ key: "i", verdict: "incompatible", rules: [] }))).toBe("no encaja con tu PC.");
  });
  it("los motivos no prometen FPS ni inventan una mejora que la API no trae", () => {
    expect(benefitReasons(item({ key: "a" }))[0]).toBe("La referencia pasa de A a B.");
    expect(benefitReasons(item({ key: "b", benefit: { status: "unknown", before: null, after: null } }))[0]).toBe("Todavía no tenemos una referencia para medir la mejora.");
    expect(benefitReasons(item({ key: "c", benefit: { status: "not_an_improvement" } }))[0]).toBe("La referencia no muestra una mejora.");
    for (const key of ["a", "b"]) expect(benefitReasons(item({ key })).at(-1)).toContain("no una promesa de FPS");
  });
  it("la oferta trae tienda, día y condición del servidor; sin oferta no hay nada", () => {
    expect(proposalOffer(item({ key: "a" }))).toBeNull();
    const oferta = proposalOffer(item({ key: "b", offers: [{ store: "compragamer", amount: "389900.00", observed_at: "2026-10-28T12:00:00Z", source_url: "https://compragamer.com/p", condition: "cash" }] }));
    expect(oferta).toEqual({ store: "Compra Gamer", date: "2026-10-28T12:00:00Z", url: "https://compragamer.com/p", condition: "Contado" });
  });
  it("la barra de presupuesto es solo visual y nunca pasa del 100 %", () => {
    expect(budgetBarPercent("389900.00", "400000.00")).toBeCloseTo(97.47, 1);
    expect(budgetBarPercent("500000.00", "400000.00")).toBe(100);
    expect(budgetBarPercent(null, "400000.00")).toBeNull();
    expect(budgetBarPercent("100.00", "0.00")).toBeNull();
    expect(budgetBarPercent("abc", "400000.00")).toBeNull();
  });
});

describe("closestOverBudget", () => {
  const item = (changes: object) => ({ status: "rejected", evaluation: { verdict: "compatible" }, cost: { within_budget: false, total_ars: "877100.00" }, benefit: { status: "supported", before: "100", after: "122" }, ...changes });
  it("elige la primera mejora real que solo falla por precio", () => {
    const leve = item({ benefit: { status: "supported", before: "100", after: "105" } }), real = item({});
    expect(closestOverBudget([leve, real])).toBe(real);
  });
  it("no sugiere lo que no encaja ni lo que entra en el presupuesto", () => {
    expect(closestOverBudget([item({ evaluation: { verdict: "incompatible" } }), item({ cost: { within_budget: true, total_ars: "1" } })])).toBeNull();
  });
});
