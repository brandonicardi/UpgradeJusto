import { createHmac } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { normalizeIP, signedProxyHeaders, stampSocketIP } from "../../lib/gateway";

describe("gateway unitario, fixture sintética; no integración", () => {
  it.each([
    ["::ffff:127.0.0.1", "127.0.0.1"], ["::ffff:7f00:2", "127.0.0.2"],
    ["2001:0DB8:0:0::1", "2001:db8::1"], ["127.0.0.1", "127.0.0.1"],
    ["127.0.0.1, 127.0.0.2", null], ["fe80::1%eth0", null], [undefined, null],
  ])("normaliza literal %s", (input, expected) => expect(normalizeIP(input)).toBe(expected));
  it("descarta headers falsos y obtiene IP exclusivamente del socket", () => {
    const request = {
      headers: { "x-forwarded-for": "192.0.2.1", forwarded: "for=192.0.2.1", "x-uj-socket-ip": "192.0.2.2", "x-uj-proxy-signature": "fake", origin: "http://127.0.0.1:3000" },
      rawHeaders: ["X-Forwarded-For", "192.0.2.1", "X-UJ-Client-IP", "192.0.2.2", "Origin", "http://127.0.0.1:3000"],
      socket: { remoteAddress: "::ffff:127.0.0.3" },
    } as unknown as IncomingMessage;
    expect(stampSocketIP(request)).toBe(true);
    expect(request.headers).toEqual({ origin: "http://127.0.0.1:3000", "x-uj-socket-ip": "127.0.0.3" });
    expect(request.rawHeaders).toEqual(["Origin", "http://127.0.0.1:3000", "X-UJ-Socket-IP", "127.0.0.3"]);
  });
  it("firma el canon exacto sin newline final, fixture NO secreto runtime", () => {
    const fixture = "synthetic-unit-fixture-not-runtime-secret";
    const headers = signedProxyHeaders("::ffff:127.0.0.2", "POST", "/api/auth/login", fixture, 1700000000000)!;
    expect(headers["X-UJ-Proxy-Timestamp"]).toBe("1700000000");
    expect(headers["X-UJ-Proxy-Signature"]).toBe(createHmac("sha256", fixture).update("1700000000\nPOST\n/api/auth/login\n127.0.0.2").digest("hex"));
  });
  it("falla cerrado sin secreto/IP válida o con query", () => {
    expect(signedProxyHeaders("127.0.0.1", "POST", "/api/auth/login", undefined)).toBeNull();
    expect(signedProxyHeaders("fake", "POST", "/api/auth/login", "x".repeat(32))).toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "POST", "/api/auth/login?q=1", "x".repeat(32))).toBeNull();
  });
});
