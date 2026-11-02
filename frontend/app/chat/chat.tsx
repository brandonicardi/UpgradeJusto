"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AssistantError, assistantRequest, citationText, messageInput, readAssistantStream, type Citation, type Conversation, type Message, type PageOf } from "../../lib/assistant";
import { toolNameLabel, toolStatusLabel } from "../../lib/assistant-presentation";
import MessageRender from "../../components/message-render";
import TowerChatContext from "../../components/tower-chat-context";
import type { AssistantContext } from "../../lib/assistant-context";

type Live = { content: string; citations: Citation[]; tools: { name: string; status: string }[]; status: string };
const statusLabel = (status: string) => ({ pending: "Pendiente, sin éxito confirmado", completed: "Guardado", failed: "Fallido: texto parcial", interrupted: "Interrumpido: texto parcial" })[status as Message["status"]] ?? "Estado sin confirmar";
function Citations({ values }: { values: unknown[] }) {
  return <ul className="space-y-2">{values.map((value, index) => {
    const citation = citationText(value);
    return <li key={index}>{citation ? <details className="accordion"><summary>{citation.title}</summary><p>Fuente {citation.source_id} · {citation.locator}</p><p className="break-words">URL pública informada, solo texto: {citation.url}</p><blockquote className="whitespace-pre-wrap">{citation.excerpt}</blockquote></details> : <p>Cita no verificable: URL omitida. No se abre ni consulta automáticamente.</p>}</li>;
  })}</ul>;
}

export default function Chat() {
  const [list, setList] = useState<PageOf<Conversation> | null>(null), [selected, setSelected] = useState<Conversation | null>(null);
  const [history, setHistory] = useState<PageOf<Message> | null>(null), [live, setLive] = useState<Live | null>(null);
  const [title, setTitle] = useState(""), [content, setContent] = useState("");
  const [managementOpen, setManagementOpen] = useState(false);
  const managementButton = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(true), [streaming, setStreaming] = useState(false), [deleting, setDeleting] = useState(false), [conflict, setConflict] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [access, setAccess] = useState<"checking" | "allowed" | "login" | "unavailable">("checking");
  const controller = useRef<AbortController | null>(null);
  const lastRequest = useRef<{ conversationId: string; signature: string; id: string } | null>(null);
  const turnContext = useRef<{ value?: AssistantContext; invalid: boolean }>({ invalid: false }), sending = useRef(false), operationLock = useRef(false), currentConversation = useRef<string | null>(null), mounted = useRef(true);
  const [contextKey, setContextKey] = useState(0);
  function clearContext() { turnContext.current = { invalid: false }; setContextKey(value => value + 1); }
  const lastMessageId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    async function initial() {
      try { const data = await (await assistantRequest("?page=1&page_size=20")).json(); if (active) { setList(data); setAccess("allowed"); } }
      catch (failure) { if (active) { setAccess(failure instanceof AssistantError && failure.status === 401 ? "login" : "unavailable"); setError(failure instanceof AssistantError ? failure.message : "No se pudo cargar el historial privado."); } }
      finally { if (active) setBusy(false); }
    }
    mounted.current = true;
    void initial(); return () => { active = false; mounted.current = false; currentConversation.current = null; controller.current?.abort(); };
  }, []);
  async function loadList(page = 1) { setList(await (await assistantRequest(`?page=${page}&page_size=20`)).json()); }
  async function loadMessages(id: string, page?: number): Promise<PageOf<Message>> {
    let data: PageOf<Message> = await (await assistantRequest(`/${id}/messages?page=${page ?? 1}&page_size=20`)).json();
    if (page === undefined && data.total > data.page_size) data = await (await assistantRequest(`/${id}/messages?page=${Math.ceil(data.total / data.page_size)}&page_size=20`)).json();
    if (mounted.current && currentConversation.current === id) setHistory(data); return data;
  }
  async function operation(action: () => Promise<void>) {
    if (operationLock.current || sending.current) return;
    operationLock.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (failure) { setError(failure instanceof AssistantError ? failure.message : "No se pudo confirmar la operación. Recuperá historial sin reenviar mensajes."); }
    finally { operationLock.current = false; if (mounted.current) setBusy(false); }
  }
  async function open(id: string) {
    await operation(async () => {
      currentConversation.current = id; clearContext(); setSelected(null); setHistory(null);
      const metadata: Conversation = await (await assistantRequest(`/${id}`)).json();
      if (!mounted.current || currentConversation.current !== id) return;
      setSelected(metadata); setManagementOpen(false); setHistory(null); setLive(null); setContent(""); setDeleting(false); setConflict(false); lastRequest.current = null; lastMessageId.current = null;
      await loadMessages(id);
    });
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await operation(async () => {
      const normalized = title.trim();
      if (!normalized || normalized.length > 100 || normalized.includes("\0")) throw new AssistantError(422);
      const response = await assistantRequest("", "POST", { title: normalized });
      const conversation: Conversation = await response.json();
      if (!mounted.current) return;
      currentConversation.current = conversation.id; clearContext();
      setSelected(conversation); setManagementOpen(false); setHistory({ items: [], total: 0, page: 1, page_size: 20 }); setTitle(""); setContent(""); setLive(null); setDeleting(false); setConflict(false); lastRequest.current = null;
      setNotice("Conversación privada creada. Todavía no se envió un turno al proveedor."); await loadList(1);
    });
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    await operation(async () => { await assistantRequest(`/${selected.id}`, "DELETE"); currentConversation.current = null; clearContext(); setSelected(null); setHistory(null); setLive(null); setDeleting(false); lastRequest.current = null; setNotice("Conversación eliminada. PCs y planes no se modificaron."); await loadList(1); });
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy || conflict || sending.current || operationLock.current) return;
    if (turnContext.current.invalid) { setError("Revisá o recargá la torre y los criterios, o elegí Ninguna antes de enviar."); return; }
    const conversationId = selected.id, text = content.trim();
    const signature = JSON.stringify({ content: text, context: turnContext.current.value });
    if (!lastRequest.current || lastRequest.current.conversationId !== conversationId || lastRequest.current.signature !== signature) lastRequest.current = { conversationId, signature, id: crypto.randomUUID() };
    let body: ReturnType<typeof messageInput>;
    try { body = messageInput(text, lastRequest.current.id, turnContext.current.value); } catch { setError("Revisá mensaje (1 a 8000 caracteres), torre y criterios del turno."); return; }
    sending.current = true;
    const abort = new AbortController(); controller.current = abort;
    lastMessageId.current = null;
    setBusy(true); setStreaming(true); setError(""); setNotice("Iniciando turno privado. No hay respuesta completa confirmada.");
    setLive({ content: "", citations: [], tools: [], status: "pending" });
    let messageId: string | null = null, outcome = "interrupted";
    try {
      const response = await assistantRequest(`/${conversationId}/messages`, "POST", body, AbortSignal.any([abort.signal, AbortSignal.timeout(105000)]));
      if (!response.body || !response.headers.get("Content-Type")?.startsWith("text/event-stream")) throw new AssistantError(503);
      outcome = await readAssistantStream(response.body, event => {
        const data = event.data;
        if (event.type === "start") {
          if (typeof data.message_id === "string") { messageId = data.message_id; lastMessageId.current = messageId; }
          setContent(""); setNotice("Turno iniciado; respuesta provisional hasta comprobar historial.");
        }
        if (event.type === "delta" && typeof data.text === "string") {
          const text = data.text;
          setLive(previous => previous ? { ...previous, content: (previous.content + text).slice(0, 200000) } : previous);
        }
        if (event.type === "tool_status") {
          const name = typeof data.name === "string" && /^[A-Za-z0-9_.:-]{1,80}$/.test(data.name) ? data.name : "Herramienta";
          const status = typeof data.status === "string" && /^[A-Za-z_ -]{1,40}$/.test(data.status) ? data.status : "Estado no informado";
          // Never retain/render tool arguments, raw outputs or internal reasoning.
          setLive(previous => previous ? { ...previous, tools: [...previous.tools.slice(-19), { name, status }] } : previous);
        }
        if (event.type === "citation") {
          const citation = citationText(data);
          if (citation) setLive(previous => previous ? { ...previous, citations: [...previous.citations, citation].slice(0, 20) } : previous);
        }
        if (event.type === "error") { setError("El turno falló. Puede haber contenido parcial; no hay éxito confirmado. Cuota, credenciales, timeout o persistencia requieren diagnóstico, no cambio automático de proveedor."); }
      }, abort.signal);
      setNotice(outcome === "completed" ? "Stream finalizado; verificando persistencia en historial…" : "Stream fallido o interrumpido. Recuperando estado persistido, sin reenviar.");
    } catch (failure) {
      if (failure instanceof AssistantError && failure.status === 409) { setConflict(true); if (body.context) setNotice("La revisión del contexto pudo cambiar antes de admitir el turno. Recargá la torre y revisá explícitamente; no se reenvía ni se actualiza la revisión automáticamente."); }
      setError(abort.signal.aborted ? "Cancelación solicitada. El estado persistido puede seguir pendiente: recuperá historial." : failure instanceof AssistantError && failure.status === 409 && body.context ? "Conflicto de solicitud o revisión del contexto. Recuperá historial, recargá la torre y revisá antes de redactar otro turno; no se reenviará ni se actualizará la revisión automáticamente." : failure instanceof AssistantError ? failure.message : "Conexión SSE interrumpida o inválida. Texto parcial; no se reenviará automáticamente.");
    } finally {
      controller.current = null; setStreaming(false);
      setLive(previous => previous ? { ...previous, status: outcome === "completed" ? "Sin confirmación de persistencia" : "Parcial: fallido o interrumpido" } : previous);
      try {
        const persisted = await loadMessages(conversationId);
        const stored = persisted.items.find(item => item.id === messageId && item.role === "assistant");
        if (stored) { setLive(null); setNotice(`Historial recuperado: ${statusLabel(stored.status)}. No se reenvió el turno.`); }
        else setNotice("Historial consultado, pero no se confirmó el mensaje generado. No hay éxito confirmado; podés recuperar historial otra vez sin enviar.");
      } catch { setNotice("No se pudo confirmar persistencia del turno. Texto provisional, no éxito. Recuperá historial sin reenviar."); }
      sending.current = false; clearContext(); setBusy(false);
    }
  }
  return <section aria-busy={busy}>
    <header className="page-heading"><p className="eyebrow">PENSÁ TU MEJORA EN VOZ ALTA</p><h1>Asistente privado</h1><p className="muted">Preguntá, compará y entendé qué datos faltan antes de decidir.</p></header>
    <p role="status" className="muted" aria-label="Estado del asistente">{notice || (busy ? "Consultando conversaciones…" : "Elegí una conversación o empezá una nueva.")}</p>{error && <p role="alert" className="notice">{error}</p>}
    {access === "login" ? <section className="surface stack"><h2>Entrá para conversar sobre tu PC</h2><p>Tu historial es privado. Iniciá sesión para crear o retomar una conversación.</p><Link href="/account" className="plan-link">Iniciar sesión</Link></section> : access === "unavailable" ? <section className="surface stack"><h2>No pudimos abrir tus conversaciones</h2><p>No se enviaron mensajes. Volvé a esta página cuando el servicio esté disponible.</p></section> : access === "checking" ? <p role="status">Abriendo tu espacio privado…</p> : <div className="chat-workspace"><aside className="surface chat-conversations stack">
      {selected && <button ref={managementButton} type="button" className="secondary chat-management-toggle" aria-controls="chat-management" aria-expanded={managementOpen} onClick={() => setManagementOpen(!managementOpen)} onKeyDown={event => { if (event.key === "Escape") setManagementOpen(false); }}>Conversaciones</button>}
      <div id="chat-management" className={`stack chat-management-body${selected && !managementOpen ? " is-collapsed" : ""}`} onKeyDown={event => { if (event.key === "Escape" && selected) { setManagementOpen(false); managementButton.current?.focus(); } }}>
      <form aria-label="Crear conversación" onSubmit={create}><fieldset disabled={busy} className="stack-sm"><legend className="form-legend">Nueva conversación</legend><label htmlFor="chat-title">Título de conversación</label><input id="chat-title" value={title} required maxLength={100} onChange={event => setTitle(event.target.value)} placeholder="Ej. Más memoria para trabajar" /><button type="submit">Crear conversación privada</button></fieldset></form>
      {list && <section aria-label="Lista de conversaciones" className="stack-sm"><h2>Tus conversaciones</h2><p className="muted">{list.total} conversaciones · Página {list.page}</p>{list.items.length ? <ul className="conversation-list">{list.items.map(item => <li key={item.id}><button className="secondary" aria-pressed={selected?.id === item.id} disabled={busy} type="button" onClick={() => open(item.id)}>{item.title}</button></li>)}</ul> : <p className="muted">No hay conversaciones en esta página.</p>}<nav aria-label="Páginas de conversaciones">{list.page > 1 && <button className="secondary" disabled={busy} onClick={() => operation(() => loadList(list.page - 1))}>Conversaciones anteriores</button>}{list.page * list.page_size < list.total && <button className="secondary" disabled={busy} onClick={() => operation(() => loadList(list.page + 1))}>Conversaciones siguientes</button>}</nav><button className="text-button" disabled={busy} onClick={() => operation(() => loadList(list.page))}>Recargar conversaciones</button></section>}
      <details className="accordion"><summary>Privacidad y alcance</summary><p>Los mensajes y datos necesarios se envían al proveedor configurado. Nunca ingreses claves o tokens. Tu historial no forma parte del corpus documental público.</p><p>Groq, MCP y documentación pública se consultan en servidor. Las herramientas sólo consultan o simulan; no guardan PCs ni planes. Sólo el motor decide compatibilidad básica sin overclock, no certificación física total. Una fuente no elimina datos pendientes.</p><Link href="/pcs">Mis PCs</Link> · <Link href="/plans">Mis planes</Link></details>
      </div>
    </aside>
    {selected ? <section aria-label="Conversación seleccionada" className="surface chat-thread stack"><div className="row between wrap"><h2>{selected.title}</h2><span className="badge">Privada</span></div>
      <button className="text-button" disabled={busy} onClick={() => operation(async () => { const data = await loadMessages(selected.id); if (data.items.some(item => item.id === lastMessageId.current)) setLive(null); setNotice("Historial recuperado del servidor sin reenviar ni generar un nuevo turno. Si falta un mensaje, su texto provisional sigue sin confirmación."); })}>Recuperar historial sin reenviar</button>
      {history && <section aria-label="Historial persistido" className="stack-sm"><h3>Mensajes guardados por servidor</h3><ol className="message-list">{history.items.map(message => <li key={message.id} className={`message message-${message.role === "user" ? "user" : "assistant"}`}><h4>{message.role === "user" ? "Vos" : "Asistente"}</h4><p className="message-state">{statusLabel(message.status)}</p><MessageRender content={message.content} /><Citations values={Array.isArray(message.citations) ? message.citations : []} /><details><summary>Datos del mensaje</summary><p>Secuencia {message.sequence} · {message.created_at} · Estado técnico: {message.status}</p></details></li>)}</ol><nav aria-label="Páginas de mensajes">{history.page > 1 && <button disabled={busy} onClick={() => operation(async () => { await loadMessages(selected.id, history.page - 1); })}>Mensajes anteriores</button>}{history.page * history.page_size < history.total && <button disabled={busy} onClick={() => operation(async () => { await loadMessages(selected.id, history.page + 1); })}>Mensajes siguientes</button>}</nav></section>}
      {live && <section aria-label="Respuesta provisional en streaming" className="message message-assistant"><h3>Respuesta provisional</h3><p className="message-state">{live.status === "pending" ? "Escribiendo… todavía no se confirmó el guardado" : live.status}</p><div aria-label="Texto incremental" aria-live="polite"><MessageRender content={live.content} /></div><ul aria-label="Estados seguros de herramientas">{live.tools.map((tool, index) => <li key={index}>◇ {toolNameLabel(tool.name)}: {toolStatusLabel(tool.status)}</li>)}</ul><Citations values={live.citations} /></section>}
      <TowerChatContext key={`${selected.id}-${contextKey}`} disabled={busy || conflict} onChange={(value, invalid) => { turnContext.current = { value, invalid }; lastRequest.current = null; }} />
      <form aria-label="Enviar mensaje al asistente" onSubmit={send} className="chat-composer"><fieldset disabled={busy || conflict} className="stack-sm"><legend className="sr-only">Nuevo mensaje</legend><label htmlFor="chat-message">Mensaje al asistente</label><textarea id="chat-message" required maxLength={8000} value={content} onChange={event => { setContent(event.target.value); lastRequest.current = null; }} rows={3} placeholder="¿Qué querés mejorar de tu PC?" /><p className="compact-help">Las consultas no guardan ni modifican tu PC. No reenviamos mensajes automáticamente.</p><button type="submit">Enviar turno real</button></fieldset></form>
      {conflict && <><p className="notice">Hay una solicitud ya registrada. Recuperá el historial antes de redactar otra.</p><button disabled={busy} type="button" onClick={() => { setContent(""); lastRequest.current = null; setConflict(false); }}>Redactar un turno nuevo sin reenviar</button></>}
      <div className="row wrap"><button className="secondary" disabled={!streaming} type="button" onClick={() => controller.current?.abort()}>Cancelar generación</button><button className="text-button" disabled={busy} onClick={() => setDeleting(true)}>Preparar borrado de conversación</button></div>
      {deleting && <form aria-label="Confirmar borrado de conversación" onSubmit={remove}><fieldset disabled={busy} className="stack-sm"><legend>Eliminar historial privado</legend><label><input type="checkbox" required />Confirmo eliminar esta conversación y mensajes, no PCs ni planes</label><button type="submit">Eliminar conversación definitivamente</button><button type="button" onClick={() => setDeleting(false)}>Cancelar borrado</button></fieldset></form>}
    </section> : <section className="surface chat-welcome"><span className="badge">◇ Tu espacio privado</span><h2>Una buena mejora empieza con una buena pregunta.</h2><p className="muted">Creá una conversación y contanos qué querés conseguir. Si faltan datos, te ayudamos a identificarlos.</p><Link href="/pcs">Ver mi configuración →</Link></section>}
    </div>}
  </section>;
}
