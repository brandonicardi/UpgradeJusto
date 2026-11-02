import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyTower, type Tower } from "../../lib/towers";
import { towerCompatibilityRequest, towerResultLabel, towerSimulationInput, type TowerAction, type TowerEvaluation } from "../../lib/tower-compatibility";
import { towerCompatibilityProxy } from "../../lib/tower-compatibility-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
import TowerEvaluationView from "../../app/pcs/tower-evaluation-view";

const id = "12345678-1234-1234-1234-123456789abc", lineId = "12345678-1234-1234-1234-123456789abd";
function pc(): Tower { return { ...emptyTower(), id, revision: 3, origin_schema: 2, name: "Synthetic", category_status: { ...emptyTower().category_status, ram: "present" }, lines: [{ line_id: lineId, category: "ram", component_id: "saved-after50", declared_model: null, quantity: 2 }] }; }
function action(): TowerAction { return { action: "replace_category", category: "ram", line_id: null, candidates: [{ component_id: "real-reference-beyond50", declared_model: null, quantity: 4 }] }; }
function evaluation(): TowerEvaluation {
  return { verdict: "incompatible", rule_results: [{ rule_id: "T01", family: "CPU", state: "fail", facts: ["Synthetic known failure"], evidence: [], conditions: [], missing_fields: [] }, { rule_id: "T08", family: "Storage", state: "unknown", facts: [], evidence: [], conditions: [], missing_fields: ["Synthetic missing storage model"] }], missing_fields: ["Synthetic missing storage model"], rules_version: "cu05-tower-stock-engine-1", data_revision: "synthetic", pc_revision: 3, scope: { id: "cu05-tower-stock-1", policy_version: "tower-stock-policy-1", inventory_version: "tower-stock-inventory-1", label: "Torre stock", operating_regime: "stock_no_oc", excludes: ["Synthetic advanced geometry exclusion"] }, coverage: { required: 12, implemented: 12, evaluated: 2, passed: 0, failed: 1, unknown: 1, not_applicable: 10, not_implemented: 0, complete: false }, additional_checks: [], warnings: [], evaluated_configuration: pc() };
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("torre CU05: payload y presentación sin decisiones cliente", () => {
  it("RAM sustituye todo el conjunto, sin filtrar ID por primeras50 ni enviar UUID candidata/evidencia", () => {
    const original = pc(), snapshot = JSON.stringify(original);
    const result = towerSimulationInput(original, [action()]);
    expect(result.expected_pc_revision).toBe(3); expect(result.actions[0].action).toBe("replace_category");
    expect(result.actions[0].candidates).toEqual([{ component_id: "real-reference-beyond50", declared_model: null, quantity: 4 }]);
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(() => towerSimulationInput(original, [{ ...action(), action: "add_line" }])).toThrow();
    expect(() => towerSimulationInput(original, [{ ...action(), candidates: [{ component_id: "a", declared_model: "b", quantity: 1 }] }])).toThrow();
    expect(result).not.toHaveProperty("scope"); expect(result.actions[0].candidates[0]).not.toHaveProperty("line_id");
  });
  it("valida línea propia/categoría, cantidades y secuencia acumulada; no admite targeting de línea retirada", () => {
    const original = pc(); original.lines[0].category = "storage"; original.category_status.ram = "unknown"; original.category_status.storage = "present";
    const remove: TowerAction = { action: "remove_line", category: "storage", line_id: lineId, candidates: [] };
    expect(towerSimulationInput(original, [remove]).actions[0].candidates).toEqual([]);
    expect(() => towerSimulationInput(original, [remove, remove])).toThrow();
    expect(() => towerSimulationInput(original, [{ ...remove, line_id: id }])).toThrow();
    expect(() => towerSimulationInput(original, [{ ...remove, category: "fan" }])).toThrow();
    expect(() => towerSimulationInput(original, [{ action: "add_line", category: "fan", line_id: null, candidates: [{ component_id: null, declared_model: "Synthetic", quantity: 33 }] }])).toThrow();
    expect(() => towerSimulationInput(pc(), [{ ...action(), candidates: [{ component_id: "a", declared_model: null, quantity: 17 }] }])).toThrow();
  });
  it("reemplazar placa envía BIOS null explícito, nunca la hereda", () => {
    const original = pc(); original.context.bios_version = "old-declaration";
    const result = towerSimulationInput(original, [{ ...action(), category: "motherboard", candidates: [{ component_id: "board-reference", declared_model: null, quantity: 1 }] }]);
    expect(result.actions[0].candidate_context).toEqual({ bios_version: null }); expect(original.context.bios_version).toBe("old-declaration");
    expect(() => towerSimulationInput(original, [{ ...action(), candidate_context: { bios_version: null } }])).toThrow();
  });
  it("conserva incompatibilidad y faltantes simultáneos con cobertura/exclusiones visibles", () => {
    const result = evaluation(), html = renderToStaticMarkup(<TowerEvaluationView result={result} />);
    expect(html).toContain("Hay incompatibilidades"); expect(html).toContain("Synthetic missing storage model");
    expect(html).toContain("Cobertura incompleta"); expect(html).toContain("Synthetic advanced geometry exclusion");
    expect(html).toContain("no guardó cambios"); expect(html).toContain("cu05-tower-stock-engine-1");
    expect(towerResultLabel({ ...result, verdict: "compatible" })).not.toMatch(/^Compatible/);
  });
  it("firma únicamente POSTevaluate/simulate con path literal, nunca GET/query/otras operaciones", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    for (const method of ["GET", "PUT", "DELETE"]) expect(signedProxyHeaders("127.0.0.1", method, `/api/towers/${id}/evaluate`, "s".repeat(32))).toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "POST", `/api/towers/${id}/recommend`, "s".repeat(32))).toBeNull();
    const upstream = vi.fn().mockResolvedValue(Response.json(evaluation())); vi.stubGlobal("fetch", upstream);
    const uppercase = id.toUpperCase();
    const response = await towerCompatibilityProxy(new Request(`http://localhost/api/towers/${uppercase}/evaluate`, { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", "X-CSRF-Token": "synthetic" }, body: '{"expected_pc_revision":3}' }), uppercase, "evaluate");
    expect(response.status).toBe(200); expect(String(upstream.mock.calls[0][0])).toContain(uppercase);
    const headers = upstream.mock.calls[0][1].headers as Headers;
    expect(headers.get("Origin")).toBe("http://127.0.0.1:3000"); expect(headers.get("X-CSRF-Token")).toBe("synthetic");
    expect(headers.get("X-UJ-Proxy-Signature")).toBe(signedProxyHeaders("127.0.0.1", "POST", `/api/towers/${uppercase}/evaluate`, "s".repeat(32), Number(headers.get("X-UJ-Proxy-Timestamp")) * 1000)!["X-UJ-Proxy-Signature"]);
    expect((await towerCompatibilityProxy(new Request("http://localhost/?owner_id=other", { method: "POST" }), id, "simulate")).status).toBe(422);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it("limita cuerpo262144/5s y conserva409 sin reflejar datos privados", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    const request = (body: BodyInit) => new Request(`http://localhost/api/towers/${id}/simulate`, { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1" }, body, duplex: "half" } as RequestInit);
    expect((await towerCompatibilityProxy(request("x".repeat(262145)), id, "simulate")).status).toBe(413);
    vi.useFakeTimers(); const pending = towerCompatibilityProxy(request(new ReadableStream<Uint8Array>()), id, "simulate");
    await vi.advanceTimersByTimeAsync(5001); expect((await pending).status).toBe(408); expect(upstream).not.toHaveBeenCalled(); vi.useRealTimers();
    upstream.mockResolvedValue(Response.json({ detail: "private" }, { status: 409 }));
    const response = await towerCompatibilityProxy(request("{}"), id, "simulate"); expect(response.status).toBe(409); expect(await response.text()).not.toContain("private");
  });
  it("cliente sólo POST consulta; no PUT/guardado, y conserva propuesta ante409", async () => {
    const input = towerSimulationInput(pc(), [action()]), snapshot = JSON.stringify(input);
    const request = vi.fn().mockResolvedValueOnce(Response.json({ csrf_token: "synthetic" })).mockResolvedValueOnce(Response.json(evaluation())); vi.stubGlobal("fetch", request);
    await towerCompatibilityRequest(pc(), "simulate", input, new AbortController().signal);
    expect(request.mock.calls[1][0]).toBe(`/api/towers/${id}/simulate`); expect(request.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual(input); expect(JSON.stringify(input)).toBe(snapshot);
    request.mockResolvedValueOnce(Response.json({ csrf_token: "synthetic" })).mockResolvedValueOnce(Response.json({}, { status: 409 }));
    await expect(towerCompatibilityRequest(pc(), "simulate", input, new AbortController().signal)).rejects.toThrow("no se borró"); expect(JSON.stringify(input)).toBe(snapshot);
  });
});
