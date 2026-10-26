import { describe, expect, it } from "vitest";
import { previewInput, recommendationError, costTotalLabel, type DraftAlternative } from "../../lib/recommendations";
import { recommendationsProxy } from "../../lib/recommendations-proxy";
import { signedProxyHeaders } from "../../lib/gateway";

const alternative = (): DraftAlternative[] => [{ key: "test-only", replacements: [{ category: "cpu", candidates: [{ component_id: "unit-reference", quantity: "1" }], bios: "" }] }];
describe("CU06 F input y frontera gateway, sin motor/precios cliente", () => {
  it("total null no se presenta como cero ni subtotal, conserva decimales conocidos", () => {
    expect(costTotalLabel(null)).toBe("Desconocido (null), no es cero");
    expect(costTotalLabel("123.40")).toBe("123.40");
  });
  it("preserva decimal ARS como string y rechaza sintaxis fuera del contrato", () => {
    expect(previewInput(2, "gaming", "999999999999.99", alternative()).budget_ars).toBe("999999999999.99");
    for (const value of ["", "0", "00.00", "-1", "1e4", "1,50", "1.001", "1000000000000", " 1", "NaN"]) expect(() => previewInput(1, "general", value, alternative())).toThrow();
  });
  it("construye conjunto y dependencias explícitos, RAM completa y BIOS nueva null", () => {
    const draft = alternative();
    draft[0].replacements.push({ category: "ram", candidates: [{ component_id: "ram-a", quantity: "2" }, { component_id: "ram-b", quantity: "1" }], bios: "" });
    draft[0].replacements.push({ category: "motherboard", candidates: [{ component_id: "board-a", quantity: "1" }], bios: "" });
    const input = previewInput(3, "productivity", "1.01", draft);
    expect(input.alternatives[0].replacements[1].candidates).toEqual([{ component_id: "ram-a", quantity: 2 }, { component_id: "ram-b", quantity: 1 }]);
    expect(input.alternatives[0].replacements[2].candidate_context).toEqual({ bios_version: null });
    expect(input.alternatives[0].replacements[0]).not.toHaveProperty("candidate_context");
    expect(input.alternatives[0].replacements[0]).not.toHaveProperty("expected_pc_revision");
    expect(draft[0].replacements[1].candidates[0].quantity).toBe("2");
    expect(input).not.toHaveProperty("price");
  });
  it("rechaza claves/categorías repetidas, cantidades omitidas y más de20 alternativas", () => {
    const draft = alternative();
    expect(() => previewInput(1, "general", "1", [])).toThrow();
    expect(() => previewInput(1, "general", "1", [...draft, ...draft])).toThrow();
    expect(() => previewInput(1, "general", "1", Array.from({ length: 21 }, (_, i) => ({ ...alternative()[0], key: `a-${i}` })))).toThrow();
    draft[0].replacements.push(draft[0].replacements[0]);
    expect(() => previewInput(1, "general", "1", draft)).toThrow();
    const ram = alternative(); ram[0].replacements = [{ category: "ram", candidates: [{ component_id: "ram-a", quantity: "" }], bios: "" }];
    expect(() => previewInput(1, "general", "1", ram)).toThrow();
  });
  it("firma únicamente UUID/POST recommendations/preview exacto", () => {
    const root = "/api/pcs/11111111-1111-1111-1111-111111111111/recommendations/";
    const fixture = "synthetic-unit-fixture-not-runtime-secret";
    expect(signedProxyHeaders("127.0.0.1", "POST", root + "preview", fixture)).not.toBeNull();
    for (const method of ["GET", "PUT", "DELETE"]) expect(signedProxyHeaders("127.0.0.1", method, root + "preview", fixture)).toBeNull();
    for (const suffix of ["save", "preview/", "preview?owner_id=", "../preview"]) expect(signedProxyHeaders("127.0.0.1", "POST", root + suffix, fixture)).toBeNull();
  });
  it("proxy falla cerrado antes de fetch y errores de revisión no ocultan necesidad de recarga", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const root = `http://127.0.0.1:3000/api/pcs/${id}/recommendations/preview`;
    for (const query of ["?owner_id", "?owner_id=", "?page=1"]) {
      const response = await recommendationsProxy(new Request(root + query, { method: "POST" }), id);
      expect(response.status).toBe(422); expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
    expect((await recommendationsProxy(new Request(root), id)).status).toBe(405);
    expect((await recommendationsProxy(new Request(root, { method: "POST" }), "invalid")).status).toBe(422);
    expect(recommendationError(409)).toContain("Recargá el detalle");
  });
});
