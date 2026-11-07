import { catalogBoundOffers } from "./catalog-offers";
import { parseCatalogTowerComponent } from "./catalog-tower-consumer";
import { goalByKey } from "./home-goals";
import type { PurchaseLine } from "./purchase-draft";
import { remoteCatalog } from "./tower-catalog";
import type { TowerCategory } from "./towers";

type ProposalLine = { category: TowerCategory; component_id: string; offer_id: string; quantity: number };
export type FirstBuildProposal = { status: "proposed" | "not_enough"; lines: ProposalLine[]; total_ars: string | null; verdict: string | null; notices: string[] };

/** Lee lo elegido en Inicio. Sin objetivo o presupuesto válidos, no hay armado automático. */
export function firstBuildRequest(search: string) {
  const params = new URLSearchParams(search);
  const goal = goalByKey(params.get("objetivo")), budget = params.get("presupuesto") ?? "";
  return goal && /^[1-9]\d{0,11}$/.test(budget) ? { objective: goal.objective, budget } : null;
}

export type FirstBuildGoal = { objective: string; budget: string; condition: "cash" | "list" };

/** El monto que escribió la persona, si alcanza para pedir una propuesta. */
export function proposalBudget(text: string) {
  const budget = text.trim();
  return /^\d{1,12}(\.\d{1,2})?$/.test(budget) && Number(budget) > 0 ? budget : null;
}

/** Cómo se decidió, en palabras de la persona. Debe coincidir con los pesos de first_build.py. */
export function firstBuildReason(objective: string) {
  const first = objective === "gaming" ? "la placa de video" : "el procesador";
  return `Buscamos el mejor procesador y placa de video que entran en tu presupuesto según benchmarks publicados, con prioridad en ${first}. El resto es lo más barato que les sirve. Revisamos que todo encaje según datos de referencia.`;
}

/** La propuesta sale del servidor, ya revisada por el motor; acá solo se convierte en un borrador editable. */
export async function loadFirstBuild({ objective, budget, condition }: FirstBuildGoal, signal?: AbortSignal) {
  const response = await fetch(`/api/catalog/components/first-build?${new URLSearchParams({ objective, budget_ars: budget, condition })}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("No pudimos armar la propuesta.");
  const proposal = await response.json() as FirstBuildProposal;
  const lines: PurchaseLine[] = await Promise.all(proposal.lines.map(async line => {
    const part = parseCatalogTowerComponent(await remoteCatalog<unknown>(`/${encodeURIComponent(line.component_id)}`, signal));
    return { part, quantity: line.quantity, offer: catalogBoundOffers(part).find(offer => offer.offer_id === line.offer_id) ?? null };
  }));
  return { proposal, lines };
}
