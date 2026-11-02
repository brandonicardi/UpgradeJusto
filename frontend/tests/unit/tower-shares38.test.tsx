import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { parseCreatedShare, parsePublicTowerShare, parseShareList, shareCreateInput } from "../../lib/tower-share-dto";
import { boundedShareJSON, towerShareProxy, towerShareRoute } from "../../lib/tower-share-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
import { shareCreateUncertain, shareStateLabel, TowerShareError } from "../../lib/tower-share-client";
import PublicTowerShareView from "../../components/public-tower-share-view";
import TowerShareManager from "../../components/tower-share-manager";
import { syntheticPublicShare } from "../support/tower-share-fixture";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const id = "12345678-1234-1234-1234-123456789abc", root = `/api/tower-plans/${id}/shares`, now = "2026-10-26T10:00:00Z";
const meta = { id, plan_revision: 1, title: "Plan de mejora de torre", projection_version: "tower-share-projection-1", created_at: now, revoked_at: null };
describe("CU09 tower shares: synthetic unit data, not real API evidence", () => {
  it("projects only public DTO keys and rejects schema1, invalid money and unresolved component refs", () => {
    const source = syntheticPublicShare(), before = JSON.stringify(source);
    const parsed = parsePublicTowerShare({ ...source, notes: "PRIVATE_SENTINEL", pc_id: id, token: "PRIVATE_SENTINEL" });
    expect(JSON.stringify(parsed).includes("PRIVATE_SENTINEL")).toBe(false); expect(parsed.cost.total_ars).toBeNull(); expect(parsed.cost.known_subtotal_ars).toBe("0.00"); expect(parsed.budget_ars).toBe("900719925474099300.19"); expect(JSON.stringify(source)).toBe(before);
    expect(() => parsePublicTowerShare({ ...source, schema_version: 1 })).toThrow(); expect(() => parsePublicTowerShare({ ...source, budget_ars: 1 })).toThrow();
    const broken = syntheticPublicShare(); broken.base_configuration.lines[0].component_ref = "p999"; expect(() => parsePublicTowerShare(broken)).toThrow();
    expect(parsed.stages[0].evaluation.rule_results).toHaveLength(12); expect(parsed.stages[0].evaluation.coverage.unknown).toHaveLength(12);
  });
  it("private list never recovers bearer; create requires controlled title, revision and explicit consent", () => {
    expect(JSON.stringify(parseShareList({ items: [{ ...meta, effective_state: "disabled_plan_deleted", token: "SENTINEL" }] })).includes("SENTINEL")).toBe(false);
    expect(shareCreateInput(1, meta.title, true)).toEqual({ expected_plan_revision: 1, title: meta.title, public_projection_confirmed: true });
    for (const revision of [0, 1.5, 10000000000]) expect(() => shareCreateInput(revision, meta.title, true)).toThrow();
    expect(() => shareCreateInput(1, "Private arbitrary title", true)).toThrow(); expect(() => shareCreateInput(1, meta.title, false)).toThrow(); expect(() => parseCreatedShare({ ...meta, token: "short" })).toThrow();
    expect(shareStateLabel("disabled_plan_deleted")).toContain("baja"); expect(shareStateLabel("revoked")).toBe("Revocado");
    expect(shareCreateUncertain(true, new TypeError())).toBe(true); expect(shareCreateUncertain(true, new TowerShareError(503))).toBe(true); expect(shareCreateUncertain(false, new TypeError())).toBe(false); expect(shareCreateUncertain(true, new TowerShareError(409))).toBe(false);
  });
  it("signs only exact routes/canonical UUIDs while forwarding bounded invalid token lengths", () => {
    const secret = "synthetic-test-transport-secret-not-runtime-000";
    for (const token of ["a", "a".repeat(43), "a".repeat(128)]) expect(signedProxyHeaders("127.0.0.1", "GET", `/api/shared-tower-plans/${token}`, secret) !== null).toBe(true);
    for (const path of [root.toUpperCase(), root + "?x=1", root + "/extra", "/api/shared-tower-plans/" + "a".repeat(129), "/api/shared-tower-plans/%61", "/api/shared-tower-plans/a/b"]) expect(towerShareRoute(path, "GET")).toBeNull();
    expect(towerShareRoute(root, "POST")).toBe("private"); expect(towerShareRoute(`${root}/${id}`, "DELETE")).toBe("private"); expect(towerShareRoute("/api/shared-tower-plans/a", "POST")).toBeNull();
  });
  it("strips public session/authorization/CSRF and maps errors without exposing upstream body", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "synthetic-test-transport-secret-not-runtime-000");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ detail: "PRIVATE_SENTINEL" }, { status: 404 })); vi.stubGlobal("fetch", fetcher);
    const response = await towerShareProxy(new Request("http://127.0.0.1:3000/api/shared-tower-plans/short", { headers: { "X-UJ-Socket-IP": "127.0.0.1", Cookie: "private", Authorization: "private", "X-CSRF-Token": "private" } }));
    expect(response.status).toBe(404); expect(fetcher).toHaveBeenCalledTimes(1);
    const headers = new Headers(fetcher.mock.calls[0][1]?.headers); for (const name of ["Cookie", "Authorization", "X-CSRF-Token"]) expect(headers.has(name)).toBe(false);
    expect(headers.has("X-UJ-Proxy-Signature")).toBe(true); expect((await response.text()).includes("PRIVATE_SENTINEL")).toBe(false); expect(response.headers.get("Cache-Control")).toContain("no-store"); expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect((await towerShareProxy(new Request("http://127.0.0.1:3000/api/shared-tower-plans/a?x=1"))).status).toBe(404); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("caps response bytes before JSON parsing and renders all coverage/unknowns without private lookup", async () => {
    await expect(boundedShareJSON(new Response("x".repeat(1025)), 1024)).rejects.toThrow("Share response unavailable");
    const data = parsePublicTowerShare(syntheticPublicShare()), html = renderToStaticMarkup(<PublicTowerShareView data={data} />);
    expect(html).toContain("Total desconocido / incompleto"); expect(html).toContain("ARS 900.719.925.474.099.300,19"); expect(html).toContain("Datos"); expect(html).toContain("T12"); expect(html).toContain("Detalles retenidos: 2"); expect(html).toContain("No tengo (declarado)");
    const management = renderToStaticMarkup(<TowerShareManager planId={id} />); expect(management).toContain("No hay vista previa exacta"); expect(management).not.toContain('checked=""'); expect(management).not.toContain("Enlace recién creado");
  });
  it("keeps past quote/stock as historical without a current-clock freshness claim", () => {
    const source = syntheticPublicShare();
    const quote = { amount: "123.45", currency: "ARS", condition: "cash", availability_at_quote: "unknown", quoted_at: "2020-01-01T10:00:00Z", expires_at: "2020-01-02T10:00:00Z", references: [], notice: "Cotización histórica, sin garantía de precio/stock actual", quote_ref: "q1", component_ref: "p1" };
    const raw = { ...source, stages: [{ ...source.stages[0], offers: [quote] }] };
    const html = renderToStaticMarkup(<PublicTowerShareView data={parsePublicTowerShare(raw)} />);
    expect(html).toContain("Cotización histórica, sin garantía de precio/stock actual"); expect(html).toContain("2020-01-02"); expect(html).toContain("No se comprueba stock actual"); expect(html).not.toContain("Cotización vigente");
    expect(() => parsePublicTowerShare({ ...raw, stages: [{ ...raw.stages[0], offers: [{ ...quote, amount: "0.00" }] }] })).toThrow();
  });
});
