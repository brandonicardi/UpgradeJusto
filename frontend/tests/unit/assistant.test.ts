import { afterEach, describe, expect, it, vi } from "vitest";
import { SSEParser, readAssistantStream, citationText, messageInput, AssistantError, streamErrorText } from "../../lib/assistant";
import { assistantProxy } from "../../lib/assistant-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
import { readFileSync } from "node:fs";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("mensajes de error del chat", () => {
  it("provider_rate_limited se muestra como asistente ocupado", () => {
    expect(streamErrorText({ code: "provider_rate_limited", retryable: false })).toBe("El asistente está ocupado. Probá de nuevo en un minuto.");
  });
  it("otros códigos o datos inválidos usan el mensaje general", () => {
    for (const data of [{ code: "generation_failed", retryable: false }, { code: "round_limit" }, {}, { code: 5 }]) {
      const text = streamErrorText(data);
      expect(text).toContain("El turno falló");
      expect(text).not.toContain("ocupado");
    }
  });
});
describe("CU08 I framing y fronteras aisladas, no sustituyen LIVE", () => {
  it("SSE soporta fragmentación, CRLF, comentarios y múltiples líneas data", () => {
    const parser = new SSEParser();
    expect(parser.push(": heartbeat\r")).toEqual([]);
    expect(parser.push('\nevent: delta\r\ndata: {"text":\r\n')).toEqual([]);
    const frames = parser.push('data: "ñ"}\r\n\r\nevent: done\ndata: {"status":"completed"}\n\n');
    expect(frames.map(frame => frame.type)).toEqual(["delta", "done"]); expect(frames[0].data.text).toBe("ñ"); expect(parser.incomplete).toBe(false);
  });
  it("SSE rechaza JSON/tipos desconocidos/límites sin imprimir contenido", () => {
    for (const input of ['event: delta\ndata: invalid\n\n', 'event: private_arguments\ndata: {}\n\n', 'event: delta\ndata: []\n\n', "x".repeat(131073)]) expect(() => new SSEParser().push(input)).toThrow();
    const parser = new SSEParser(); parser.push('event: delta\ndata: {"text":"partial"}'); expect(parser.incomplete).toBe(true);
  });
  it("stream UTF8 incremental no convierte EOF/error/aborto en éxito", async () => {
    const bytes = new TextEncoder().encode('event: delta\ndata: {"text":"ñ"}\n\nevent: done\ndata: {"status":"completed"}\n\n');
    const body = new ReadableStream<Uint8Array>({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
    const text: string[] = [];
    expect(await readAssistantStream(body, event => { if (event.type === "delta") text.push(String(event.data.text)); }, new AbortController().signal)).toBe("completed");
    expect(text).toEqual(["ñ"]);
    const stream = (text: string) => new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close(); } });
    expect(await readAssistantStream(stream('event: delta\ndata: {"text":"partial"}\n\n'), () => {}, new AbortController().signal)).toBe("interrupted");
    expect(await readAssistantStream(stream('event: error\ndata: {"code":"unit_failure"}\n\nevent: done\ndata: {"status":"completed"}\n\n'), () => {}, new AbortController().signal)).toBe("failed");
    const abort = new AbortController(); abort.abort();
    expect(await readAssistantStream(stream(""), () => {}, abort.signal)).toBe("interrupted");
  });
  it("citas nunca habilitan protocolos/hosts/rutas privados y entrada conserva UUID", () => {
    const citation = { source_id: "unit-public-source", title: "unit", locator: "page 1", excerpt: "public unit fixture", url: "https://www.kingston.com/public.pdf" };
    expect(citationText(citation)?.url).toBe(citation.url);
    for (const url of ["javascript:alert(1)", "file:///private", "http://127.0.0.1/", "https://localhost/", "https://example.test/", "https://user:password@example.com/", "https://example.com/api/conversations/uuid", "https://example.com/shared/capability"]) expect(citationText({ ...citation, url })).toBeNull();
    const id = "11111111-1111-1111-1111-111111111111";
    expect(messageInput(" hello ", id)).toEqual({ content: "hello", client_request_id: id });
    expect(() => messageInput("", id)).toThrow(); expect(() => messageInput("hello", "bad")).toThrow();
    expect(new AssistantError(409).message).toContain("no se reenviará");
  });
  it("gateway métodos/rutas cerrados y query validada antes del backend", async () => {
    const id = "11111111-1111-1111-1111-111111111111", root = "/api/conversations", detail = `${root}/${id}`, fixture = "synthetic-unit-fixture-not-runtime-secret";
    for (const [path, methods] of [[root, ["GET", "POST"]], [detail, ["GET", "DELETE"]], [detail + "/messages", ["GET", "POST"]]] as const) for (const method of methods) expect(signedProxyHeaders("127.0.0.1", method, path, fixture)).not.toBeNull();
    for (const [method, path] of [["PUT", detail], ["POST", detail], ["DELETE", root], ["GET", detail + "/tools"], ["GET", detail + "/messages?owner="], ["POST", detail + "/messages/retry"]]) expect(signedProxyHeaders("127.0.0.1", method, path, fixture)).toBeNull();
    for (const query of ["?owner=", "?page=", "?page=1&page=2", "?page_size=51"]) expect((await assistantProxy(new Request("http://127.0.0.1:3000/api/conversations" + query))).status).toBe(422);
    expect((await assistantProxy(new Request("http://127.0.0.1:3000/", { method: "PUT" }), id)).status).toBe(405);
    expect((await assistantProxy(new Request("http://127.0.0.1:3000/"), "invalid")).status).toBe(422);
  });
  it("proxy entrega primer chunk antes del cierre y conserva cancelación/no-store", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "synthetic-unit-fixture-not-runtime-secret");
    let cancelled = false;
    const upstream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('event: start\ndata: {}\n\n')); }, cancel() { cancelled = true; } });
    const fakeFetch = vi.fn(async () => new Response(upstream, { headers: { "Content-Type": "text/event-stream" } }));
    vi.stubGlobal("fetch", fakeFetch);
    const id = "11111111-1111-1111-1111-111111111111";
    const response = await assistantProxy(new Request(`http://127.0.0.1:3000/api/conversations/${id}/messages`, { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", Cookie: "unit-cookie-not-runtime", "X-CSRF-Token": "unit-csrf-not-runtime" }, body: "{}" }), id, true);
    expect(response.status).toBe(200); expect(response.headers.get("x-accel-buffering")).toBe("no"); expect(response.headers.get("cache-control")).toContain("no-store");
    const reader = response.body!.getReader(); expect((await reader.read()).value?.length).toBeGreaterThan(0); await reader.cancel(); expect(cancelled).toBe(true);
  });
  it("LIVE separado no sustituye auth ni pasa sin activación explícita", () => {
    const config = readFileSync(new URL("../../playwright.live.config.ts", import.meta.url), "utf8");
    expect(config).toContain('testDir: "./tests/live"'); expect(config).toContain('process.env.UJ_TEST_ASSISTANT_LIVE !== "1"'); expect(config).toContain("throw new Error");
    const auth = readFileSync(new URL("../e2e/auth.spec.ts", import.meta.url), "utf8"); expect(auth).not.toContain("UJ_TEST_ASSISTANT_LIVE");
  });
});
