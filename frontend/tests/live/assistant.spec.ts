import { expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { test } from "../e2e/fixtures";
import { citationText, type Conversation, type Message, type PageOf } from "../../lib/assistant";
import { assertBasic, openBasic, evaluateBasic } from "../support/basic-scope";
import type { PC } from "../../lib/pcs";
import { messageTextFragments, normalizeMessageText } from "../../lib/message-presentation";

type StreamCounters = { responses: number; reads: number; startEvents: number; deltaEvents: number; nonEmptyDeltaEvents: number; toolEvents: number; evaluateStarted: number; evaluateCompleted: number; evaluateFailed: number; generationFailed: number; roundLimit: number; historyUnavailable: number; otherErrors: number; citationEvents: number; doneEvents: number; errorEvents: number; invalidFrames: number; terminalCompleted: number; firstDeltaRead: number; firstDoneRead: number; deltaBeforeDone: number };

// Both this file and the LIVE config disable artifacts before contexts are created.
test.use({ trace: "off", screenshot: "off", video: "off" });
async function login(page: Page) {
  await page.goto("/account");
  const statuses = await page.evaluate(async credentials => {
    const token = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const options = { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(credentials) };
    const register = await fetch("/api/auth/register", options), login = await fetch("/api/auth/login", options);
    return [register.status, login.status];
  }, { email: `chat-live-${randomUUID()}@example.test`, password: randomUUID() });
  expect(statuses).toEqual([201, 200]);
}
async function api(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const token = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = token.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/conversations${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(15000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    if (response.headers.get("content-type")?.startsWith("text/event-stream")) { await response.body?.cancel(); return { status: response.status, data: null }; }
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function pcApi(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = csrf.csrf_token;
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/pcs${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(15000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

test("CU08 final @basic: alcance stock, streaming e historial", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  if (process.env.UJ_TEST_ASSISTANT_LIVE !== "1") throw new Error("LIVE is required; no simulated or skipped success.");
  const ca = await newIsolatedContext(), cb = await newIsolatedContext();
  const a = await ca.newPage(), b = await cb.newPage();
  await observeRealStream(a);
  a.setDefaultTimeout(15000); b.setDefaultTimeout(15000);
  let pcId: string | null = null, conversationId: string | null = null, failed = false;
  try {
    await login(a); await login(b);
    const createdPC = await pcApi(a, "", "POST", {
      name: `Demo motor ${randomUUID()}`,
      components: [
        { category: "cpu", component_id: "P01", quantity: 1 },
        { category: "motherboard", component_id: "P03", quantity: 1 },
        { category: "ram", component_id: "P04", quantity: 2 },
        { category: "gpu", component_id: "P06", quantity: 1 },
        { category: "psu", component_id: "P07", quantity: 1 },
        { category: "case", component_id: "P09", quantity: 1 },
      ], context: { bios_version: "P2.30", notes: null },
    });
    expect(createdPC.status).toBe(201);
    const pc = createdPC.data as PC;
    pcId = pc.id;
    expect(pc.revision).toBe(1);
    const pcDigest = digest(pc);
    // Independent real engine result, never an LLM verdict or a supplied tool result.
    await openBasic(a, pc);
    const evaluated = await evaluateBasic(a, pc);
    assertBasic(evaluated, "compatible");
    expect(evaluated.rule_results).toHaveLength(7);
    expect(evaluated.warnings).toHaveLength(8);
    const evaluation = a.getByRole("main").getByRole("region", { name: "Comprobación de componentes", exact: true });
    await expect(evaluation).toContainText("Compatible para uso sin overclock");
    await evaluation.getByText("Ver comprobación de mi PC", { exact: true }).click();
    const pending = evaluation.getByText("Montaje y condiciones pendientes", { exact: true });
    await pending.click();
    await expect(pending.locator("..").locator(":scope > ul > li")).toHaveCount(8);
    await a.goto("/chat");
    const title = `Final motor ${randomUUID()}`;
    await a.getByLabel("Título de conversación", { exact: true }).fill(title);
    const creating = a.waitForResponse(response => response.url().endsWith("/api/conversations") && response.request().method() === "POST");
    await a.getByRole("button", { name: "Crear conversación privada", exact: true }).click();
    const created = await creating; expect(created.status()).toBe(201);
    conversationId = (await created.json() as Conversation).id;
    const panel = a.getByRole("region", { name: "Conversación seleccionada", exact: true });
    let posts = 0;
    a.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === `/api/conversations/${conversationId}/messages`) posts++; });
    await enterMessage(a, `Usá evaluate_pc con pc_id ${pcId} y expected_pc_revision 1. Evalúa mi PC mediante evaluate_pc y explica la compatibilidad EXCLUSIVAMENTE en alcance básico stock. Menciona advertencias/fuera de alcance; nunca certificación física total. No guardar ni modificar. Es un escenario demo, no hardware físico medido.`);
    const receiving = a.waitForResponse(response => new URL(response.url()).pathname === `/api/conversations/${conversationId}/messages` && response.request().method() === "POST", { timeout: 30000 });
    await panel.getByRole("button", { name: "Enviar turno real", exact: true }).click();
    const response = await receiving;
    if (response.status() !== 200) throw new Error("Final LIVE provider/API blocked before SSE; no fallback or retry.");
    expect(response.headers()["content-type"]?.startsWith("text/event-stream")).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-accel-buffering"]).toBe("no");
    await expect.poll(() => a.evaluate(() => {
      const counters = (window as unknown as { __ujLiveStreamCounters?: StreamCounters }).__ujLiveStreamCounters;
      return (counters?.doneEvents ?? 0) + (counters?.errorEvents ?? 0) + (counters?.invalidFrames ?? 0);
    }), { timeout: 100000, message: "Final real stream must terminate; no payload logging" }).toBeGreaterThan(0);
    const observed = await a.evaluate(() => {
      const counters = (window as unknown as { __ujLiveStreamCounters?: StreamCounters }).__ujLiveStreamCounters;
      return counters ? { ...counters } : null;
    });
    if (!observed || observed.errorEvents || observed.invalidFrames || observed.evaluateFailed || observed.terminalCompleted !== 1) {
      const errorEnum = observed?.generationFailed ? "generation_failed" : observed?.roundLimit ? "round_limit" : observed?.historyUnavailable ? "history_unavailable" : "other";
      // Only fixed phase/whitelisted enum and numeric counters; never SSE payloads.
      throw new Error(`phase=terminal; error_enum=${errorEnum}; counts=${JSON.stringify(observed)}`);
    }
    expect(observed?.responses).toBe(1);
    expect(observed?.reads ?? 0).toBeGreaterThan(1);
    expect(observed?.nonEmptyDeltaEvents ?? 0).toBeGreaterThan(0);
    expect(observed?.startEvents).toBe(1);
    expect(observed?.evaluateStarted ?? 0, "Real evaluate_pc must start; no retry if the provider omits it").toBeGreaterThan(0);
    expect(observed?.evaluateCompleted ?? 0, "Real evaluate_pc must complete").toBeGreaterThan(0);
    expect(observed?.invalidFrames).toBe(0); expect(observed?.errorEvents).toBe(0);
    expect(observed?.doneEvents).toBe(1); expect(observed?.terminalCompleted).toBe(1);
    expect(observed?.deltaBeforeDone).toBe(1);
    await expect(panel.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true })).toBeEnabled({ timeout: 20000 });
    const persisted = await api(a, `/${conversationId}/messages?page=1&page_size=20`);
    expect(persisted.status).toBe(200);
    const messages = persisted.data as PageOf<Message>;
    expect(messages.items.length).toBe(2);
    expect(messages.items.filter(item => item.role === "user").length).toBe(1);
    expect(messages.items.filter(item => item.role === "assistant" && item.status === "completed" && item.content.trim().length > 0).length).toBe(1);
    const completedContent = messages.items.find(item => item.role === "assistant" && item.status === "completed")!.content;
    expect(/b[aá]sic|stock|alcance/i.test(completedContent), "phase=scope-explanation; scoped explanation required").toBe(true);
    expect(/advertenc|adicional|fuera.*alcance|no.*certifica/i.test(completedContent), "phase=scope-warnings; exclusions required").toBe(true);
    await expect.poll(async () => {
      const rendered = await panel.getByRole("region", { name: "Historial persistido", exact: true }).locator(".message-assistant .message-content").last().textContent();
      const plain = normalizeMessageText(rendered ?? "");
      const fragments = messageTextFragments(completedContent);
      return fragments.length > 0 && fragments.every(fragment => plain.includes(fragment));
    }, { message: "All persisted message fragments must render with formatting; bodies suppressed" }).toBe(true);
    // RAG is optional in this turn; any citations actually delivered must be valid.
    for (const message of messages.items) for (const citation of message.citations) expect(citationText(citation) !== null).toBe(true);
    const historyDigest = digest(messages);
    expect((await pcApi(a, `/${pcId}`)).status).toBe(200);
    expect(digest((await pcApi(a, `/${pcId}`)).data) === pcDigest).toBe(true);
    expect((await pcApi(b, `/${pcId}`)).status).toBe(404);
    expect((await api(b, `/${conversationId}`)).status).toBe(404);
    expect((await api(b, `/${conversationId}/messages?page=1&page_size=20`)).status).toBe(404);
    await panel.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true }).click();
    expect(posts).toBe(1);
    await a.reload(); await a.getByRole("button", { name: title, exact: true }).click();
    await expect(panel.getByRole("region", { name: "Historial persistido", exact: true })).toBeVisible();
    expect(digest((await api(a, `/${conversationId}/messages?page=1&page_size=20`)).data) === historyDigest).toBe(true);
    expect(digest((await pcApi(a, `/${pcId}`)).data) === pcDigest).toBe(true);
    await panel.getByRole("button", { name: "Preparar borrado de conversación", exact: true }).click();
    const deletion = panel.getByRole("form", { name: "Confirmar borrado de conversación", exact: true });
    await deletion.getByRole("checkbox").check(); await deletion.getByRole("button", { name: "Eliminar conversación definitivamente", exact: true }).click();
    await expect(a.getByRole("status", { name: "Estado del asistente", exact: true })).toContainText("Conversación eliminada");
    expect((await api(a, `/${conversationId}`)).status).toBe(404); conversationId = null;
    expect((await pcApi(a, `/${pcId}`, "DELETE")).status).toBe(204); pcId = null;
  } catch (error) { failed = true; throw error; }
  finally {
    let cleanupFailed = false;
    try {
      if (conversationId) try { cleanupFailed = ![204, 404].includes((await api(a, `/${conversationId}`, "DELETE")).status) || cleanupFailed; } catch { cleanupFailed = true; }
      if (pcId) try { cleanupFailed = ![204, 404].includes((await pcApi(a, `/${pcId}`, "DELETE")).status) || cleanupFailed; } catch { cleanupFailed = true; }
      if (cleanupFailed && !failed) throw new Error("Own final LIVE resources cleanup failed");
    } finally { await Promise.allSettled([ca.close(), cb.close()]); }
  }
});

async function enterMessage(page: Page, text: string) {
  // Avoid fill(value) call logs with message bodies, including failures.
  await page.getByLabel("Mensaje al asistente", { exact: true }).evaluate((field, value) => {
    if (!(field instanceof HTMLTextAreaElement)) throw new Error("Message field unavailable");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (!setter) throw new Error("Message input unavailable");
    setter.call(field, value); field.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
}

async function observeRealStream(page: Page) {
  await page.addInitScript(() => {
    // Only numeric observations escape this closure. A bounded current frame is
    // parsed transiently for shape validation, then discarded; no payload archive.
    const counters: StreamCounters = { responses: 0, reads: 0, startEvents: 0, deltaEvents: 0, nonEmptyDeltaEvents: 0, toolEvents: 0, evaluateStarted: 0, evaluateCompleted: 0, evaluateFailed: 0, generationFailed: 0, roundLimit: 0, historyUnavailable: 0, otherErrors: 0, citationEvents: 0, doneEvents: 0, errorEvents: 0, invalidFrames: 0, terminalCompleted: 0, firstDeltaRead: 0, firstDoneRead: 0, deltaBeforeDone: 0 };
    (window as unknown as { __ujLiveStreamCounters: typeof counters }).__ujLiveStreamCounters = counters;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      let matches = false;
      try {
        const url = new URL(input instanceof Request ? input.url : String(input), location.href);
        const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
        matches = method === "POST" && url.origin === location.origin && /^\/api\/conversations\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/messages$/i.test(url.pathname);
      } catch { return response; }
      if (!matches || response.status !== 200 || !response.body || !response.headers.get("Content-Type")?.startsWith("text/event-stream")) return response;
      counters.responses++;
      // Observe only the first successful generation in this document. Later
      // idempotency/cancellation calls cannot manufacture its streaming evidence.
      if (counters.responses !== 1) return response;
      let line = "", eventType = "", data = "", dataLines = 0, frameSize = 0, previousCR = 0, observing = true;
      const decoder = new TextDecoder();
      const dispatch = () => {
        if (!dataLines) { eventType = ""; frameSize = 0; return; }
        try {
          const parsed: unknown = JSON.parse(data);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) { counters.invalidFrames++; return; }
          const payload = parsed as Record<string, unknown>;
          const string = (key: string) => typeof payload[key] === "string" && (payload[key] as string).length <= 8000;
          if (eventType === "start" && string("message_id")) counters.startEvents++;
          else if (eventType === "delta" && string("text")) {
            counters.deltaEvents++;
            if ((payload.text as string).length > 0) {
              counters.nonEmptyDeltaEvents++;
              if (!counters.firstDeltaRead) counters.firstDeltaRead = counters.reads;
            }
          } else if (eventType === "tool_status" && string("name") && string("status") && !Object.hasOwn(payload, "arguments") && !Object.hasOwn(payload, "args")) {
            counters.toolEvents++;
            if (payload.name === "evaluate_pc") {
              if (payload.status === "running") counters.evaluateStarted++;
              if (payload.status === "completed") counters.evaluateCompleted++;
              if (payload.status === "failed") counters.evaluateFailed++;
            }
          }
          else if (eventType === "citation" && ["source_id", "url", "title", "locator", "excerpt"].every(string)) {
            const url = new URL(payload.url as string);
            if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) counters.invalidFrames++;
            else counters.citationEvents++;
          } else if (eventType === "done" && ["completed", "failed", "interrupted"].includes(String(payload.status))) {
            counters.doneEvents++;
            if (payload.status === "completed") counters.terminalCompleted++;
            if (!counters.firstDoneRead) counters.firstDoneRead = counters.reads;
            if (counters.firstDeltaRead > 0 && counters.firstDeltaRead < counters.reads) counters.deltaBeforeDone = 1;
          } else if (eventType === "error" && string("code") && typeof payload.retryable === "boolean") {
            counters.errorEvents++;
            if (payload.code === "generation_failed") counters.generationFailed++;
            else if (payload.code === "round_limit") counters.roundLimit++;
            else if (payload.code === "history_unavailable") counters.historyUnavailable++;
            else counters.otherErrors++;
          }
          else counters.invalidFrames++;
        } catch { counters.invalidFrames++; }
        finally { eventType = ""; data = ""; dataLines = 0; frameSize = 0; }
      };
      const finishLine = () => {
        if (!line) dispatch();
        else if (!line.startsWith(":")) {
          const colon = line.indexOf(":"), field = colon < 0 ? line : line.slice(0, colon);
          const raw = colon < 0 ? "" : line.slice(colon + 1), value = raw.startsWith(" ") ? raw.slice(1) : raw;
          if (field === "event") eventType = value;
          if (field === "data") { data += (dataLines ? "\n" : "") + value; dataLines++; }
        }
        line = "";
      };
      const tapped = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, output) {
          counters.reads++;
          if (observing) {
            for (const character of decoder.decode(chunk, { stream: true })) {
              frameSize++;
              if (frameSize > 131072) {
                counters.invalidFrames++; observing = false; line = ""; eventType = ""; data = ""; dataLines = 0; break;
              }
              if (character === "\r") { finishLine(); previousCR = 1; continue; }
              if (character === "\n") { if (!previousCR) finishLine(); previousCR = 0; continue; }
              previousCR = 0; line += character;
            }
          }
          // Same bytes and boundaries, synchronously forwarded. No splitting,
          // tee consumer, sleeps, awaited work or custom queue/backpressure strategy.
          output.enqueue(chunk);
        },
      }));
      return new Response(tapped, { status: response.status, statusText: response.statusText, headers: response.headers });
    };
  });
}

test("CU08 LIVE real: Groq/MCP/RAG/cita, historial privado, UUID409 y cancelación", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  if (process.env.UJ_TEST_ASSISTANT_LIVE !== "1") throw new Error("LIVE is required for this gate; no simulated or skipped success.");
  const ca = await newIsolatedContext(), cb = await newIsolatedContext();
  const a = await ca.newPage(), b = await cb.newPage();
  await observeRealStream(a);
  a.setDefaultTimeout(15000); b.setDefaultTimeout(15000);
  let id: string | null = null, failed = false;
  try {
    await login(a); await login(b);
    await a.goto("/chat");
    const title = `LIVE propia ${randomUUID()}`;
    await a.getByLabel("Título de conversación", { exact: true }).fill(title);
    const creating = a.waitForResponse(response => response.url().endsWith("/api/conversations") && response.request().method() === "POST");
    await a.getByRole("button", { name: "Crear conversación privada", exact: true }).click();
    const created = await creating; expect(created.status()).toBe(201); id = (await created.json() as Conversation).id;
    const panel = a.getByRole("region", { name: "Conversación seleccionada", exact: true });
    let posts = 0;
    a.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === `/api/conversations/${id}/messages`) posts++; });
    const prompt = "Usá la herramienta MCP de búsqueda de documentación pública indexada para recuperar el documento Kingston DDR4. Explicá brevemente un dato documentado, con cita pública, URL y localizador. No inventes fuentes ni apruebes compatibilidad global.";
    await enterMessage(a, prompt);
    const receiving = a.waitForResponse(response => new URL(response.url()).pathname === `/api/conversations/${id}/messages` && response.request().method() === "POST", { timeout: 30000 });
    await panel.getByRole("button", { name: "Enviar turno real", exact: true }).click();
    const response = await receiving;
    if (response.status() !== 200) throw new Error("LIVE provider/API gate blocked before SSE; no fallback or automatic retry.");
    expect(response.headers()["content-type"]?.startsWith("text/event-stream")).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store"); expect(response.headers()["x-accel-buffering"]).toBe("no");
    await expect.poll(async () => {
      const counters = await a.evaluate(() => {
        const value = (window as unknown as { __ujLiveStreamCounters?: StreamCounters }).__ujLiveStreamCounters;
        return value ? { ...value } : null;
      });
      if (counters && (counters.errorEvents || counters.invalidFrames || counters.evaluateFailed)) {
        const errorEnum = counters.generationFailed ? "generation_failed" : counters.roundLimit ? "round_limit" : counters.historyUnavailable ? "history_unavailable" : counters.invalidFrames ? "invalid_frame" : "other";
        throw new Error(`phase=delta; error_enum=${errorEnum}; counts=${JSON.stringify(counters)}`);
      }
      return counters?.nonEmptyDeltaEvents ?? 0;
    }, { timeout: 100000, message: "Real non-empty delta must reach the browser stream; no transient DOM or payload logging" }).toBeGreaterThan(0);
    // Observe the same browser-consumed stream; never re-read it through CDP body().
    await expect.poll(async () => a.evaluate(() => {
      const counters = (window as unknown as { __ujLiveStreamCounters?: StreamCounters }).__ujLiveStreamCounters;
      return (counters?.doneEvents ?? 0) + (counters?.errorEvents ?? 0) + (counters?.invalidFrames ?? 0);
    }), { timeout: 100000, message: "Real SSE must terminate or report a safe error; no CDP body reread" }).toBeGreaterThan(0);
    const observed = await a.evaluate(() => {
      const counters = (window as unknown as { __ujLiveStreamCounters?: StreamCounters }).__ujLiveStreamCounters;
      return counters ? { ...counters } : null;
    });
    expect(observed !== null, "Real browser fetch-stream observation must be installed").toBe(true);
    if (observed && (observed.errorEvents || observed.invalidFrames || observed.evaluateFailed)) {
      const errorEnum = observed.generationFailed ? "generation_failed" : observed.roundLimit ? "round_limit" : observed.historyUnavailable ? "history_unavailable" : observed.invalidFrames ? "invalid_frame" : "other";
      throw new Error(`phase=terminal; error_enum=${errorEnum}; counts=${JSON.stringify(observed)}`);
    }
    expect(observed?.responses).toBe(1);
    expect(observed?.reads ?? 0, "A single buffered read is not incremental streaming evidence").toBeGreaterThan(1);
    expect(observed?.deltaEvents ?? 0).toBeGreaterThan(0);
    expect(observed?.nonEmptyDeltaEvents ?? 0).toBeGreaterThan(0);
    expect(observed?.startEvents).toBe(1);
    expect(observed?.toolEvents ?? 0).toBeGreaterThan(0);
    expect(observed?.citationEvents ?? 0).toBeGreaterThan(0);
    expect(observed?.invalidFrames, "SSE JSON/event shapes must be valid; payloads are not retained").toBe(0);
    expect(observed?.errorEvents, "Provider/quota/tool/RAG/persistence failure is a blocker, never a substituted success").toBe(0);
    expect(observed?.doneEvents).toBe(1);
    expect(observed?.terminalCompleted).toBe(1);
    expect((observed?.firstDeltaRead ?? 0) > 0 && (observed?.firstDeltaRead ?? 0) < (observed?.firstDoneRead ?? 0), "A complete delta must reach the UI stream in an earlier native chunk than done").toBe(true);
    expect(observed?.deltaBeforeDone).toBe(1);
    await expect(panel.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true })).toBeEnabled({ timeout: 20000 });
    const persisted = await api(a, `/${id}/messages?page=1&page_size=20`); expect(persisted.status).toBe(200);
    const messages = persisted.data as PageOf<Message>;
    expect(messages.items.some(item => item.role === "assistant" && item.status === "completed" && item.content.length > 0 && item.citations.some(citation => citationText(citation) !== null))).toBe(true);
    const safeCitation = messages.items.filter(item => item.role === "assistant" && item.status === "completed").flatMap(item => item.citations.map(citationText)).find(citation => citation !== null);
    if (!safeCitation) throw new Error("Persisted LIVE citation must validate; no invented citation or body logging");
    const visibleHistory = panel.getByRole("region", { name: "Historial persistido", exact: true });
    const citationDetails = visibleHistory.locator("details").filter({ hasText: "URL pública informada, solo texto:" }).first();
    await citationDetails.locator(":scope > summary").click();
    await expect(citationDetails.getByText("URL pública informada, solo texto:", { exact: false })).toBeVisible();
    await expect(visibleHistory).toContainText("URL pública informada, solo texto:");
    expect((await visibleHistory.textContent())?.includes(safeCitation.url)).toBe(true);
    const originalRequest = response.request().postDataJSON() as Record<string, unknown>;
    expect(typeof originalRequest.client_request_id === "string").toBe(true);
    const duplicate = await api(a, `/${id}/messages`, "POST", originalRequest); expect(duplicate.status).toBe(409);
    expect(digest((await api(a, `/${id}/messages?page=1&page_size=20`)).data)).toBe(digest(messages));
    const countBeforeRecovery = posts;
    await panel.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true }).click();
    await expect(a.getByRole("status", { name: "Estado del asistente", exact: true })).toContainText("sin reenviar"); expect(posts).toBe(countBeforeRecovery);
    expect((await api(b, `/${id}`)).status).toBe(404);
    expect((await api(b, `/${id}/messages?page=1&page_size=20`)).status).toBe(404);
    expect((await api(b, `/${id}/messages`, "POST", { content: "Private access check", client_request_id: randomUUID() })).status).toBe(404);
    expect((await api(b, `/${id}`, "DELETE")).status).toBe(404);
    expect(((await api(b, "?page=1&page_size=20")).data as PageOf<Conversation>).items.length).toBe(0);
    expect((await api(a, "", "POST", { title: "Rejected extra", owner_id: "untrusted" })).status).toBe(422);
    await a.reload(); await a.getByRole("button", { name: title, exact: true }).click();
    await expect(panel.getByRole("region", { name: "Historial persistido", exact: true })).toBeVisible();
    expect(digest((await api(a, `/${id}/messages?page=1&page_size=20`)).data)).toBe(digest(messages));

    // A second, explicit LIVE turn tests cancellation. No provider retry is hidden here.
    await enterMessage(a, "Consultá documentación pública por MCP y explicá con detalle varios límites de la memoria DDR4. Conservá faltantes, no declares una PC compatible.");
    const cancelling = a.waitForResponse(result => new URL(result.url()).pathname === `/api/conversations/${id}/messages` && result.request().method() === "POST", { timeout: 30000 });
    await panel.getByRole("button", { name: "Enviar turno real", exact: true }).click();
    const started = await cancelling;
    if (started.status() !== 200) throw new Error("LIVE cancellation gate blocked by provider/API; no retry or fake pass.");
    await panel.getByRole("button", { name: "Cancelar generación", exact: true }).click();
    await expect(panel.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true })).toBeEnabled({ timeout: 20000 });
    await expect.poll(async () => {
      const latest = (await api(a, `/${id}/messages?page=1&page_size=20`)).data as PageOf<Message>;
      return latest.items.filter(item => item.role === "assistant").at(-1)?.status;
    }, { timeout: 15000, message: "Cancelled turn must persist a non-successful terminal status" }).toMatch(/^(interrupted|failed)$/);
    await panel.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true }).click();
    await expect(panel.getByRole("region", { name: "Historial persistido", exact: true })).toContainText(/Interrumpido|Fallido/);
    await panel.getByRole("button", { name: "Preparar borrado de conversación", exact: true }).click();
    const deletion = panel.getByRole("form", { name: "Confirmar borrado de conversación", exact: true });
    await deletion.getByRole("checkbox").check(); await deletion.getByRole("button", { name: "Eliminar conversación definitivamente", exact: true }).click();
    await expect(a.getByRole("status", { name: "Estado del asistente", exact: true })).toContainText("Conversación eliminada");
    expect((await api(a, `/${id}`)).status).toBe(404); id = null;
  } catch (error) { failed = true; throw error; }
  finally {
    try { if (id) { const cleanup = await api(a, `/${id}`, "DELETE"); if (![204, 404].includes(cleanup.status) && !failed) throw new Error("Own LIVE conversation cleanup not confirmed"); } }
    catch (error) { if (!failed) throw error; }
    finally { await Promise.allSettled([ca.close(), cb.close()]); }
  }
});
