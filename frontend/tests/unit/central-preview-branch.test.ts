import { describe, expect, it } from "vitest";
import { centralPreviewBranch } from "../support/central-preview-branch";
import type { TowerRecommendationPreview } from "../../lib/tower-recommendations";
import type { RetailOffer } from "../../lib/tower-catalog";

// Minimal synthetic observation fixtures, never product/API substitutes.
const now = Date.parse("2026-10-27T14:42:00Z");
const quote = (expires = "2026-10-27T15:00:00Z"): RetailOffer => ({ offer_id: "synthetic", store: "venex", product_id: "synthetic", component_id: "synthetic", variant_key: "synthetic", amount: "1.00", currency: "ARS", condition: "cash", availability: "unknown", stock_quantity: null, source_url: "https://venex.com.ar/synthetic", observed_at: "2026-10-27T13:00:00Z", expires_at: expires, status: "fresh" });
function preview(status: "requires_verification" | "rejected" = "requires_verification"): TowerRecommendationPreview {
  return { items: [{ status, actions: status === "rejected" ? [{}] : [], offers: [], cost: { total_ars: status === "rejected" ? "1.00" : null, within_budget: status === "rejected" ? false : null, missing_fields: ["offer.missing"] } }] } as unknown as TowerRecommendationPreview;
}
describe("central evidence branch is grounded in current returned data", () => {
  it("retains the quoted budget rejection only with a currently valid returned quote", () => {
    const value = preview("rejected"); value.items[0].offers = [quote()];
    expect(centralPreviewBranch(value, now).branch).toBe("quoted_budget_rejection");
  });
  it("permits the explicit manual route for unknown cost and absent/expired returned quotes, without mutating them", () => {
    const value = preview(); value.items[0].offers = [quote("2026-10-27T14:34:00Z")]; const before = JSON.stringify(value);
    expect(centralPreviewBranch(value, now)).toMatchObject({ branch: "no_current_preview_quotes_manual", preview_offer_count: 1, current_preview_offer_count: 0 }); expect(JSON.stringify(value)).toBe(before);
    value.items[0].offers = []; expect(centralPreviewBranch(value, now).preview_offer_count).toBe(0);
  });
  it("fails rather than relabeling fresh unknown, expired quoted rejection or a supposed recommendation", () => {
    const freshUnknown = preview(); freshUnknown.items[0].offers = [quote()]; expect(() => centralPreviewBranch(freshUnknown, now)).toThrow();
    const expiredRejected = preview("rejected"); expiredRejected.items[0].offers = [quote("2026-10-27T14:34:00Z")]; expect(() => centralPreviewBranch(expiredRejected, now)).toThrow();
    const recommended = preview(); recommended.items[0].status = "recommended"; expect(() => centralPreviewBranch(recommended, now)).toThrow();
  });
});
