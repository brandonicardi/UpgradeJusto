import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyTower, type Tower } from "../../lib/towers";
import { createTowerRecommendations, publicEvidenceURL, recommendationInput, recommendationStatus, type RecommendationDraft, type RecommendationState, type TowerRecommendationPreview } from "../../lib/tower-recommendations";
import type { TowerEvaluation } from "../../lib/tower-compatibility";
import TowerRecommendationView from "../../app/pcs/tower-recommendation-view";
import TowerRecommendations from "../../app/pcs/tower-recommendations";

const id = "12345678-1234-1234-1234-123456789abc";
const pc = (): Tower => ({ ...emptyTower(), id, name: "Synthetic", revision: 1, origin_schema: 2 });
const draft = (): RecommendationDraft => ({ objective: "general", budget_ars: "900719925474099300.19", price_condition: "cash", workload: null, thermal_available: false });
// Synthetic DTO only. No published product/price, source evidence or positive physical claim.
function preview(): TowerRecommendationPreview {
  const evaluation: TowerEvaluation = { verdict: "requiere_verificacion", rule_results: [], missing_fields: ["cpu.socket"], rules_version: "cu05-tower-stock-engine-1", data_revision: "synthetic", pc_revision: 1, scope: { id: "cu05-tower-stock-1", policy_version: "tower-stock-policy-1", inventory_version: "tower-stock-inventory-1", label: "Torre stock", operating_regime: "stock_no_oc", excludes: ["Advanced geometry"] }, coverage: { required: 12, implemented: 12, evaluated: 0, passed: 0, failed: 0, unknown: 12, not_applicable: 0, not_implemented: 0, complete: false }, additional_checks: [], warnings: [], evaluated_configuration: pc() };
  return { pc_id: id, pc_revision: 1, objective: "general", budget_ars: draft().budget_ars, mode: "automatic", items: [{ key: "synthetic", actions: [], evaluation, benefit: { status: "unknown", before: null, after: null, source: [], workload: null }, cost: { total_ars: null, known_subtotal_ars: "900719925474099300.19", within_budget: null, lines: [], missing_fields: ["offer.missing"], excluded: ["shipping", "financing", "labor"] }, dependencies: [{ kind: "thermal_compound", required: true, state: "missing", component_id: null, offer_id: null, amount_ars: null, source_refs: [], reason: "Disponibilidad sin confirmar" }], offers: [], versions: { catalog: "synthetic", rules: "cu05-tower-stock-engine-1", references: "synthetic", identity: "synthetic", search: "synthetic" }, status: "requires_verification", missing_fields: ["cpu.socket"] }], missing_fields: ["search:bounded_not_exhaustive"], limitations: ["Synthetic bounded search"] };
}
afterEach(() => vi.unstubAllGlobals());
describe("CU06 torre: criterio explícito, precisión y preview efímero", () => {
  it("envía sólo contrato automático, decimal string intacto y materiales no confirmados por defecto", () => {
    const payload = recommendationInput(pc(), draft());
    expect(payload.budget_ars).toBe("900719925474099300.19"); expect(payload.materials).toEqual([]); expect(payload.alternatives).toEqual([]); expect(payload.mode).toBe("automatic");
    expect(recommendationInput(pc(), { ...draft(), thermal_available: true }).materials).toEqual([{ kind: "thermal_compound", state: "available_confirmed", confirmed: true }]);
    const html = renderToStaticMarkup(<TowerRecommendations pc={pc()} disabled={false} />);
    expect(html).toContain('type="checkbox"'); expect(html).not.toContain('checked=""');
    expect(payload).not.toHaveProperty("owner_id"); expect(payload).not.toHaveProperty("evaluation");
  });
  it("rechaza enums/decimal no positivo/exponente/localizado y candidatas en modo automático", () => {
    for (const budget_ars of ["0", "0.00", "-1", "1e9", "1,00", "1.000,00", "NaN", "", "+1"]) expect(() => recommendationInput(pc(), { ...draft(), budget_ars })).toThrow();
    expect(() => recommendationInput(pc(), { ...draft(), objective: "other" } as unknown as RecommendationDraft)).toThrow();
    expect(() => recommendationInput(pc(), { ...draft(), price_condition: "installments" } as unknown as RecommendationDraft)).toThrow();
    expect(() => recommendationInput(pc(), { ...draft(), workload: "fake-fps" } as unknown as RecommendationDraft)).toThrow();
    expect(() => recommendationInput(pc(), draft(), "automatic", [{ key: "manual", actions: [] }])).toThrow();
  });
  it("unknown/null no son cero ni green; conserva subtotal exacto, dependencias y límite búsqueda", () => {
    const result = preview(), html = renderToStaticMarkup(<TowerRecommendationView result={result} now={0} />);
    expect(html).toContain("Total incompleto / desconocido"); expect(html).toContain("ARS 900.719.925.474.099.300,19"); expect(html).toContain("No se puede confirmar si alcanza");
    expect(html).toContain("Disponibilidad sin confirmar"); expect(html).toContain("Importe no disponible"); expect(html).toContain("no demuestra haber evaluado todas las combinaciones"); expect(html).toContain("No se creó ningún plan");
    expect(recommendationStatus({ ...result.items[0], status: "recommended" })).not.toMatch(/^Recomendación del servidor/); expect(result.items[0].cost.total_ars).toBeNull();
  });
  it("beneficio source/score y before→after se preservan como referencia, no porcentaje/FPS", () => {
    const result = preview(); result.items[0].benefit = { status: "supported", before: "149.8979371914048", after: "214.38925258002163", workload: "blender-cpu", source: [{ model: "Synthetic CPU", score: "214.38925258002163", source_url: "https://example.com/reference", raw_sha256: "synthetic", version: "synthetic", observed_on: "2026-10-26", workload: "blender-cpu", unit: "score", limitations: ["Reference only"], matched_mpn: null, identity_version: "synthetic", identity_source_url: null, identity_kind: "sourced_curated_model" }] };
    const html = renderToStaticMarkup(<TowerRecommendationView result={result} now={0} />);
    expect(html).toContain("149.8979371914048"); expect(html).toContain("214.38925258002163"); expect(html).toContain("no son FPS garantizados"); expect(html).toContain("Necesita verificación");
    for (const invalid of ["javascript:alert(1)", "http://127.0.0.1/x", "http://localhost/x", "https://user:pass@example.com/x", "http://[::1]/", "http://192.168.1.2/", "https://example.com:8443/x"]) expect(publicEvidenceURL(invalid)).toBeNull();
    expect(publicEvidenceURL("https://example.com/source")).toBe("https://example.com/source");
  });
  it("criterios nuevos/cancel ignoran respuesta tardía, sin guardar PC ni plan", async () => {
    const onState = vi.fn<(state: RecommendationState) => void>(); let finish: ((response: Response) => void) | undefined;
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ csrf_token: "synthetic" })).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    const controller = createTowerRecommendations({ onState, request }); const pending = controller.run(pc(), draft());
    await vi.waitFor(() => expect(finish).toBeTypeOf("function")); controller.invalidate(); finish!(Response.json(preview())); await pending;
    expect(onState.mock.calls.at(-1)?.[0].result).toBeNull(); expect(onState.mock.calls.at(-1)?.[0].phase).toBe("idle");
    expect(request.mock.calls.map(call => call[0])).toEqual(["/api/auth/csrf", `/api/towers/${id}/recommendations/preview`]); expect(request.mock.calls[1][1]!.method).toBe("POST"); controller.dispose();
  });
  it("quote vencida y fuente estructurada/string no se convierten en precio vigente ni evidencia técnica", () => {
    const result = preview(); result.items[0].offers = [{ offer_id: "synthetic", store: "venex", product_id: "synthetic", component_id: "synthetic", variant_key: "synthetic", amount: "123.45", currency: "ARS", condition: "list", availability: "unknown", stock_quantity: null, source_url: "https://example.com/quote", observed_at: "2026-10-24T10:00:00Z", expires_at: "2026-10-25T10:00:00Z", status: "fresh" }];
    result.items[0].dependencies[0].source_refs = ["javascript:alert(1)", { source_id: "Synthetic", url: "https://example.com/source", locator: "Synthetic section", consulted_on: "2026-10-24" }];
    const html = renderToStaticMarkup(<TowerRecommendationView result={result} now={Date.parse("2026-10-26T10:00:00Z")} />);
    expect(html).toContain("Cotización vencida; no es precio vigente"); expect(html).toContain("Stock por confirmar"); expect(html).toContain("Observado:"); expect(html).toContain("Lista (no cuotas)"); expect(html).not.toContain('href="javascript:'); expect(html).toContain('href="https://example.com/source"'); expect(result.items[0].cost.total_ars).toBeNull();
  });
  it("409 conserva criterios y no reintenta; respuesta correcta sólo se publica una vez", async () => {
    const onState = vi.fn<(state: RecommendationState) => void>(), input = draft(), snapshot = JSON.stringify(input);
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ csrf_token: "synthetic" })).mockResolvedValueOnce(Response.json({ detail: "private" }, { status: 409 }));
    const controller = createTowerRecommendations({ onState, request }); await controller.run(pc(), input);
    expect(onState.mock.calls.at(-1)?.[0].message).toContain("criterios se conservan"); expect(JSON.stringify(input)).toBe(snapshot); expect(request).toHaveBeenCalledTimes(2);
    request.mockResolvedValueOnce(Response.json({ csrf_token: "synthetic" })).mockResolvedValueOnce(Response.json(preview())); await controller.run(pc(), input);
    expect(onState.mock.calls.at(-1)?.[0].result?.items[0].status).toBe("requires_verification"); controller.dispose();
  });
});
