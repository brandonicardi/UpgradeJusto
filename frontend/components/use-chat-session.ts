"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AssistantError, assistantRequest, citationText, messageInput, readAssistantStream, streamErrorText, type Citation, type Conversation, type Message, type PageOf } from "../lib/assistant";
import { keepsTurnContext, type AssistantContext } from "../lib/assistant-context";
import { useTowerChatSelection } from "./tower-chat-context";

export type Live = { content: string; citations: Citation[]; tools: { name: string; status: string }[]; status: string };
export const statusLabel = (status: string) => ({ pending: "Pendiente, sin éxito confirmado", completed: "Guardado", failed: "Fallido: texto parcial", interrupted: "Interrumpido: texto parcial" })[status as Message["status"]] ?? "Estado sin confirmar";

/** One owner for requests, draft and locks. Views never own a generation. */
export function useChatSession() {
  const [list, setList] = useState<PageOf<Conversation> | null>(null), [selected, setSelected] = useState<Conversation | null>(null);
  const [history, setHistory] = useState<PageOf<Message> | null>(null), [live, setLive] = useState<Live | null>(null);
  const [title, setTitle] = useState(""), [content, setContent] = useState("");
  const [managementOpen, setManagementOpen] = useState(false);
  const [busy, setBusy] = useState(false), [streaming, setStreaming] = useState(false), [deleting, setDeleting] = useState(false), [conflict, setConflict] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [access, setAccess] = useState<"checking" | "allowed" | "login" | "unavailable">("checking");
  const controller = useRef<AbortController | null>(null), lifetime = useRef(new AbortController());
  const lastRequest = useRef<{ conversationId: string; signature: string; id: string } | null>(null);
  const turnContext = useRef<{ value?: AssistantContext; invalid: boolean }>({ invalid: false });
  const sending = useRef(false), operationLock = useRef(false), currentConversation = useRef<string | null>(null), epoch = useRef(0), initialized = useRef(false);
  const [contextKey, setContextKey] = useState(0);
  const lastMessageId = useRef<string | null>(null);
  function changeContext(value: AssistantContext | undefined, invalid: boolean) { turnContext.current = { value, invalid }; lastRequest.current = null; }
  const towerSelection = useTowerChatSelection(!!selected, changeContext);
  const selectionReset = towerSelection.reset;
  const clearContext = useCallback(() => { turnContext.current = { invalid: false }; selectionReset(); setContextKey(value => value + 1); }, [selectionReset]);
  const reset = useCallback(() => {
    epoch.current++; initialized.current = false;
    controller.current?.abort(); controller.current = null;
    lifetime.current.abort(); lifetime.current = new AbortController();
    currentConversation.current = null; sending.current = false; operationLock.current = false;
    lastRequest.current = null; lastMessageId.current = null;
    setList(null); setSelected(null); setHistory(null); setLive(null); setContent(""); setTitle("");
    setBusy(false); setStreaming(false); setDeleting(false); setConflict(false); setManagementOpen(false);
    setError(""); setNotice(""); setAccess("checking"); clearContext();
  }, [clearContext]);
  useEffect(() => {
    const epochRef = epoch, controllerRef = controller, lifetimeRef = lifetime;
    if (lifetimeRef.current.signal.aborted) { lifetimeRef.current = new AbortController(); initialized.current = false; }
    return () => { epochRef.current++; controllerRef.current?.abort(); lifetimeRef.current.abort(); };
  }, []);
  async function request(path = "", method = "GET", body?: unknown, signal?: AbortSignal) {
    const ticket = epoch.current;
    try { return await assistantRequest(path, method, body, AbortSignal.any([lifetime.current.signal, signal ?? AbortSignal.timeout(15000)])); }
    catch (failure) { if (ticket === epoch.current && failure instanceof AssistantError && failure.status === 401) { reset(); setAccess("login"); window.dispatchEvent(new Event("upgradejusto:assistant-session-lost")); } throw failure; }
  }
  async function activate() {
    if (initialized.current) return;
    initialized.current = true; const ticket = epoch.current; setBusy(true);
    try { const data = await (await request("?page=1&page_size=20")).json(); if (ticket === epoch.current) { setList(data); setAccess("allowed"); } }
    catch (failure) { if (ticket === epoch.current) { initialized.current = false; setAccess(failure instanceof AssistantError && failure.status === 401 ? "login" : "unavailable"); setError(failure instanceof AssistantError ? failure.message : "No se pudo cargar el historial privado."); } }
    finally { if (ticket === epoch.current) setBusy(false); }
  }
  async function loadList(page = 1) {
    const ticket = epoch.current, data = await (await request(`?page=${page}&page_size=20`)).json();
    if (ticket === epoch.current) setList(data);
  }
  async function loadMessages(id: string, page?: number): Promise<PageOf<Message>> {
    const ticket = epoch.current;
    let data: PageOf<Message> = await (await request(`/${id}/messages?page=${page ?? 1}&page_size=20`)).json();
    if (ticket !== epoch.current) throw new DOMException("Sesión cambiada", "AbortError");
    if (page === undefined && data.total > data.page_size) data = await (await request(`/${id}/messages?page=${Math.ceil(data.total / data.page_size)}&page_size=20`)).json();
    if (ticket === epoch.current && currentConversation.current === id) setHistory(data);
    return data;
  }
  async function operation(action: () => Promise<void>) {
    if (operationLock.current || sending.current) return;
    const ticket = epoch.current; operationLock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (failure) { if (ticket === epoch.current) setError(failure instanceof AssistantError ? failure.message : "No se pudo confirmar la operación. Recuperá historial sin reenviar mensajes."); }
    finally { if (ticket === epoch.current) { operationLock.current = false; setBusy(false); } }
  }
  async function open(id: string) {
    await operation(async () => {
      const ticket = epoch.current; currentConversation.current = id; clearContext(); setSelected(null); setHistory(null);
      const metadata: Conversation = await (await request(`/${id}`)).json();
      if (ticket !== epoch.current || currentConversation.current !== id) return;
      setSelected(metadata); setManagementOpen(false); setHistory(null); setLive(null); setContent(""); setDeleting(false); setConflict(false); lastRequest.current = null; lastMessageId.current = null;
      await loadMessages(id);
    });
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await operation(async () => {
      const ticket = epoch.current, normalized = title.trim();
      if (!normalized || normalized.length > 100 || normalized.includes("\0")) throw new AssistantError(422);
      const conversation: Conversation = await (await request("", "POST", { title: normalized })).json();
      if (ticket !== epoch.current) return;
      currentConversation.current = conversation.id; clearContext();
      setSelected(conversation); setManagementOpen(false); setHistory({ items: [], total: 0, page: 1, page_size: 20 }); setTitle(""); setContent(""); setLive(null); setDeleting(false); setConflict(false); lastRequest.current = null;
      setNotice("Conversación privada creada. Todavía no se envió una pregunta."); await loadList(1);
    });
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    await operation(async () => {
      const ticket = epoch.current; await request(`/${selected.id}`, "DELETE"); if (ticket !== epoch.current) return;
      currentConversation.current = null; clearContext(); setSelected(null); setHistory(null); setLive(null); setDeleting(false); lastRequest.current = null;
      setNotice("Conversación eliminada. PCs y planes no se modificaron."); await loadList(1);
    });
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || conflict || sending.current || operationLock.current) return;
    let target = selected;
    if (!target) {
      // Como cualquier chat: la charla nace con el primer mensaje, nunca al abrir el panel.
      const first = content.trim();
      if (!first) return;
      const opening = epoch.current;
      sending.current = true; setBusy(true);
      try { target = await (await request("", "POST", { title: first.slice(0, 60) })).json() as Conversation; }
      catch { setError("No pudimos crear la charla. Tu pregunta sigue escrita: probá de nuevo."); return; }
      finally { if (opening === epoch.current) { sending.current = false; setBusy(false); } }
      if (opening !== epoch.current || !target) return;
      currentConversation.current = target.id; clearContext();
      setSelected(target); setHistory({ items: [], total: 0, page: 1, page_size: 20 }); setDeleting(false); lastRequest.current = null;
      void loadList(1);
    }
    if (turnContext.current.invalid) { setError("Revisá o recargá la PC y los criterios, o elegí Ninguna antes de enviar."); return; }
    const ticket = epoch.current, conversationId = target.id, text = content.trim();
    const signature = JSON.stringify({ content: text, context: turnContext.current.value });
    if (!lastRequest.current || lastRequest.current.conversationId !== conversationId || lastRequest.current.signature !== signature) lastRequest.current = { conversationId, signature, id: crypto.randomUUID() };
    let body: ReturnType<typeof messageInput>;
    try { body = messageInput(text, lastRequest.current.id, turnContext.current.value); } catch { setError("Revisá el mensaje (1 a 8000 caracteres), la PC y los criterios de esta pregunta."); return; }
    sending.current = true;
    const abort = new AbortController(); controller.current = abort;
    const signal = AbortSignal.any([abort.signal, lifetime.current.signal, AbortSignal.timeout(105000)]);
    lastMessageId.current = null;
    setBusy(true); setStreaming(true); setError(""); setNotice("Iniciando pregunta privada. Todavía no hay una respuesta completa.");
    setLive({ content: "", citations: [], tools: [], status: "pending" });
    let messageId: string | null = null, outcome = "interrupted", failedStatus: number | undefined;
    try {
      const response = await request(`/${conversationId}/messages`, "POST", body, signal);
      if (ticket !== epoch.current) return;
      if (!response.body || !response.headers.get("Content-Type")?.startsWith("text/event-stream")) throw new AssistantError(503);
      outcome = await readAssistantStream(response.body, event => {
        if (ticket !== epoch.current) return;
        const data = event.data;
        if (event.type === "start") {
          if (typeof data.message_id === "string") { messageId = data.message_id; lastMessageId.current = messageId; }
          setContent(""); setNotice("Respuesta provisional hasta comprobar el historial.");
        }
        if (event.type === "delta" && typeof data.text === "string") {
          const text = data.text; setLive(previous => previous ? { ...previous, content: (previous.content + text).slice(0, 200000) } : previous);
        }
        if (event.type === "tool_status") {
          const name = typeof data.name === "string" && /^[A-Za-z0-9_.:-]{1,80}$/.test(data.name) ? data.name : "Herramienta";
          const status = typeof data.status === "string" && /^[A-Za-z_ -]{1,40}$/.test(data.status) ? data.status : "Estado no informado";
          setLive(previous => previous ? { ...previous, tools: [...previous.tools.slice(-19), { name, status }] } : previous);
        }
        if (event.type === "citation") { const citation = citationText(data); if (citation) setLive(previous => previous ? { ...previous, citations: [...previous.citations, citation].slice(0, 20) } : previous); }
        if (event.type === "error") setError(streamErrorText(data));
      }, signal);
      if (ticket === epoch.current) setNotice(outcome === "completed" ? "Respuesta terminada; comprobando que esté guardada…" : "Respuesta interrumpida. Recuperando historial, sin reenviar.");
    } catch (failure) {
      if (ticket !== epoch.current) return;
      if (failure instanceof AssistantError) failedStatus = failure.status;
      if (failure instanceof AssistantError && failure.status === 409) setConflict(true);
      setError(signal.aborted ? "Respuesta detenida. Recuperá el historial para comprobar qué se guardó." : failure instanceof AssistantError ? failure.message : "Se interrumpió la conexión. El texto es parcial; no se reenviará automáticamente.");
    } finally {
      if (ticket === epoch.current) {
        controller.current = null; setStreaming(false);
        setLive(previous => previous ? { ...previous, status: outcome === "completed" ? "Sin confirmación de guardado" : "Interrumpido: texto parcial" } : previous);
        try {
          const persisted = await loadMessages(conversationId);
          if (ticket === epoch.current) {
            const stored = persisted.items.find(item => item.id === messageId && item.role === "assistant");
            // Ya guardada: repetir la misma pregunta con la misma PC es un turno nuevo, no un reenvío.
            if (stored) { lastRequest.current = null; setLive(null); setNotice(`Historial recuperado: ${statusLabel(stored.status)}. No se reenvió la pregunta.`); }
            else setNotice("Todavía no se confirmó el guardado de la respuesta. Podés recuperar historial sin reenviar.");
          }
        } catch { if (ticket === epoch.current) setNotice("No se pudo confirmar el guardado. El texto sigue siendo provisional. Recuperá historial sin reenviar."); }
        if (ticket === epoch.current) { sending.current = false; if (!keepsTurnContext(failedStatus)) clearContext(); setBusy(false); }
      }
    }
  }
  async function recover() {
    if (!selected) return;
    const ticket = epoch.current;
    await operation(async () => {
      const data = await loadMessages(selected.id);
      if (ticket !== epoch.current) return;
      if (data.items.some(item => item.id === lastMessageId.current && item.role === "assistant")) setLive(null);
      setNotice("Historial recuperado sin reenviar la pregunta. Si falta una respuesta, su texto sigue sin guardado confirmado.");
    });
  }
  function editContent(value: string) { setContent(value); lastRequest.current = null; }
  function newQuestion() { editContent(""); setConflict(false); }
  function stop() { controller.current?.abort(); }
  return { list, selected, history, live, title, setTitle, content, setContent, managementOpen, setManagementOpen, busy, streaming, deleting, setDeleting, conflict, setConflict, error, notice, setNotice, access, controller, lastRequest, turnContext, contextKey, lastMessageId, activate, reset, loadList, loadMessages, operation, open, create, remove, send, recover, towerSelection, editContent, newQuestion, changeContext, stop };
}
