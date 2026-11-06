// @vitest-environment jsdom
import { act, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantProvider, useAssistant } from "../../components/assistant-provider";
import { sessionChangedEvent } from "../../lib/session-role";
import { mount, settle, unmountAll } from "./support/dom";
import AssistantWorkspace from "../../components/assistant-workspace";

let chat: ReturnType<typeof useAssistant>;
const route = vi.hoisted(() => ({ pathname: "/chat" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
function Probe() { const value = useAssistant(); useEffect(() => { chat = value; }); return <p>{value.content}{value.selected?.title}{value.history?.items.map(item => item.content)}</p>; }
const empty = { items: [], total: 0, page: 1, page_size: 20 };
const conversation = { id: "11111111-1111-1111-1111-111111111111", title: "Charla anterior", created_at: "", updated_at: "" };
const event = { preventDefault() {} } as React.FormEvent<HTMLFormElement>;
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); route.pathname = "/chat"; });
describe("controlador privado compartido", () => {
  it("oculta el espacio durante la revalidación sin borrar el borrador de la misma cuenta", async () => {
    let resolveSession: (response: Response) => void = () => {};
    const fetcher = vi.fn((url: string) => url === "/api/auth/session" ? Promise.resolve(Response.json({ id: "cuenta-a" })) : Promise.resolve(Response.json(empty)));
    vi.stubGlobal("fetch", fetcher);
    const host = await mount(<AssistantProvider><Probe /><AssistantWorkspace pathname="/chat" /></AssistantProvider>);
    await settle();
    await act(async () => { chat.setContent("borrador privado"); });
    fetcher.mockImplementation(() => new Promise<Response>(resolve => { resolveSession = resolve; }));
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(chat.sessionChecking).toBe(true);
    expect(host.textContent).toContain("Abriendo tu espacio privado…");
    expect(host.querySelector(".assistant-workspace")).toBeNull();
    expect(host.querySelector("textarea")).toBeNull();
    await act(async () => { resolveSession(Response.json({ id: "cuenta-a" })); });
    expect(chat.content).toBe("borrador privado");
  });
  it("no consulta sesión en rutas excluidas y revalida al volver", async () => {
    const fetcher = vi.fn(async () => Response.json({ id: "cuenta-a" })); vi.stubGlobal("fetch", fetcher);
    for (const pathname of ["/admin", "/account", "/shared-tower-plans/token"]) {
      route.pathname = pathname;
      await mount(<AssistantProvider><Probe /></AssistantProvider>);
      await act(async () => { window.dispatchEvent(new Event("focus")); });
      expect(fetcher).not.toHaveBeenCalled();
      await unmountAll();
    }
    route.pathname = "/pcs";
    await mount(<AssistantProvider><Probe /></AssistantProvider>); await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("no carga conversaciones al montar y activa una sola vez", async () => {
    const fetcher = vi.fn(async (url: string) => Response.json(url === "/api/auth/session" ? { id: "cuenta-a" } : empty)); vi.stubGlobal("fetch", fetcher);
    await mount(<AssistantProvider><Probe /></AssistantProvider>); await settle();
    expect(chat.authenticated).toBe(true); expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["/api/auth/session"]);
    await act(async () => { await chat.activate(); await chat.activate(); });
    expect(fetcher.mock.calls.filter(([url]) => url.startsWith("/api/conversations"))).toHaveLength(1);
  });
  it("cambiar de cuenta aborta y borra borrador, charla, historial y contexto, ignorando respuestas tardías", async () => {
    let account = "cuenta-a", resolveList: (response: Response) => void = () => {};
    const fetcher = vi.fn((url: string) => {
      if (url === "/api/auth/session") return Promise.resolve(Response.json({ id: account }));
      if (url.includes("?page=1&page_size=20") && !url.includes("/messages")) return new Promise<Response>(resolve => { resolveList = resolve; });
      return Promise.resolve(Response.json(url.includes("/messages") ? { ...empty, items: [{ id: "m", content: "privado", role: "assistant", status: "completed" }] } : conversation));
    }); vi.stubGlobal("fetch", fetcher);
    const host = await mount(<AssistantProvider><Probe /></AssistantProvider>); await settle();
    await act(async () => { await chat.open(conversation.id); chat.setContent("borrador privado"); });
    expect(host.textContent).toContain("privado");
    let pending: Promise<void>; await act(async () => { pending = chat.activate(); });
    await act(async () => { account = "cuenta-b"; window.dispatchEvent(new Event(sessionChangedEvent)); }); await settle();
    await act(async () => { resolveList(Response.json({ ...empty, items: [conversation] })); await pending!; });
    expect(chat.selected).toBeNull(); expect(chat.history).toBeNull(); expect(chat.list).toBeNull(); expect(chat.content).toBe(""); expect(chat.turnContext.current).toEqual({ invalid: false }); expect(host.textContent).not.toContain("privado");
  });
  it("mantiene candado de envío y aborta el stream cuando sale la cuenta", async () => {
    let signal: AbortSignal | undefined;
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/session") return Response.json({ id: "cuenta-a" });
      if (url === "/api/auth/csrf") return Response.json({ csrf_token: "prueba" });
      if (init?.method === "POST") { signal = init.signal as AbortSignal; return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('event: start\ndata: {"message_id":"m"}\n\nevent: delta\ndata: {"text":"**Parcial**"}\n\n')); } }), { headers: { "Content-Type": "text/event-stream" } }); }
      return Response.json(url.includes("/messages") ? empty : conversation);
    }); vi.stubGlobal("fetch", fetcher);
    await mount(<AssistantProvider><Probe /></AssistantProvider>); await settle();
    await act(async () => { await chat.open(conversation.id); chat.setContent("Pregunta"); });
    let pending: Promise<void>;
    await act(async () => { pending = chat.send(event); void chat.send(event); }); await settle();
    expect(chat.live?.content).toBe("**Parcial**"); expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    await act(async () => { window.dispatchEvent(new Event(sessionChangedEvent)); await pending!; }); await settle();
    expect(signal?.aborted).toBe(true); expect(chat.live).toBeNull(); expect(chat.streaming).toBe(false);
  });
});
