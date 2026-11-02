import { describe, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { classifyShareTarget, createShareRequestListener, shareBoundaryHeaders, testShareServerControl } from "../../lib/share-server-boundary";

// Pure injected request/response fixtures, NOT actual Next logging evidence.
function responseFixture() {
  const headers: Record<string, string> = {}; let status = 0, body = "", sent = false;
  const response = { get headersSent() { return sent; }, setHeader(name: string, value: string) { headers[name] = value; }, writeHead(code: number, values: Record<string, string>) { status = code; Object.assign(headers, values); sent = true; }, end(value: string) { body = value; sent = true; }, destroy: vi.fn() };
  return { response: response as unknown as ServerResponse, headers, status: () => status, body: () => body };
}
describe("share custom server boundary (synthetic injection)", () => {
  it("classifies encoded prefixes/dot aliases without modifying targets or unrelated routes", () => {
    for (const raw of ["/shared-tower-plans/a", "/api/shared-tower-plans/short", "/api/shared-tower-plans/" + "a".repeat(128)]) expect(classifyShareTarget(raw)).toMatchObject({ publicShare: true, canonical: true });
    for (const raw of ["/shared-tower-plans/%61", "/%73hared-tower-plans/a", "/%61pi/shared-tower-plans/a", "/api/%73hared-tower-plans/a", "/api%2Fshared-tower-plans/a", "/x/../shared-tower-plans/a", "/x/%2e%2e/shared-tower-plans/a", "/shared-tower-plans/a?x=1", "/shared-tower-plans/a/extra", "/shared-tower-plans/" + "a".repeat(129)]) expect(classifyShareTarget(raw)).toMatchObject({ publicShare: true, canonical: false });
    for (const raw of ["/shared/legacy", "/catalog?q=%20", "/docs/shared-tower-plans/a", "/api/towers"]) expect(classifyShareTarget(raw).publicShare).toBe(false);
  });
  it("puts all share headers on stamp-failure503 with fixed body, no target reflection", async () => {
    const request = { url: "/api/shared-tower-plans/SYNTHETIC_CAPABILITY", method: "GET" } as IncomingMessage, fixture = responseFixture(), stamp = vi.fn<(request: IncomingMessage) => boolean>(() => false), handle = vi.fn();
    const runtime = createShareRequestListener(handle, stamp); runtime.listener(request, fixture.response); await runtime.drain();
    expect(stamp.mock.calls[0]?.[0] === request).toBe(true); expect(handle).not.toHaveBeenCalled(); expect(fixture.status()).toBe(503);
    expect(fixture.headers).toMatchObject(shareBoundaryHeaders); expect(fixture.body()).toBe('{"detail":"Service unavailable"}'); expect(fixture.body().includes("SYNTHETIC")).toBe(false);
  });
  it("covers handle rejection beforeheaders without exception reflection", async () => {
    const fixture = responseFixture(), runtime = createShareRequestListener(async (_request, response) => { expect(fixture.headers).toMatchObject(shareBoundaryHeaders); expect(response === fixture.response).toBe(true); throw new Error("PRIVATE_SYNTHETIC_SENTINEL"); }, () => true);
    runtime.listener({ url: "/shared-tower-plans/a", method: "GET" } as IncomingMessage, fixture.response); await runtime.drain();
    expect(fixture.status()).toBe(503); expect(fixture.body().includes("PRIVATE")).toBe(false); expect(fixture.headers).toMatchObject(shareBoundaryHeaders);
  });
  it("rejects aliases before Next, but forwards canonical short invalid bearers for backend budget", async () => {
    const handle = vi.fn(), runtime = createShareRequestListener(handle, () => true), bad = responseFixture();
    const raw = "/%73hared-tower-plans/a"; const request = { url: raw, method: "GET" } as IncomingMessage;
    runtime.listener(request, bad.response); await runtime.drain(); expect(bad.status()).toBe(404); expect(bad.headers).toMatchObject(shareBoundaryHeaders); expect(handle).not.toHaveBeenCalled(); expect(request.url).toBe(raw);
    runtime.listener({ url: "/api/shared-tower-plans/a", method: "GET" } as IncomingMessage, responseFixture().response); await runtime.drain(); expect(handle).toHaveBeenCalledTimes(1);
  });
  it("does not add share headers to unrelated outer503 and drains unfinished handler promises", async () => {
    const other = responseFixture(), failure = createShareRequestListener(() => {}, () => false); failure.listener({ url: "/catalog", method: "GET" } as IncomingMessage, other.response); await failure.drain(); expect(other.headers["X-Robots-Tag"]).toBeUndefined();
    let finish!: () => void; const work = new Promise<void>(resolve => { finish = resolve; }), runtime = createShareRequestListener(() => work, () => true);
    runtime.listener({ url: "/shared-tower-plans/a", method: "GET" } as IncomingMessage, responseFixture().response); expect(runtime.pending()).toBe(1); finish(); await runtime.drain(); expect(runtime.pending()).toBe(0);
  });
  it("TEST control is off by default and fails closed before resources unless DB matches", () => {
    expect(testShareServerControl({})).toBe(false); expect(testShareServerControl({ UJ_TEST_SHARE_SERVER_CONTROL: "0" })).toBe(false);
    for (const env of [{ UJ_TEST_SHARE_SERVER_CONTROL: "bad" }, { UJ_TEST_SHARE_SERVER_CONTROL: "1" }, { UJ_TEST_SHARE_SERVER_CONTROL: "1", UJ_ENV: "production" }, { UJ_TEST_SHARE_SERVER_CONTROL: "1", UJ_ENV: "test", DATABASE_URL: "synthetic-a", TEST_DATABASE_URL: "synthetic-b" }]) expect(() => testShareServerControl(env)).toThrow("Share TEST control unavailable");
    expect(testShareServerControl({ UJ_TEST_SHARE_SERVER_CONTROL: "1", UJ_ENV: "test", DATABASE_URL: "synthetic", TEST_DATABASE_URL: "synthetic" })).toBe(true);
  });
});
