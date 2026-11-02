import type { Page } from "@playwright/test";

export type StreamCounters = { responses: number; reads: number; startEvents: number; deltaEvents: number; nonEmptyDeltaEvents: number; toolEvents: number; getStarted: number; getCompleted: number; getFailed: number; evaluateStarted: number; evaluateCompleted: number; evaluateFailed: number; generationFailed: number; roundLimit: number; toolOutputLimit: number; historyUnavailable: number; otherErrors: number; citationEvents: number; doneEvents: number; errorEvents: number; invalidFrames: number; terminalCompleted: number; firstDeltaRead: number; firstDoneRead: number; deltaBeforeDone: number };

export function safeStreamSnapshot(value: unknown) {
  const counters = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const numeric = (key: string): number => typeof counters[key] === "number" && Number.isSafeInteger(counters[key]) && (counters[key] as number) >= 0 ? counters[key] as number : 0;
  const errorEnum = numeric("generationFailed") ? "generation_failed" : numeric("roundLimit") ? "round_limit" : numeric("toolOutputLimit") ? "tool_output_limit_full_api_required" : numeric("historyUnavailable") ? "history_unavailable" : numeric("errorEvents") ? "other" : null;
  return Object.freeze({ responses: numeric("responses"), reads: numeric("reads"), startEvents: numeric("startEvents"), nonEmptyDeltaEvents: numeric("nonEmptyDeltaEvents"), doneEvents: numeric("doneEvents"), errorEvents: numeric("errorEvents"), invalidFrames: numeric("invalidFrames"), terminalCompleted: numeric("terminalCompleted"), getStarted: numeric("getStarted"), getCompleted: numeric("getCompleted"), getFailed: numeric("getFailed"), evaluateStarted: numeric("evaluateStarted"), evaluateCompleted: numeric("evaluateCompleted"), evaluateFailed: numeric("evaluateFailed"), deltaBeforeDone: numeric("deltaBeforeDone"), error_enum: errorEnum });
}

// Browser observes real bytes in the same TransformStream; no replay, mocks,
// splitting, secondary consumer, delayed forwarding or payload archive/logging.
export async function observeRealStream(page: Page) {
  await page.addInitScript(installAssistantStreamObserver);
}
// Self-contained browser installer, also exercised with synthetic byte frames in
// unit tests. No provider request is needed to verify this exact bounded parser.
export function installAssistantStreamObserver() {
    const counters: StreamCounters = { responses: 0, reads: 0, startEvents: 0, deltaEvents: 0, nonEmptyDeltaEvents: 0, toolEvents: 0, getStarted: 0, getCompleted: 0, getFailed: 0, evaluateStarted: 0, evaluateCompleted: 0, evaluateFailed: 0, generationFailed: 0, roundLimit: 0, toolOutputLimit: 0, historyUnavailable: 0, otherErrors: 0, citationEvents: 0, doneEvents: 0, errorEvents: 0, invalidFrames: 0, terminalCompleted: 0, firstDeltaRead: 0, firstDoneRead: 0, deltaBeforeDone: 0 };
    Object.defineProperty(window, "__ujLiveStreamCounters", { value: counters, writable: false, configurable: false });
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method !== "POST" || url.origin !== location.origin || !/^\/api\/conversations\/[0-9a-f-]{36}\/messages$/i.test(url.pathname) || response.status !== 200 || !response.body || !response.headers.get("Content-Type")?.startsWith("text/event-stream")) return response;
      if (++counters.responses !== 1) return response;
      let line = "", eventType = "", data = "", dataLines = 0, frameSize = 0, previousCR = false, observing = true;
      const decoder = new TextDecoder();
      const dispatch = () => {
        if (!dataLines) { eventType = ""; frameSize = 0; return; }
        try {
          const value: unknown = JSON.parse(data);
          if (!value || typeof value !== "object" || Array.isArray(value)) { counters.invalidFrames++; return; }
          const payload = value as Record<string, unknown>;
          const string = (key: string) => typeof payload[key] === "string" && (payload[key] as string).length <= 8000;
          if (eventType === "start" && string("message_id")) counters.startEvents++;
          else if (eventType === "delta" && string("text")) { counters.deltaEvents++; if ((payload.text as string).length) { counters.nonEmptyDeltaEvents++; if (!counters.firstDeltaRead) counters.firstDeltaRead = counters.reads; } }
          else if (eventType === "tool_status" && string("name") && string("status") && !Object.hasOwn(payload, "arguments") && !Object.hasOwn(payload, "args")) {
            counters.toolEvents++;
            if (payload.name === "get_pc") { if (payload.status === "running") counters.getStarted++; if (payload.status === "completed") counters.getCompleted++; if (payload.status === "failed") counters.getFailed++; }
            if (payload.name === "evaluate_pc") { if (payload.status === "running") counters.evaluateStarted++; if (payload.status === "completed") counters.evaluateCompleted++; if (payload.status === "failed") counters.evaluateFailed++; }
          } else if (eventType === "citation" && ["source_id", "url", "title", "locator", "excerpt"].every(string)) { const source = new URL(payload.url as string); if (!["http:", "https:"].includes(source.protocol) || source.username || source.password) counters.invalidFrames++; else counters.citationEvents++; }
          else if (eventType === "done" && ["completed", "failed", "interrupted"].includes(String(payload.status))) { counters.doneEvents++; if (payload.status === "completed") counters.terminalCompleted++; if (!counters.firstDoneRead) counters.firstDoneRead = counters.reads; if (counters.firstDeltaRead && counters.firstDeltaRead < counters.reads) counters.deltaBeforeDone = 1; }
          else if (eventType === "error" && string("code") && typeof payload.retryable === "boolean") { counters.errorEvents++; if (payload.code === "generation_failed") counters.generationFailed++; else if (payload.code === "round_limit") counters.roundLimit++; else if (payload.code === "tool_output_limit_full_api_required") counters.toolOutputLimit++; else if (payload.code === "history_unavailable") counters.historyUnavailable++; else counters.otherErrors++; }
          else counters.invalidFrames++;
        } catch { counters.invalidFrames++; }
        finally { eventType = ""; data = ""; dataLines = 0; frameSize = 0; }
      };
      const finishLine = () => { if (!line) dispatch(); else if (!line.startsWith(":")) { const colon = line.indexOf(":"), field = colon < 0 ? line : line.slice(0, colon), raw = colon < 0 ? "" : line.slice(colon + 1), value = raw.startsWith(" ") ? raw.slice(1) : raw; if (field === "event") eventType = value; if (field === "data") { data += (dataLines ? "\n" : "") + value; dataLines++; } } line = ""; };
      return new Response(response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, output) {
        counters.reads++;
        if (observing) for (const character of decoder.decode(chunk, { stream: true })) {
          if (++frameSize > 131072) { counters.invalidFrames++; observing = false; line = ""; data = ""; eventType = ""; dataLines = 0; break; }
          if (character === "\r") { finishLine(); previousCR = true; continue; }
          if (character === "\n") { if (!previousCR) finishLine(); previousCR = false; continue; }
          previousCR = false; line += character;
        }
        output.enqueue(chunk);
      } })), { status: response.status, statusText: response.statusText, headers: response.headers });
    };
}
