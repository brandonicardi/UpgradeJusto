import { afterEach, describe, expect, it, vi } from "vitest";
import { towerPlansProxy } from "../../lib/tower-plans-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
const id = "12345678-1234-1234-1234-123456789abc";
function input(method: string, body?: BodyInit, query = "") { return new Request(`http://localhost/api/tower-plans${query}`, { method, body, headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", "X-CSRF-Token": "synthetic" }, duplex: "half" } as RequestInit); }
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("CU07 BFF37 closed paths", () => {
  it.each([
    { method: "GET", operation: undefined, revision: undefined, suffix: "" },
    { method: "DELETE", operation: undefined, revision: undefined, suffix: "" },
    { method: "POST", operation: "recalculate" as const, revision: undefined, suffix: "/recalculate" },
    { method: "GET", operation: "history" as const, revision: "1", suffix: "/revisions/1" },
  ])("rechaza UUID uppercase sin forward ni firma: $method $suffix", async ({ method, operation, revision, suffix }) => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const request = vi.fn(); vi.stubGlobal("fetch", request);
    const uppercase = id.toUpperCase();
    expect((await towerPlansProxy(input(method, method === "GET" ? undefined : "{}"), uppercase, operation, revision)).status).toBe(422);
    expect(request).not.toHaveBeenCalled();
    expect(signedProxyHeaders("127.0.0.1", method, `/api/tower-plans/${uppercase}${suffix}`, "s".repeat(32))).toBeNull();
    expect(signedProxyHeaders("127.0.0.1", method, `/api/tower-plans/${id}${suffix}`, "s".repeat(32))).not.toBeNull();
  });
  it("root/list bounds canonical, literal paths/CAS/history methods and no arbitrary query", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const request = vi.fn().mockImplementation(async () => Response.json({ kind: "tower_plan", schema_version: 2 })); vi.stubGlobal("fetch", request);
    expect((await towerPlansProxy(input("GET", undefined, "?page=0002&page_size=50"))).status).toBe(200); expect(String(request.mock.calls[0][0])).toContain("page=2&page_size=50");
    expect((await towerPlansProxy(input("GET", undefined, "?owner_id=other"))).status).toBe(422); expect((await towerPlansProxy(input("POST", "{}", "?page=1"))).status).toBe(422);
    expect((await towerPlansProxy(input("PUT", "{}"), id)).status).toBe(405);
    expect((await towerPlansProxy(input("POST", "{}"), id, "recalculate")).status).toBe(200);
    const [url, options] = request.mock.calls[1]; expect(String(url)).toContain(`${id}/recalculate`); expect(options.headers.get("Origin")).toBe("http://127.0.0.1:3000"); expect(options.headers.get("X-CSRF-Token")).toBe("synthetic");
    const path = `/api/tower-plans/${id}/recalculate`; expect(options.headers.get("X-UJ-Proxy-Signature")).toBe(signedProxyHeaders("127.0.0.1", "POST", path, "s".repeat(32), Number(options.headers.get("X-UJ-Proxy-Timestamp")) * 1000)!["X-UJ-Proxy-Signature"]);
    expect((await towerPlansProxy(input("GET"), id, "history", "9999999999")).status).toBe(200); // owner/int32 resolution stays on server.
    for (const revision of ["0", "NaN", "1.1", "../1", "12345678901"]) expect((await towerPlansProxy(input("GET"), id, "history", revision)).status).toBe(422);
    expect(signedProxyHeaders("127.0.0.1", "POST", `/api/tower-plans/${id}/revisions/1`, "s".repeat(32))).toBeNull(); expect(signedProxyHeaders("127.0.0.1", "POST", `/api/tower-plans/${id}/share`, "s".repeat(32))).toBeNull();
  });
  it("body262144/5s including DELETE; no-store/errors/RetryAfter preserved", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await towerPlansProxy(input("DELETE", "x".repeat(262145)), id)).status).toBe(413);
    vi.useFakeTimers(); const pending = towerPlansProxy(input("POST", new ReadableStream<Uint8Array>())); await vi.advanceTimersByTimeAsync(5001); expect((await pending).status).toBe(408); expect(request).not.toHaveBeenCalled(); vi.useRealTimers();
    request.mockResolvedValue(Response.json({ detail: "private" }, { status: 429, headers: { "Retry-After": "12" } })); const response = await towerPlansProxy(input("DELETE", '{"expected_plan_revision":1}'), id); expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("12"); expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(await response.text()).not.toContain("private");
  });
});
