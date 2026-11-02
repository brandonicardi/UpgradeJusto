import { afterEach, describe, expect, it, vi } from "vitest";
import { towerRecommendationsProxy } from "../../lib/tower-recommendations-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
const id = "12345678-1234-1234-1234-123456789ABC";
function input(body: BodyInit = "{}", query = "") { return new Request(`http://localhost/api/towers/${id}/recommendations/preview${query}`, { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", "X-CSRF-Token": "synthetic", Cookie: "synthetic" }, body, duplex: "half" } as RequestInit); }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("CU06 BFF cerrado y lector37", () => {
  it("firma POST path literal, no GET/PUT/query/UUID inválido ni identity headers arbitrarios", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const request = vi.fn().mockResolvedValue(Response.json({ items: [] })); vi.stubGlobal("fetch", request);
    const path = `/api/towers/${id}/recommendations/preview`;
    expect(signedProxyHeaders("127.0.0.1", "POST", path, "s".repeat(32))).not.toBeNull();
    for (const method of ["GET", "PUT", "DELETE"]) expect(signedProxyHeaders("127.0.0.1", method, path, "s".repeat(32))).toBeNull();
    expect((await towerRecommendationsProxy(input("{}", "?owner_id=other"), id)).status).toBe(422); expect((await towerRecommendationsProxy(input(), "../pcs")).status).toBe(422);
    expect((await towerRecommendationsProxy(input(), id)).status).toBe(200);
    const [url, options] = request.mock.calls[0]; expect(String(url)).toContain(id); expect(options.method).toBe("POST"); expect(options.headers.get("Origin")).toBe("http://127.0.0.1:3000"); expect(options.headers.get("X-CSRF-Token")).toBe("synthetic"); expect(options.headers.has("Authorization")).toBe(false);
    expect(options.headers.get("X-UJ-Proxy-Signature")).toBe(signedProxyHeaders("127.0.0.1", "POST", path, "s".repeat(32), Number(options.headers.get("X-UJ-Proxy-Timestamp")) * 1000)!["X-UJ-Proxy-Signature"]); expect(request).toHaveBeenCalledTimes(1);
  });
  it("262144 bytes/5s abortan antes de upstream; errores sanitizados y429 RetryAfter", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await towerRecommendationsProxy(input("x".repeat(262145)), id)).status).toBe(413);
    vi.useFakeTimers(); const pending = towerRecommendationsProxy(input(new ReadableStream<Uint8Array>()), id); await vi.advanceTimersByTimeAsync(5001); expect((await pending).status).toBe(408); expect(request).not.toHaveBeenCalled(); vi.useRealTimers();
    request.mockResolvedValue(Response.json({ detail: "private data" }, { status: 429, headers: { "Retry-After": "12" } }));
    const response = await towerRecommendationsProxy(input(), id); expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("12"); expect(await response.text()).not.toContain("private data");
  });
});
