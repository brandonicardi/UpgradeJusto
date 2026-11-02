import { afterEach, describe, expect, it, vi } from "vitest";
import { towerExtractionProxy } from "../../lib/tower-extraction-proxy";
import { signedProxyHeaders } from "../../lib/gateway";

function input(path: string, body: BodyInit = "{}") {
  return new Request(`http://127.0.0.1:3000${path}`, { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", "X-CSRF-Token": "synthetic" }, body, duplex: "half" } as RequestInit);
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("CU02 torre: fronteras cerradas/body37 sin proveedor real", () => {
  it("firma sólo POSTexactextract/confirm; UUIDcrud no captura extract; query rechazada", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    for (const path of ["/api/towers/extract", "/api/towers/extract/confirm"]) {
      expect(signedProxyHeaders("127.0.0.1", "POST", path, "s".repeat(32))).not.toBeNull();
      for (const method of ["GET", "PUT", "DELETE"]) expect(signedProxyHeaders("127.0.0.1", method, path, "s".repeat(32))).toBeNull();
    }
    expect(signedProxyHeaders("127.0.0.1", "POST", "/api/towers/extract/other", "s".repeat(32))).toBeNull();
    expect((await towerExtractionProxy(input("/api/towers/extract?owner_id=other"), "extract")).status).toBe(422);
    expect((await towerExtractionProxy(new Request("http://localhost/api/towers/extract"), "extract")).status).toBe(405); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([["extract", 65536], ["confirm", 262144]] as const)("%s limita bytes y deadline lectura5s sin fetch", async (action, limit) => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const path = action === "extract" ? "/api/towers/extract" : "/api/towers/extract/confirm";
    expect((await towerExtractionProxy(input(path, "x".repeat(limit + 1)), action)).status).toBe(413);
    vi.useFakeTimers(); const pending = towerExtractionProxy(input(path, new ReadableStream<Uint8Array>()), action);
    await vi.advanceTimersByTimeAsync(5001); expect((await pending).status).toBe(408); expect(fetcher).not.toHaveBeenCalled();
  });
  it("mantiene firma/Origin literal/CSRF y RetryAfter con errores sanitizados", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    const fetcher = vi.fn().mockResolvedValue(Response.json({ detail: "private prompt/input" }, { status: 429, headers: { "Retry-After": "12" } })); vi.stubGlobal("fetch", fetcher);
    const response = await towerExtractionProxy(input("/api/towers/extract", '{"text":"hardware sintético"}'), "extract");
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("12"); expect(await response.text()).not.toContain("private prompt");
    const [url, options] = fetcher.mock.calls[0]; expect(String(url)).toContain("/api/towers/extract"); expect(options.headers.get("Origin")).toBe("http://127.0.0.1:3000"); expect(options.headers.get("X-CSRF-Token")).toBe("synthetic"); expect(options.headers.has("X-UJ-Proxy-Signature")).toBe(true); expect(options.redirect).toBe("error");
  });
});
