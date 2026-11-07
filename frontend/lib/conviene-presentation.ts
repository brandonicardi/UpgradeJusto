import { referenceNote } from "./conviene-view";
// Presentación de «Lo que te conviene». Solo ordena y nombra lo que devolvió la API:
// no decide compatibilidad ni calcula precios.
import { towerRuleLabels } from "./tower-compatibility";
import type { TowerRecommendationItem } from "./tower-recommendations";
import { retailSourceURL, shortRetailDate } from "./retail-presentation";

export type ProposalGroups = { principal: TowerRecommendationItem | null; alternativas: TowerRecommendationItem[]; descartadas: TowerRecommendationItem[] };

/** Una propuesta descartada es la que el servidor rechazó o la que el motor dice que no encaja. */
export function isDiscarded(item: TowerRecommendationItem): boolean {
  return item.status === "rejected" || item.evaluation.verdict === "incompatible";
}

/** Respeta el orden del servidor: la primera que sirve es la principal, el resto son alternativas. */
export function groupProposals(items: readonly TowerRecommendationItem[]): ProposalGroups {
  const sirven = items.filter(item => !isDiscarded(item));
  return { principal: sirven[0] ?? null, alternativas: sirven.slice(1), descartadas: items.filter(isDiscarded) };
}

// Importe decimal del servidor («389900.00») → centavos enteros, solo para ordenar. Sin importe no hay orden.
function cents(value: string | null | undefined): bigint | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value?.trim() ?? "");
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0") : null;
}

/** «Más baratas primero»: las que no tienen precio completo quedan al final, en su orden original. */
export function cheapestFirst(items: readonly TowerRecommendationItem[]): TowerRecommendationItem[] {
  return items.map((item, index) => ({ item, index, price: cents(item.cost.total_ars) }))
    .sort((a, b) => a.price === null && b.price === null ? a.index - b.index : a.price === null ? 1 : b.price === null ? -1 : a.price < b.price ? -1 : a.price > b.price ? 1 : a.index - b.index)
    .map(entry => entry.item);
}

/** Tienda, día y enlace de la oferta que respalda el precio; sin oferta no se inventa ninguno. */
export function proposalOffer(item: Pick<TowerRecommendationItem, "offers">): { store: string; date: string; url: string | null; condition: string } | null {
  const offer = item.offers.find(candidate => candidate.amount !== null) ?? item.offers[0];
  if (!offer) return null;
  return { store: offer.store === "compragamer" ? "Compra Gamer" : offer.store === "venex" ? "Venex" : String(offer.store), date: offer.observed_at, url: retailSourceURL(offer.source_url), condition: offer.condition === "cash" ? "Contado" : "Lista (no cuotas)" };
}

const estados = { pass: "compatible", fail: "incompatible", unknown: "requiere_verificacion", not_applicable: "no_evaluado" } as const;

export type CheckState = "compatible" | "incompatible" | "requiere_verificacion" | "no_evaluado";

/** Las comprobaciones de la propuesta, con nombre para personas y el estado del motor. Un dato que no aplica no es un dato que falta. */
export function checkRows(item: TowerRecommendationItem): { id: string; label: string; estado: CheckState }[] {
  return item.evaluation.rule_results.map(rule => ({ id: rule.rule_id, label: towerRuleLabels[rule.rule_id] ?? "Otra comprobación", estado: estados[rule.state] ?? "requiere_verificacion" }));
}

/**
 * Por qué se descartó, con el motivo real: no encaja (nombra las comprobaciones que fallaron), se pasa del
 * presupuesto o no mejora. Si no hay motivo claro, lo decimos sin inventarlo.
 */
/** La mejora real más cercana cuando ninguna entra en el presupuesto: encaja, mejora de verdad y solo falla el precio. */
export function closestOverBudget<T extends { status: string; evaluation: { verdict: string }; cost: { within_budget?: boolean | null; total_ars?: string | null }; benefit: { status: string; before?: string | null; after?: string | null } }>(items: T[]): T | null {
  const mejora = (item: T) => Number(item.benefit.after) / Number(item.benefit.before) - 1;
  return items.find(item => item.status === "rejected" && item.evaluation.verdict === "compatible" && item.cost.within_budget === false && item.benefit.status === "supported" && mejora(item) >= 0.1) ?? null;
}

export function discardReason(item: TowerRecommendationItem): string {
  const fallaron = checkRows(item).filter(row => row.estado === "incompatible").map(row => row.label.toLowerCase());
  if (item.evaluation.verdict === "incompatible" || fallaron.length) {
    return fallaron.length ? `no encaja: no pasó ${fallaron.join(", ")}.` : "no encaja con tu PC.";
  }
  if (item.cost.within_budget === false) return "se pasa del presupuesto.";
  if (item.benefit.status === "not_an_improvement") return "no mejora tu PC según la referencia.";
  return "no la pudimos aprobar para tu PC.";
}

/** «Antes → Después» solo si la API trae los dos datos; la referencia nunca es una promesa de FPS. */
export function benefitReasons(item: TowerRecommendationItem): string[] {
  const { benefit } = item, razones: string[] = [];
  if (benefit.status === "supported") razones.push(benefit.before && benefit.after ? `La referencia pasa de ${benefit.before} a ${benefit.after}.` : "La referencia respalda una mejora.");
  else if (benefit.status === "not_an_improvement") razones.push("La referencia no muestra una mejora.");
  else razones.push("Todavía no tenemos una referencia para medir la mejora.");
  const pasaron = checkRows(item).filter(row => row.estado === "compatible").slice(0, 2).map(row => `Revisamos: ${row.label.toLowerCase()}.`);
  razones.push(...pasaron);
  razones.push(referenceNote(item));
  return razones;
}

export function offerDate(value: string): string { return shortRetailDate(value); }

/** Ancho de la barra de presupuesto, solo visual: parte de dos importes del servidor, sin mostrar ninguna cuenta. */
export function budgetBarPercent(total: string | null | undefined, budget: string | null | undefined): number | null {
  const usado = cents(total), tope = cents(budget);
  if (usado === null || tope === null || tope === 0n) return null;
  return Math.min(100, Number((usado * 10000n) / tope) / 100);
}
