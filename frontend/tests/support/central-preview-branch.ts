import type { TowerRecommendationPreview } from "../../lib/tower-recommendations";
import { offerDisplayStatus } from "../../lib/retail-presentation";

// Test observation only. No clock override, repricing or product decision.
export function centralPreviewBranch(preview: TowerRecommendationPreview, observedAt: number) {
  const offers = preview.items.flatMap(item => item.offers);
  const current = offers.filter(offer => offer.amount !== null && offerDisplayStatus(offer, observedAt) === "fresh");
  const quoted = preview.items.slice(0, 6).findIndex(item => item.status === "rejected" && item.cost.total_ars !== null && item.cost.within_budget === false && item.actions.length > 0 && item.offers.some(offer => offer.amount !== null && offerDisplayStatus(offer, observedAt) === "fresh"));
  if (quoted >= 0) return { branch: "quoted_budget_rejection" as const, chosen: quoted, preview_offer_count: offers.length, current_preview_offer_count: current.length };
  const unknown = preview.items.slice(0, 6).findIndex(item => item.status === "requires_verification" && item.cost.total_ars === null && item.cost.within_budget === null && item.cost.missing_fields.length > 0);
  if (unknown < 0 || current.length || preview.items.some(item => item.status === "recommended")) throw new Error("central_preview_prerequisite_unavailable");
  return { branch: "no_current_preview_quotes_manual" as const, chosen: unknown, preview_offer_count: offers.length, current_preview_offer_count: 0 };
}
