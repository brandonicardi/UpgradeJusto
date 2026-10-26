import { request } from "node:http";
import { describe, expect, it } from "vitest";
import { allowedProxyTarget, createSocketProxy } from "../support/socket-proxy";

describe("fixture proxy cerrado, aislado, sin backend simulado final", () => {
  it("admite solo authority/puerto/protocolo exactos sin credenciales", () => {
    expect(allowedProxyTarget("http://127.0.0.1:3000/api/auth/csrf", "127.0.0.1:3000")?.pathname).toBe("/api/auth/csrf");
    for (const target of ["http://example.test/", "https://127.0.0.1:3000/", "http://127.0.0.1:8000/", "http://user:fixture@127.0.0.1:3000/", "http://localhost:3000/", "http://127.0.0.1:3000.evil/", "/api/auth/csrf", "http://127.0.0.1:3000/#fragment"]) expect(allowedProxyTarget(target, "127.0.0.1:3000")).toBeNull();
    expect(allowedProxyTarget("http://127.0.0.1:3000/", "example.test")).toBeNull();
  });
  it("rechaza destinos ajenos/CONNECT/upgrade y cierra recursos propios", async () => {
    const proxy = await createSocketProxy();
    const send = (method: string, path: string, upgrade = false) => new Promise<number>((resolve, reject) => {
      const req = request(proxy.server, { method, path, headers: { Host: "127.0.0.1:3000", ...(upgrade ? { Connection: "Upgrade", Upgrade: "websocket" } : {}) } }, response => { response.resume(); resolve(response.statusCode ?? 0); });
      req.on("connect", (response, socket) => { socket.destroy(); resolve(response.statusCode ?? 0); });
      req.on("error", () => reject(new Error("Closed proxy test request failed")));
      req.setTimeout(3000, () => req.destroy(new Error("Closed proxy test timeout")));
      req.end();
    });
    try {
      expect(await send("GET", "http://example.test/")).toBe(403);
      expect(await send("CONNECT", "127.0.0.1:3000")).toBe(405);
      expect(await send("GET", "http://127.0.0.1:3000/", true)).toBe(405);
      expect(await send("GET", "http://127.0.0.1:3000/_next/webpack-hmr", true)).toBe(405);
      expect(proxy.stats.rejectedApplicationConnect).toBe(1);
      expect(proxy.stats.rejectedOtherConnect).toBe(0);
      expect(proxy.stats.rejectedOtherUpgrade).toBe(1);
      expect(proxy.stats.rejectedHmrUpgrade).toBe(1);
      expect(proxy.stats.forwarded).toBe(0);
    } finally { await proxy.close(); }
    expect(proxy.stats.closed).toBe(true);
    await proxy.close(); // Idempotent teardown, no process-wide kill.
  });
});
