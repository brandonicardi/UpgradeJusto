import { afterEach, describe, expect, it, vi } from "vitest";
import { readRequestBody, RequestBodyError, REQUEST_BODY_LIMITS, REQUEST_BODY_TIMEOUT_MS } from "../../lib/request-body";

function request(body: ReadableStream<Uint8Array>, headers: HeadersInit = {}, signal?: AbortSignal) {
  return new Request("http://127.0.0.1:3000/api/pcs", { method: "POST", body, headers, signal, duplex: "half" } as RequestInit & { duplex: "half" });
}
function stream(chunks: Uint8Array[], close = true, cancel = vi.fn()) {
  return { body: new ReadableStream<Uint8Array>({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); if (close) controller.close(); }, cancel }), cancel };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("lector acotado de bytes reales, no persistencia ni backend simulado", () => {
  it("expone contrato cerrado sin timeout configurable por cliente", () => {
    expect(REQUEST_BODY_LIMITS).toEqual({ json: 262144, auth: 8192, assistantMessage: 32768, extract: 65536 });
    expect(Object.isFrozen(REQUEST_BODY_LIMITS)).toBe(true); expect(REQUEST_BODY_TIMEOUT_MS).toBe(5000);
  });
  it("reconstruye UTF8 multibyte dividido entre chunks sin Content-Length", async () => {
    const text = '{"text":"á🙂ñ"}', encoded = new TextEncoder().encode(text);
    const source = stream([...encoded].map(byte => new Uint8Array([byte])));
    const input = request(source.body);
    expect(input.headers.has("Content-Length")).toBe(false);
    expect(await readRequestBody(input, REQUEST_BODY_LIMITS.auth)).toBe(text);
    expect(input.body!.locked).toBe(false);
  });
  it.each([REQUEST_BODY_LIMITS.auth, REQUEST_BODY_LIMITS.assistantMessage, REQUEST_BODY_LIMITS.extract, REQUEST_BODY_LIMITS.json])("acepta exactamente %i bytes y rechaza un byte real adicional", async limit => {
    const exact = new Uint8Array(limit).fill(97);
    expect((await readRequestBody(request(stream([exact]).body), limit)).length).toBe(limit);
    const oversized = stream([exact, new Uint8Array([97])], false);
    const input = request(oversized.body);
    await expect(readRequestBody(input, limit)).rejects.toMatchObject({ status: 413, message: "Request body rejected" });
    expect(oversized.cancel).toHaveBeenCalledOnce(); expect(input.body!.locked).toBe(false);
  });
  it("no confunde caracteres con bytes ni confía en Content-Length reducido", async () => {
    const source = stream([new TextEncoder().encode("🙂".repeat(REQUEST_BODY_LIMITS.auth / 4)), new Uint8Array([97])], false);
    await expect(readRequestBody(request(source.body, { "Content-Length": "1" }), REQUEST_BODY_LIMITS.auth)).rejects.toMatchObject({ status: 413 });
    expect(source.cancel).toHaveBeenCalledOnce();
  });
  it.each(["-1", "1.5", "1e3", "1,2", "not-a-length"])("rechaza Content-Length mal formado sin reflejarlo", async declared => {
    const source = stream([], false);
    await expect(readRequestBody(request(source.body, { "Content-Length": declared }))).rejects.toMatchObject({ status: 400, message: "Request body rejected" });
    expect(source.cancel).toHaveBeenCalledOnce();
  });
  it("rechaza anticipadamente el tamaño declarado, incluso sin cuerpo", async () => {
    const source = stream([], false);
    await expect(readRequestBody(request(source.body, { "Content-Length": "262145" }))).rejects.toMatchObject({ status: 413 });
    expect(source.cancel).toHaveBeenCalledOnce();
    await expect(readRequestBody(new Request("http://127.0.0.1/", { method: "POST", headers: { "Content-Length": "99999999999999999999999999999" } }))).rejects.toMatchObject({ status: 413 });
  });
  it.each([[0xc3], [0xc3, 0x28], [0xff]])("rechaza UTF8 inválido o truncado", async (...bytes) => {
    const input = request(stream([new Uint8Array(bytes)]).body);
    await expect(readRequestBody(input)).rejects.toBeInstanceOf(RequestBodyError);
    expect(input.body!.locked).toBe(false);
  });
  it("deadline total de5000ms no se renueva con actividad y cancel no bloquea salida", async () => {
    vi.useFakeTimers();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const input = request(new ReadableStream<Uint8Array>({ start(value) { controller = value; }, cancel }));
    const pending = readRequestBody(input);
    const rejected = expect(pending).rejects.toMatchObject({ status: 408 });
    for (let i = 0; i < 4; i++) { await vi.advanceTimersByTimeAsync(1000); controller.enqueue(new Uint8Array([97])); await Promise.resolve(); }
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000); await rejected;
    expect(cancel).toHaveBeenCalledOnce(); expect(input.body!.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("comprueba plazo también durante secuencias de chunks vacíos ya disponibles", async () => {
    let now = 0; vi.spyOn(performance, "now").mockImplementation(() => now += 1000);
    const cancel = vi.fn();
    const input = request(new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(0)); }, cancel }));
    await expect(readRequestBody(input)).rejects.toMatchObject({ status: 408 });
    expect(cancel).toHaveBeenCalledOnce(); expect(input.body!.locked).toBe(false);
  });
  it("aborto cancela y libera sin propagar reason sensible", async () => {
    const controller = new AbortController(), source = stream([], false);
    const input = request(source.body, {}, controller.signal), pending = readRequestBody(input);
    const rejected = expect(pending).rejects.toMatchObject({ status: 408, message: "Request body rejected" });
    controller.abort(new Error("synthetic-private-abort-reason")); await rejected;
    expect(source.cancel).toHaveBeenCalledOnce();
    expect(source.cancel.mock.calls[0][0]).toMatchObject({ status: 408, message: "Request body rejected" });
    expect(input.body!.locked).toBe(false);
  });
  it("aborto previo y stream fallido se normalizan", async () => {
    const aborted = new AbortController(); aborted.abort("synthetic-private-reason");
    const source = stream([], false); await expect(readRequestBody(request(source.body, {}, aborted.signal))).rejects.toMatchObject({ status: 408 });
    const failed = request(new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("synthetic-private-stream-error")); } }));
    await expect(readRequestBody(failed)).rejects.toMatchObject({ status: 400, message: "Request body rejected" });
    expect(failed.body!.locked).toBe(false);
  });
});
