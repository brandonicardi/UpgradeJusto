import { afterEach, describe, expect, it, vi } from "vitest";
import { installAssistantStreamObserver, safeStreamSnapshot, type StreamCounters } from "../support/assistant-live-observer";

afterEach(() => vi.unstubAllGlobals());

// Synthetic SSE byte fixtures only: no backend, credentials or provider call.
async function observe(chunks: string[]) {
  const encoder = new TextEncoder();
  const response = new Response(new ReadableStream<Uint8Array>({ start(controller) { for (const chunk of chunks) controller.enqueue(encoder.encode(chunk)); controller.close(); } }), { headers: { "Content-Type": "text/event-stream" } });
  const browser = { fetch: vi.fn<typeof fetch>().mockResolvedValue(response) };
  vi.stubGlobal("window", browser); vi.stubGlobal("location", { href: "http://127.0.0.1:3000/chat", origin: "http://127.0.0.1:3000" });
  installAssistantStreamObserver();
  const forwarded = await browser.fetch("/api/conversations/12345678-1234-1234-1234-123456789abc/messages", { method: "POST" });
  const text = await forwarded.text();
  const counters = (browser as unknown as { __ujLiveStreamCounters: StreamCounters }).__ujLiveStreamCounters;
  return { snapshot: safeStreamSnapshot(counters), unchanged: text === chunks.join(""), descriptor: Object.getOwnPropertyDescriptor(browser, "__ujLiveStreamCounters") };
}
const frame = (type: string, data: unknown) => `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;

describe("LIVE observer instrumentation, not product LIVE evidence", () => {
  it("preserves bytes while counting split SSE, both tools and delta before done", async () => {
    const start = frame("start", { message_id: "synthetic" });
    const result = await observe([start.slice(0, 9), start.slice(9), frame("delta", { text: "synthetic" }), frame("tool_status", { name: "get_pc", status: "running" }), frame("tool_status", { name: "get_pc", status: "completed" }), frame("tool_status", { name: "evaluate_pc", status: "running" }), frame("tool_status", { name: "evaluate_pc", status: "completed" }), frame("done", { status: "completed" })]);
    expect(result.unchanged).toBe(true); expect(result.descriptor?.writable).toBe(false);
    expect(result.snapshot).toMatchObject({ responses: 1, startEvents: 1, nonEmptyDeltaEvents: 1, doneEvents: 1, terminalCompleted: 1, getStarted: 1, getCompleted: 1, evaluateStarted: 1, evaluateCompleted: 1, deltaBeforeDone: 1, errorEvents: 0, invalidFrames: 0, error_enum: null });
    expect(result.snapshot.reads).toBeGreaterThan(1);
  });
  it("retains only allowlisted error enum, never the raw code or payload", async () => {
    for (const code of ["generation_failed", "round_limit", "tool_output_limit_full_api_required", "history_unavailable", "PRIVATE_SENTINEL"]) {
      const result = await observe([frame("error", { code, retryable: false, private: "PRIVATE_BODY_SENTINEL" }), frame("done", { status: "failed" })]);
      expect(result.unchanged).toBe(true); expect(result.snapshot.errorEvents).toBe(1); expect(result.snapshot.terminalCompleted).toBe(0);
      expect(result.snapshot.error_enum).toBe(code === "PRIVATE_SENTINEL" ? "other" : code);
      expect(JSON.stringify(result.snapshot).includes("PRIVATE")).toBe(false);
    }
  });
  it("counts malformed/oversized frames without changing bytes or archiving contents", async () => {
    for (const chunks of [["event: delta\ndata: invalid\n\n"], ["x".repeat(131073)]]) {
      const result = await observe(chunks); expect(result.unchanged).toBe(true); expect(result.snapshot.invalidFrames).toBe(1); expect(result.snapshot.nonEmptyDeltaEvents).toBe(0); expect(result.snapshot.terminalCompleted).toBe(0);
    }
  });
  it("projects exactly whitelisted numeric keys and safe enum", () => {
    const snapshot = safeStreamSnapshot({ responses: 1, reads: "PRIVATE", errorEvents: 1, otherErrors: 1, raw: "PRIVATE", name: "PRIVATE", invalidFrames: Infinity });
    expect(Object.keys(snapshot).sort()).toEqual(["responses", "reads", "startEvents", "nonEmptyDeltaEvents", "doneEvents", "errorEvents", "invalidFrames", "terminalCompleted", "getStarted", "getCompleted", "getFailed", "evaluateStarted", "evaluateCompleted", "evaluateFailed", "deltaBeforeDone", "error_enum"].sort());
    expect(snapshot.reads).toBe(0); expect(snapshot.invalidFrames).toBe(0); expect(snapshot.error_enum).toBe("other"); expect(JSON.stringify(snapshot).includes("PRIVATE")).toBe(false); expect(Object.isFrozen(snapshot)).toBe(true);
  });
});
