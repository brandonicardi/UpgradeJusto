import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { POST as authProxy } from "../../app/api/auth/[action]/route";
import { assistantProxy } from "../../lib/assistant-proxy";
import { pcsProxy } from "../../lib/pcs-proxy";
import { compatibilityProxy } from "../../lib/compatibility-proxy";
import { recommendationsProxy } from "../../lib/recommendations-proxy";
import { plansProxy } from "../../lib/plans-proxy";
import { sharesProxy, publicShareProxy } from "../../lib/shares-proxy";
import { curationProxy } from "../../lib/curation-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
import { REQUEST_BODY_LIMITS, REQUEST_BODY_TIMEOUT_MS } from "../../lib/request-body";
import { retryAfterHeaders } from "../../lib/retry-after";
import { AssistantError } from "../../lib/assistant";

const id = "11111111-1111-4111-8111-111111111111";
const secret = "synthetic-unit-fixture-not-runtime-secret";
const cases = [
  { name: "auth", path: "/api/auth/login", limit: REQUEST_BODY_LIMITS.auth, run: (request: Request) => authProxy(request, { params: Promise.resolve({ action: "login" }) }) },
  { name: "assistant-message", path: `/api/conversations/${id}/messages`, limit: REQUEST_BODY_LIMITS.assistantMessage, run: (request: Request) => assistantProxy(request, id, true), streaming: true },
  { name: "assistant-create", path: "/api/conversations", limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => assistantProxy(request) },
  { name: "pcs", path: "/api/pcs", limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => pcsProxy(request) },
  { name: "compatibility", path: `/api/pcs/${id}/compatibility/evaluate`, limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => compatibilityProxy(request, id, "evaluate") },
  { name: "recommendations", path: `/api/pcs/${id}/recommendations/preview`, limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => recommendationsProxy(request, id) },
  { name: "plans", path: "/api/plans", limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => plansProxy(request) },
  { name: "shares", path: `/api/plans/${id}/shares`, limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => sharesProxy(request, id) },
  { name: "extract", path: "/api/pcs/extract", limit: REQUEST_BODY_LIMITS.extract, run: (request: Request) => curationProxy(request, "/api/pcs/extract") },
  { name: "extract-confirm", path: "/api/pcs/extract/confirm", limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => curationProxy(request, "/api/pcs/extract/confirm") },
  { name: "admin", path: "/api/admin/revisions", limit: REQUEST_BODY_LIMITS.json, run: (request: Request) => curationProxy(request, "/api/admin/revisions") },
];
function input(path: string, body: BodyInit, headers: HeadersInit = {}, signal?: AbortSignal) {
  const all = new Headers(headers);
  for (const [key, value] of Object.entries({ "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", Cookie: "unit-cookie-not-runtime", "Content-Type": "application/json", "X-CSRF-Token": "unit-csrf-not-runtime", Forwarded: "for=192.0.2.1", Authorization: "Bearer unit-untrusted", "X-UJ-Client-IP": "192.0.2.2", "X-UJ-Proxy-Signature": "unit-forged" })) all.set(key, value);
  return new Request(`http://127.0.0.1:3000${path}`, { method: "POST", body, headers: all, signal, duplex: "half" } as RequestInit & { duplex: "half" });
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("fronteras de cuerpos proxy, fixtures unitarias no sustituyen backend real", () => {
  function lastRead(signal?: AbortSignal) {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    let ready!: () => void;
    const awaitingEOF = new Promise<void>(resolve => { ready = resolve; });
    const body = new ReadableStream<Uint8Array>({
      start(value) { controller = value; controller.enqueue(new TextEncoder().encode("{}")); },
      pull() { ready(); },
    });
    return { request: input("/api/pcs", body, {}, signal), controller, awaitingEOF };
  }
  it("EOF después del deadline devuelve408 sin forward ni rechazo no manejado", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let now = 0; vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubEnv("UJ_PROXY_SECRET", secret);
    const upstream = vi.fn(async () => Response.json({ ok: true })); vi.stubGlobal("fetch", upstream);
    let unhandled = 0; const observeUnhandled = () => { unhandled++; };
    process.on("unhandledRejection", observeUnhandled);
    try {
      const source = lastRead(), pending = pcsProxy(source.request);
      await source.awaitingEOF; await Promise.resolve();
      now = REQUEST_BODY_TIMEOUT_MS + 1;
      // Do not advance the timeout callback: prove the post-read clock check.
      source.controller.close();
      const response = await pending;
      expect(response.status).toBe(408); expect(upstream).not.toHaveBeenCalled();
      expect(source.request.body!.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(unhandled).toBe(0);
    } finally { process.removeListener("unhandledRejection", observeUnhandled); }
  });
  it.each(["abort-first", "eof-first"] as const)("aborto coincidente con EOF (%s) devuelve408 sin forward ni rechazo no manejado", async order => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let now = 0; vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubEnv("UJ_PROXY_SECRET", secret);
    const upstream = vi.fn(async () => Response.json({ ok: true })); vi.stubGlobal("fetch", upstream);
    let unhandled = 0; const observeUnhandled = () => { unhandled++; };
    process.on("unhandledRejection", observeUnhandled);
    try {
      const abort = new AbortController(), source = lastRead(abort.signal), pending = pcsProxy(source.request);
      await source.awaitingEOF; await Promise.resolve();
      now = REQUEST_BODY_TIMEOUT_MS - 1;
      if (order === "abort-first") { abort.abort("synthetic-private-last-read-reason"); source.controller.close(); }
      else { source.controller.close(); abort.abort("synthetic-private-last-read-reason"); }
      const response = await pending;
      expect(response.status).toBe(408); expect(upstream).not.toHaveBeenCalled();
      expect(await response.text()).not.toContain("synthetic-private-last-read-reason");
      expect(source.request.body!.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(unhandled).toBe(0);
    } finally { process.removeListener("unhandledRejection", observeUnhandled); }
  });
  it.each(cases)("$name: bytes sinCL+1 se cancelan antes del fetch", async item => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    const cancel = vi.fn(), body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(item.limit).fill(97)); controller.enqueue(new Uint8Array([97])); }, cancel });
    const request = input(item.path, body), response = await item.run(request);
    expect(response.status).toBe(413); expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(upstream).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce(); expect(request.body!.locked).toBe(false);
  });
  it.each(cases)("$name: mantiene firma/Origin/CSRF y señal sin cabeceras de identidad falsas", async item => {
    vi.stubEnv("UJ_PROXY_SECRET", secret);
    const upstream = vi.fn(async () => item.streaming ? new Response('event: done\ndata: {"status":"completed"}\n\n', { headers: { "Content-Type": "text/event-stream" } }) : Response.json({ id: "unit", email: "unit@example.test", ok: true }, { headers: { "Set-Cookie": "session=unit-fixture; HttpOnly" } }));
    vi.stubGlobal("fetch", upstream);
    const abort = new AbortController(), response = await item.run(input(item.path, '{"text":"á🙂"}', {}, abort.signal));
    expect(response.status).toBe(200); expect(upstream).toHaveBeenCalledOnce();
    const options = (upstream.mock.calls as unknown as [unknown, RequestInit][])[0][1], headers = new Headers(options.headers);
    expect(options.body).toBe('{"text":"á🙂"}'); expect(options.redirect).toBe("error");
    for (const [key, value] of [["Origin", "http://127.0.0.1:3000"], ["Cookie", "unit-cookie-not-runtime"], ["X-CSRF-Token", "unit-csrf-not-runtime"]]) expect(headers.get(key)).toBe(value);
    expect(headers.get("Forwarded")).toBeNull(); expect(headers.get("Authorization")).toBeNull();
    const expected = signedProxyHeaders("127.0.0.1", "POST", item.path, secret, Number(headers.get("X-UJ-Proxy-Timestamp")) * 1000)!;
    expect(headers.get("X-UJ-Proxy-Signature")).toBe(expected["X-UJ-Proxy-Signature"]);
    expect(headers.get("X-UJ-Client-IP")).toBe(expected["X-UJ-Client-IP"]);
    expect(options.signal?.aborted).toBe(false); abort.abort(); expect(options.signal?.aborted).toBe(true);
    await response.body?.cancel();
  });
  it.each(cases)("$name: lectura lenta termina408, cancela y no reenvía", async item => {
    vi.useFakeTimers(); vi.stubEnv("UJ_PROXY_SECRET", secret);
    const upstream = vi.fn(); vi.stubGlobal("fetch", upstream); const cancel = vi.fn(() => new Promise<void>(() => {}));
    const request = input(item.path, new ReadableStream<Uint8Array>({ cancel }));
    const pending = item.run(request); await vi.advanceTimersByTimeAsync(5000);
    expect((await pending).status).toBe(408); expect(upstream).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce(); expect(request.body!.locked).toBe(false);
  });
  it.each(cases)("$name: conserva429/Retry-After, sin reflejar payload de error", async item => {
    vi.stubEnv("UJ_PROXY_SECRET", secret);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ detail: "unit-private-upstream-marker" }, { status: 429, headers: { "Retry-After": "17" } })));
    const response = await item.run(input(item.path, "{}"));
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("17");
    expect(await response.text()).not.toContain("unit-private-upstream-marker");
  });
  it("auth y assistant rechazan CL anticipado, UTF8 inválido y abortos sin fetch", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    for (const item of cases.slice(0, 2)) {
      expect((await item.run(input(item.path, "{}", { "Content-Length": String(item.limit + 1) }))).status).toBe(413);
      expect((await item.run(input(item.path, "{}", { "Content-Length": "-1" }))).status).toBe(400);
      expect((await item.run(input(item.path, new Uint8Array([0xff])))).status).toBe(400);
      const controller = new AbortController(); controller.abort("unit-private-reason");
      expect((await item.run(input(item.path, "{}", {}, controller.signal))).status).toBe(408);
    }
    expect(upstream).not.toHaveBeenCalled();
  });
  it("público conserva429 sin propagar cookies ni capacidad en errores", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", secret);
    const upstream = vi.fn(async () => Response.json({ detail: "unit-private-marker" }, { status: 429, headers: { "Retry-After": "12" } }));
    vi.stubGlobal("fetch", upstream);
    const response = await publicShareProxy(new Request("http://127.0.0.1:3000/", { headers: { "X-UJ-Socket-IP": "127.0.0.1", Cookie: "unit-private-cookie" } }), "a".repeat(43));
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("12");
    expect(await response.text()).not.toContain("unit-private-marker");
    const options = (upstream.mock.calls as unknown as [unknown, RequestInit][])[0][1];
    expect(options.credentials).toBe("omit"); expect(new Headers(options.headers).get("Cookie")).toBeNull();
  });
  it("cuota cliente es legible; Retry-After sólo acepta segundos/HTTP-date conocidos", () => {
    expect(new AssistantError(429, "17").message).toContain("17 segundos");
    expect(new AssistantError(429, "unit-private-value").message).not.toContain("unit-private-value");
    expect(retryAfterHeaders(429, "Mon, 26 Oct 2026 10:00:00 GMT")).toEqual({ "Retry-After": "Mon, 26 Oct 2026 10:00:00 GMT" });
    expect(retryAfterHeaders(429, "unit-private-value")).toEqual({}); expect(retryAfterHeaders(400, "17")).toEqual({});
  });
  it("ninguna frontera de entrada usa Request.text() sin límites", () => {
    for (const file of ["app/api/auth/[action]/route.ts", ...["assistant", "pcs", "compatibility", "recommendations", "plans", "shares", "curation"].map(name => `lib/${name}-proxy.ts`)]) {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      expect(source).toContain("await readRequestBody(request"); expect(source).not.toMatch(/request\.text\s*\(/);
    }
  });
});
