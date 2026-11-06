import { expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { test } from "../e2e/fixtures";
import { observeRealStream, safeStreamSnapshot, type StreamCounters } from "../support/assistant-live-observer";
import { emptyTower, type Tower } from "../../lib/towers";
import type { Conversation, Message, PageOf } from "../../lib/assistant";

test.use({ trace: "off", screenshot: "off", video: "off" });
async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") { const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json(); headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json"; }
    const response = await fetch(args.path, { method: args.method, cache: "no-store", headers, body: args.body === undefined ? undefined : JSON.stringify(args.body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}
async function login(page: Page) {
  await page.goto("/account");
  const credentials = { email: `tower-chat-${randomUUID()}@example.test`, password: randomUUID() };
  expect((await api(page, "/api/auth/register", "POST", credentials)).status).toBe(201);
  expect((await api(page, "/api/auth/login", "POST", credentials)).status).toBe(200);
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("@tower-chat-live CU08 contexto schema2 por turno, MCP/SSE/historia reales", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  if (process.env.UJ_TEST_ASSISTANT_LIVE !== "1") throw new Error("LIVE required; no skip or simulated success");
  const ca = await newIsolatedContext(), cb = await newIsolatedContext(), a = await ca.newPage(), b = await cb.newPage();
  a.setDefaultTimeout(15000); b.setDefaultTimeout(15000); await observeRealStream(a);
  let phase = "login", pcId: string | null = null, conversationId: string | null = null, posts = 0, pcWrites = 0, cleanupFailed = false;
  let observed: ReturnType<typeof safeStreamSnapshot> | null = null;
  try {
    await login(a); await login(b);
    phase = "own-tower";
    const input = emptyTower(); input.name = "Torre sintética del turno"; input.category_status.cpu = "present"; input.lines = [{ line_id: null, category: "cpu", component_id: "P01", declared_model: null, quantity: 1 }];
    const createdPC = await api(a, "/api/towers", "POST", input); expect(createdPC.status).toBe(201);
    const pc = createdPC.data as Tower; pcId = pc.id; expect(pc.revision).toBe(1); const pcHash = digest(pc);
    await a.goto("/chat"); await a.getByLabel("Título de conversación", { exact: true }).fill("Contexto de torre sintética");
    const creating = a.waitForResponse(response => new URL(response.url()).pathname === "/api/conversations" && response.request().method() === "POST");
    await a.getByRole("button", { name: "Crear conversación privada", exact: true }).click();
    const created = await creating; expect(created.status()).toBe(201); conversationId = (await created.json() as Conversation).id;
    const panel = a.getByRole("region", { name: "Conversación seleccionada", exact: true });
    phase = "select-context";
    await a.getByLabel("Torre propia para este turno", { exact: true }).selectOption({ label: input.name });
    await expect(a.getByRole("region", { name: "Torre seleccionada para este turno", exact: true })).toBeVisible();
    a.on("request", request => { const path = new URL(request.url()).pathname; if (request.method() === "POST" && path === `/api/conversations/${conversationId}/messages`) posts++; if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && (path.startsWith("/api/towers") || path.startsWith("/api/pcs"))) pcWrites++; });
    // Avoid fill call logs containing message bodies, even for own synthetic data.
    await a.getByLabel("Mensaje al asistente", { exact: true }).evaluate(field => {
      if (!(field instanceof HTMLTextAreaElement)) throw new Error("Message field unavailable");
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (!setter) throw new Error("Message setter unavailable");
      setter.call(field, "Usá get_pc y evaluate_pc para esta torre del contexto; explicá fallos y faltantes sin guardar y sin certificar físicamente. Es una PC sintética parcial, no hardware medido."); field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    phase = "send-once";
    const receiving = a.waitForResponse(response => new URL(response.url()).pathname === `/api/conversations/${conversationId}/messages` && response.request().method() === "POST", { timeout: 30000 });
    await panel.getByRole("button", { name: "Enviar turno real", exact: true }).click();
    const response = await receiving; expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]?.startsWith("text/event-stream")).toBe(true);
    phase = "stream-wait-terminal";
    await expect.poll(() => a.evaluate(() => { const c = (window as unknown as { __ujLiveStreamCounters?: StreamCounters }).__ujLiveStreamCounters; return (c?.doneEvents ?? 0) + (c?.errorEvents ?? 0) + (c?.invalidFrames ?? 0); }), { timeout: 100000 }).toBeGreaterThan(0);
    phase = "stream-snapshot";
    observed = safeStreamSnapshot(await a.evaluate(() => (window as unknown as { __ujLiveStreamCounters: StreamCounters }).__ujLiveStreamCounters));
    phase = "stream-assert-responses"; expect(observed.responses).toBe(1);
    phase = "stream-assert-start"; expect(observed.startEvents).toBe(1);
    phase = "stream-assert-nonempty-delta"; expect(observed.nonEmptyDeltaEvents).toBeGreaterThan(0);
    phase = "stream-assert-delta-before-done"; expect(observed.deltaBeforeDone).toBe(1);
    phase = "stream-assert-done"; expect(observed.doneEvents).toBe(1);
    phase = "stream-assert-completed"; expect(observed.terminalCompleted).toBe(1);
    phase = "get-pc-assert-started"; expect(observed.getStarted).toBeGreaterThan(0);
    phase = "get-pc-assert-completed"; expect(observed.getCompleted).toBeGreaterThan(0);
    phase = "evaluate-pc-assert-started"; expect(observed.evaluateStarted).toBeGreaterThan(0);
    phase = "evaluate-pc-assert-completed"; expect(observed.evaluateCompleted).toBeGreaterThan(0);
    phase = "stream-assert-no-errors"; expect(observed.getFailed + observed.evaluateFailed + observed.errorEvents + observed.invalidFrames).toBe(0);
    phase = "persisted-history";
    await expect(panel.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true })).toBeEnabled({ timeout: 20000 });
    const saved = await api(a, `/api/conversations/${conversationId}/messages?page=1&page_size=20`); expect(saved.status).toBe(200);
    const history = saved.data as PageOf<Message>; expect(history.total).toBe(2); expect(history.items.filter(item => item.role === "assistant" && item.status === "completed" && item.content.trim().length > 0).length).toBe(1);
    expect(history.items.filter(item => item.role === "user").length).toBe(1); const hash = digest(history);
    expect(digest((await api(a, `/api/towers/${pcId}`)).data) === pcHash).toBe(true);
    phase = "reload-owner-boundary";
    await a.reload(); await a.getByRole("button", { name: "Contexto de torre sintética", exact: true }).click();
    await expect(a.getByRole("region", { name: "Historial persistido", exact: true })).toBeVisible();
    expect(await a.getByLabel("Torre propia para este turno", { exact: true }).inputValue() === "").toBe(true);
    expect(digest((await api(a, `/api/conversations/${conversationId}/messages?page=1&page_size=20`)).data) === hash).toBe(true);
    expect((await api(b, `/api/towers/${pcId}`)).status).toBe(404); expect((await api(b, `/api/conversations/${conversationId}`)).status).toBe(404); expect((await api(b, `/api/conversations/${conversationId}/messages?page=1&page_size=20`)).status).toBe(404);
    expect(posts).toBe(1); expect(pcWrites).toBe(0); phase = "complete";
  } catch (error) {
    if (observed === null && phase.startsWith("stream-")) {
      try { observed = safeStreamSnapshot(await a.evaluate(() => (window as unknown as { __ujLiveStreamCounters?: StreamCounters }).__ujLiveStreamCounters)); } catch { /* Retain phase; no raw exception. */ }
    }
    const candidate = (error as { matcherResult?: { name?: unknown } } | null)?.matcherResult?.name;
    const matcher = typeof candidate === "string" && ["toBe", "toBeGreaterThan", "toBeVisible", "toBeEnabled"].includes(candidate) ? candidate : null;
    throw new Error(JSON.stringify({ phase, matcher, stream: observed, posts, pc_writes: pcWrites }));
  }
  finally {
    try { if (conversationId) cleanupFailed = ![204, 404].includes((await api(a, `/api/conversations/${conversationId}`, "DELETE")).status); }
    catch { cleanupFailed = true; }
    try { if (pcId) cleanupFailed = ![204, 404].includes((await api(a, `/api/towers/${pcId}`, "DELETE")).status) || cleanupFailed; }
    catch { cleanupFailed = true; }
    finally { await Promise.allSettled([ca.close(), cb.close()]); }
    if (cleanupFailed) throw new Error(`phase=cleanup; error_enum=own_resources; posts=${posts}; pc_writes=${pcWrites}`);
  }
});
