export const REQUEST_BODY_LIMITS = Object.freeze({ json: 262144, auth: 8192, assistantMessage: 32768, extract: 65536 } as const);
export const REQUEST_BODY_TIMEOUT_MS = 5000;
type BodyLimit = (typeof REQUEST_BODY_LIMITS)[keyof typeof REQUEST_BODY_LIMITS];

export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 408 | 413) { super("Request body rejected"); }
}

// One absolute deadline, one bounded byte buffer, no dependence on Content-Length.
// Cancellation is deliberately not awaited: an underlying cancel hook can stall.
export async function readRequestBody(request: Request, limit: BodyLimit = REQUEST_BODY_LIMITS.json): Promise<string> {
  const deadline = performance.now() + REQUEST_BODY_TIMEOUT_MS;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    if (!Object.values(REQUEST_BODY_LIMITS).includes(limit)) throw new RequestBodyError(400);
    if (request.signal.aborted) throw new RequestBodyError(408);
    const declared = request.headers.get("Content-Length");
    if (declared !== null) {
      if (!/^\d+$/.test(declared)) throw new RequestBodyError(400);
      if (Number(declared) > limit) throw new RequestBodyError(413);
    }
    if (!request.body) return "";
    reader = request.body.getReader();
    const bytes = new Uint8Array(limit);
    let size = 0;
    const interrupted = new Promise<never>((_, reject) => {
      const rejectRead = () => reject(new RequestBodyError(408));
      onAbort = rejectRead;
      request.signal.addEventListener("abort", rejectRead, { once: true });
      timer = setTimeout(rejectRead, Math.max(0, deadline - performance.now()));
      if (request.signal.aborted) rejectRead();
    });
    const consume = async () => {
      while (true) {
        if (request.signal.aborted || performance.now() >= deadline) throw new RequestBodyError(408);
        const chunk = await reader!.read();
        if (performance.now() >= deadline) throw new RequestBodyError(408);
        if (chunk.done) break;
        if (!(chunk.value instanceof Uint8Array)) throw new RequestBodyError(400);
        if (chunk.value.byteLength > limit - size) throw new RequestBodyError(413);
        bytes.set(chunk.value, size); size += chunk.value.byteLength;
      }
      try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)); }
      catch { throw new RequestBodyError(400); }
    };
    // A single race avoids attaching an unbounded number of deadline handlers
    // when the client sends a great many one-byte chunks.
    return await Promise.race([consume(), interrupted]);
  } catch (error) {
    const safe = error instanceof RequestBodyError ? error : new RequestBodyError(request.signal.aborted ? 408 : 400);
    if (reader) void reader.cancel(safe).catch(() => undefined);
    else if (request.body && !request.body.locked) void request.body.cancel(safe).catch(() => undefined);
    throw safe;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (onAbort) request.signal.removeEventListener("abort", onAbort);
    reader?.releaseLock();
  }
}
