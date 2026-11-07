// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, unmountAll, click, button } from "./support/dom";
import { renderToStaticMarkup } from "react-dom/server";
import { parseCreatedShare, parsePublicTowerShare, parseShareList, shareCreateInput } from "../../lib/tower-share-dto";
import { boundedShareJSON, towerShareProxy, towerShareRoute } from "../../lib/tower-share-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
import { shareCreateUncertain, shareStateLabel, TowerShareError } from "../../lib/tower-share-client";
import PublicTowerShareView from "../../components/public-tower-share-view";
import TowerShareManager from "../../components/tower-share-manager";
import SharedNotFound from "../../app/shared-tower-plans/[token]/not-found";
import { syntheticPublicShare } from "../support/tower-share-fixture";

afterEach(async () => { await unmountAll(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const id = "12345678-1234-1234-1234-123456789abc", root = `/api/tower-plans/${id}/shares`, now = "2026-10-26T10:00:00Z";
const meta = { id, plan_revision: 1, title: "Plan de mejora de torre", projection_version: "tower-share-projection-1", created_at: now, revoked_at: null };
describe("CU09 tower shares: synthetic unit data, not real API evidence", () => {
  it("offers a way home for an unavailable link without a private lookup", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const html = renderToStaticMarkup(<SharedNotFound />);
    expect(html).toContain('href="/"'); expect(html).toContain("Ir al inicio"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps the newly created token only in local response state and never recovers it on reopening", async () => {
    const bearer = "a".repeat(43), storage = vi.spyOn(Storage.prototype, "setItem"), cookie = vi.spyOn(document, "cookie", "set");
    let created = false;
    vi.stubGlobal("fetch", vi.fn(async (path: string, init?: RequestInit) => {
      if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
      if (init?.method === "POST") { created = true; return Response.json({ ...meta, token: bearer }, { status: 201 }); }
      if (path === root) return Response.json({ items: created ? [{ ...meta, effective_state: "active" }] : [] });
      return Response.json({ kind: "tower_plan", id, revision: 1 });
    }));
    const host = await mount(<TowerShareManager planId={id} />);
    await click(host.querySelector('input[type="checkbox"]'));
    await click(button(host, "Crear enlace público una vez"));
    expect(host.querySelector<HTMLInputElement>('input[readonly]')?.value).toContain(bearer);
    expect(storage).not.toHaveBeenCalled(); expect(cookie).not.toHaveBeenCalled();
    await unmountAll();
    const reopened = await mount(<TowerShareManager planId={id} />);
    expect(reopened.innerHTML).not.toContain(bearer); expect(button(reopened, /Copiar/)).toBeNull();
  });
  it("invalidates consent when switching links and Cancelar never revokes", async () => {
    const second = "22345678-1234-1234-1234-123456789abc";
    const fetcher = vi.fn(async (path: string, init?: RequestInit) => { if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" }); if (init?.method === "DELETE") return new Response(null, { status: 204 }); return Response.json(path === root ? { items: [meta, { ...meta, id: second }].map(item => ({ ...item, effective_state: "active" })) } : { kind: "tower_plan", id, revision: 1 }); });
    vi.stubGlobal("fetch", fetcher);
    const host = await mount(<TowerShareManager planId={id} />);
    await click(button(host, "Preparar revocación del enlace 1"));
    await click(host.querySelector('form[aria-label="Confirmar revocación de torre"] input'));
    await click(button(host, "Preparar revocación del enlace 2"));
    expect(host.querySelector<HTMLInputElement>('form[aria-label="Confirmar revocación de torre"] input')?.checked).toBe(false);
    expect(button(host, "Revocar enlace")?.disabled).toBe(true);
    await click(button(host, "Cancelar revocación"));
    expect(host.querySelector('form[aria-label="Confirmar revocación de torre"]')).toBeNull();
    expect(fetcher.mock.calls.every(call => call.length === 1 || (call[1] as RequestInit)?.method !== "DELETE")).toBe(true);
    await click(button(host, "Preparar revocación del enlace 2"));
    await click(host.querySelector('form[aria-label="Confirmar revocación de torre"] input'));
    await click(button(host, "Revocar enlace"));
    const deletes = fetcher.mock.calls.filter(call => call[1]?.method === "DELETE");
    expect(deletes).toHaveLength(1); expect(deletes[0][0]).toBe(`${root}/${second}`);
    expect(JSON.parse(String(deletes[0][1]?.body))).toEqual({ expected_plan_revision: 1 });
  });
  it("places the historical evidence reservation beside the main state", () => {
    const data = parsePublicTowerShare(syntheticPublicShare());
    data.stages[0].evaluation.verdict = "compatible";
    const html = renderToStaticMarkup(<PublicTowerShareView data={data} />);
    expect(html).toContain('aria-label="Estado de esta copia"');
    expect(html).toContain("no confirma compatibilidad actual");
    expect(html).toContain("Encajaba según la evaluación guardada");
    expect(html).not.toContain("Ya la tiene");
  });
  it("un plan bloqueado se muestra como no confirmado, nunca como No encaja, y no expone códigos técnicos", () => {
    const data = parsePublicTowerShare(syntheticPublicShare());
    data.status = "blocked" as typeof data.status;
    data.stages[0].status = "blocked" as typeof data.stages[0]["status"];
    data.stages[0].evaluation.verdict = "requiere_verificacion";
    data.stages[0].evaluation.rule_results = [];
    data.stages[0].evaluation.coverage.failed = [];
    data.missing_fields = [{ code: "public_evidence_withheld", count: 2 }] as typeof data.missing_fields;
    const html = renderToStaticMarkup(<PublicTowerShareView data={data} />);
    expect(html).toContain("No se pudo confirmar");
    expect(html).toContain("Resultado guardado: Falta un dato");
    expect(html).not.toContain("No encaja");
    expect(html).toContain("Evidencia pública reservada: 2 datos.");
    expect(html).not.toContain("public_evidence_withheld");
  });
  it("el resumen público de cada comprobación usa nombres humanos y deja los códigos dentro del detalle", () => {
    const data = parsePublicTowerShare(syntheticPublicShare());
    const rule = data.stages[0].evaluation.rule_results[0];
    expect(rule).toBeDefined();
    rule.rule_id = "T01";
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<PublicTowerShareView data={data} />);
    const summaries = [...host.querySelectorAll("summary")].map(item => item.textContent ?? "").join("\n");
    expect(summaries).not.toContain("T01"); expect(summaries).not.toContain("Cobertura");
    expect(summaries).toContain("Procesador y placa"); expect(summaries).toContain("Detalle de lo comprobado");
    expect(host.textContent).not.toContain("Cobertura"); expect(host.textContent).toContain("Qué pudimos comprobar");
    const detail = [...host.querySelectorAll("details")].find(item => item.querySelector(":scope > summary")?.textContent?.includes("Procesador y placa"));
    expect(detail?.textContent).not.toContain("Código interno");
  });
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
