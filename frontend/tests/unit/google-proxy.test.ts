import { afterEach, describe, expect, it, vi } from "vitest";
import { googleProxy } from "../../lib/google-proxy";
import { signedProxyHeaders } from "../../lib/gateway";

const id = "12345678-1234-1234-1234-123456789abc";
function input(action: "config" | "attempts" | "signin", body?: string) {
  const path = action === "signin" ? "/api/auth/google" : `/api/auth/google/${action}`;
  return new Request(`http://127.0.0.1:3000${path}`, { method: action === "config" ? "GET" : "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", "X-CSRF-Token": "synthetic-csrf", "Content-Type": "application/json", Cookie: "synthetic-only" }, body });
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("closed Google proxy37, synthetic requests only", () => {
  it("signs only the three accepted Google paths/methods", () => {
    for (const [path, method] of [["/api/auth/google/config", "GET"], ["/api/auth/google/attempts", "POST"], ["/api/auth/google", "POST"]]) expect(signedProxyHeaders("127.0.0.1", method, path, "s".repeat(32))).not.toBeNull();
    for (const [path, method] of [["/api/auth/google/config", "POST"], ["/api/auth/google/attempts", "GET"], ["/api/auth/google", "GET"], ["/api/auth/google", "DELETE"], ["/api/auth/google/redirect", "POST"]]) expect(signedProxyHeaders("127.0.0.1", method, path, "s".repeat(32))).toBeNull();
  });
  it("requires trusted socket, rejects queries and extra identity/token fields before forwarding", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await googleProxy(new Request("http://localhost/api/auth/google/config"), "config")).status).toBe(503);
    expect((await googleProxy(new Request("http://localhost/api/auth/google/config?email=other"), "config")).status).toBe(422);
    for (const body of [{ attempt_id: id, credential: "synthetic", email: "synthetic@example.test" }, { attempt_id: id, credential: "synthetic", user_id: id }, { attempt_id: id, credential: "synthetic", token_type: "id" }, { attempt_id: "bad", credential: "synthetic" }]) expect((await googleProxy(input("signin", JSON.stringify(body)), "signin")).status).toBe(422);
    expect((await googleProxy(input("attempts", '{"nonce":"client-decided"}'), "attempts")).status).toBe(422);
    expect(request).not.toHaveBeenCalled();
  });
  it.each([undefined, "{}"])("accepts only an empty attempt body or object (%s)", async body => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    const request = vi.fn().mockResolvedValue(Response.json({ attempt_id: id, nonce: "synthetic", expires_at: "2026-10-26T12:00:00Z", private_field: "hidden" })); vi.stubGlobal("fetch", request);
    const response = await googleProxy(input("attempts", body), "attempts");
    expect(response.status).toBe(200); expect(await response.json()).not.toHaveProperty("private_field");
    const sent = request.mock.calls[0][1];
    expect(sent.headers.get("Origin")).toBe("http://127.0.0.1:3000"); expect(sent.headers.get("X-CSRF-Token")).toBe("synthetic-csrf"); expect(sent.headers.has("X-UJ-Proxy-Signature")).toBe(true);
    expect(sent.redirect).toBe("error");
  });
  it("preserves rotated cookies and closed nullable public profile without retaining tokens", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id, email: null, auth_provider: "google", display_name: "Synthetic", credential: "must-not-reflect", roles: ["admin"] }, { headers: { "Set-Cookie": "synthetic-rotation=1; HttpOnly; SameSite=Strict" } })));
    const response = await googleProxy(input("signin", JSON.stringify({ attempt_id: id, credential: "synthetic-not-real" })), "signin");
    expect(response.status).toBe(200); expect(response.headers.has("Set-Cookie")).toBe(true);
    const user = await response.json(); expect(user.email).toBeNull(); expect(user.auth_provider).toBe("google"); expect(user).not.toHaveProperty("credential"); expect(user).not.toHaveProperty("roles");
  });
  it("sanitizes upstream failures and preserves numeric Retry-After", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ detail: "private verifier details" }, { status: 429, headers: { "Retry-After": "42" } })));
    const response = await googleProxy(input("attempts", "{}"), "attempts");
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("42"); expect(await response.text()).not.toContain("private verifier details");
  });
  it("enforces auth8192 bytes and absolute5s body deadline before fetch", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32)); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await googleProxy(input("signin", "x".repeat(8193)), "signin")).status).toBe(413);
    vi.useFakeTimers();
    const slow = new Request("http://localhost/api/auth/google", { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1" }, body: new ReadableStream<Uint8Array>(), duplex: "half" } as RequestInit);
    const result = googleProxy(slow, "signin");
    const assertion = expect(result.then(response => response.status)).resolves.toBe(408);
    await vi.advanceTimersByTimeAsync(5001); await assertion; expect(request).not.toHaveBeenCalled();
  });
});
