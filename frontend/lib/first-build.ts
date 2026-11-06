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

/** La propuesta sale del servidor, ya revisada por el motor; acá solo se convierte en un borrador editable. */
export async function loadFirstBuild(objective: string, budget: string, signal?: AbortSignal) {
  const response = await fetch(`/api/catalog/components/first-build?${new URLSearchParams({ objective, budget_ars: budget })}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("No pudimos armar la propuesta.");
  const proposal = await response.json() as FirstBuildProposal;
  const lines: PurchaseLine[] = await Promise.all(proposal.lines.map(async line => {
    const part = parseCatalogTowerComponent(await remoteCatalog<unknown>(`/${encodeURIComponent(line.component_id)}`, signal));
    return { part, quantity: line.quantity, offer: catalogBoundOffers(part).find(offer => offer.offer_id === line.offer_id) ?? null };
  }));
  return { proposal, lines };
}
