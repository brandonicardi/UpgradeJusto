"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Loader2, Plus, SendHorizontal, Square, Trash2, X } from "lucide-react";
import { useAssistant } from "./assistant-provider";
import { ChatSuggestions } from "./uj/chat-bubble";
import Markdown from "./markdown";
import { citationText } from "../lib/assistant";
import { cleanAssistantText, conversationDay, toolNameLabel, toolStatusLabel } from "../lib/assistant-presentation";
import { assistantScreen } from "../lib/assistant-suggestions";
import { statusLabel } from "./use-chat-session";
import TowerChatContext from "./tower-chat-context";
import { chatEligible } from "../lib/chat-pc-rule";

function Citations({ values }: { values: unknown[] }) {
  return values.length ? <ul className="assistant-citations">{values.map((value, index) => {
    const citation = citationText(value);
    return <li key={index}>{citation ? <details><summary>{citation.title}</summary><p>{citation.locator}</p><p className="break-words">{citation.url}</p><blockquote>{citation.excerpt}</blockquote></details> : <p>No pudimos verificar esta fuente.</p>}</li>;
  })}</ul> : null;
}

export function AssistantConversations() {
  const c = useAssistant(), [asking, setAsking] = useState(false);
  const empty = !!c.list && c.list.items.length === 0, open = asking || empty;
  async function create(event: FormEvent<HTMLFormElement>) {
    await c.create(event);
    setAsking(false);
  }
  const now = new Date();
  const [confirming, setConfirming] = useState<string | null>(null);
  return <aside className="assistant-conversations" aria-label="Tus charlas">
    <button type="button" className="assistant-new" aria-expanded={open} disabled={c.busy} onClick={() => setAsking(value => !value)}><Plus aria-hidden="true" size={18} />Nueva charla</button>
    {open && <form aria-label="Crear conversación" className="assistant-new-form" onSubmit={create}><fieldset disabled={c.busy}><legend className="sr-only">Nueva charla</legend><label htmlFor="assistant-title">Título de conversación</label><input id="assistant-title" value={c.title} required maxLength={100} onChange={event => c.setTitle(event.target.value)} placeholder="Ej. Más memoria para trabajar" /><button type="submit" className="secondary">Crear conversación privada</button></fieldset></form>}
    <h2>Tus charlas</h2>
    {c.list?.items.length ? <ul>{c.list.items.map(item => <li key={item.id}><button type="button" disabled={c.busy} aria-current={c.selected?.id === item.id ? "true" : undefined} onClick={() => c.open(item.id)}><b>{item.title}</b><span>{conversationDay(item.updated_at, now)} · Charla privada</span></button>{confirming === item.id ? <div className="assistant-delete-ask"><span>¿Eliminar esta charla?</span><button type="button" disabled={c.busy} onClick={() => { setConfirming(null); void c.erase(item.id); }}>Sí, eliminar</button><button type="button" onClick={() => setConfirming(null)}>No</button></div> : <button type="button" className="assistant-delete" aria-label={`Eliminar charla ${item.title}`} disabled={c.busy} onClick={() => setConfirming(item.id)}><Trash2 aria-hidden="true" size={16} /></button>}</li>)}</ul> : <p className="muted">Todavía no hay charlas.</p>}
    {c.list && <nav aria-label="Páginas de conversaciones">{c.list.page > 1 && <button type="button" className="secondary" disabled={c.busy} onClick={() => c.operation(() => c.loadList(c.list!.page - 1))}>Conversaciones anteriores</button>}{c.list.page * c.list.page_size < c.list.total && <button type="button" className="secondary" disabled={c.busy} onClick={() => c.operation(() => c.loadList(c.list!.page + 1))}>Conversaciones siguientes</button>}<button type="button" className="text-button" disabled={c.busy} onClick={() => c.operation(() => c.loadList(c.list!.page))}>Recargar conversaciones</button></nav>}
  </aside>;
}

export function AssistantSelection() {
  const c = useAssistant();
  return <TowerChatContext key={`${c.selected?.id ?? "nueva"}-${c.contextKey}`} controller={c.towerSelection} disabled={c.busy || c.conflict} onChange={c.changeContext} />;
}

/** Arriba del campo de texto: con varias PCs el asistente pregunta; sin PCs avisa; con una dice de cuál habla. */
export function PcPrompt() {
  const c = useAssistant(), t = c.towerSelection, pcs = chatEligible(t.list?.items);
  if (t.choice === "ask") return <div className="assistant-pc-ask" role="group" aria-label="Elegir PC"><p>¿De cuál PC hablamos?</p><div className="row wrap">{pcs.map(pc => <button key={pc.id} type="button" className="secondary" disabled={c.busy || c.conflict} onClick={() => { void t.choose(pc.id); }}>{pc.name.replace(/^Armado propuesto \(por comprar\) · /, "")}</button>)}<button type="button" className="text-button" disabled={c.busy || c.conflict} onClick={() => { void t.choose(""); }}>De ninguna</button></div></div>;
  if (t.choice === "none") return <p className="assistant-help">Todavía no cargaste una PC. <Link href="/pcs">Cargar mi PC</Link></p>;
  if (t.selected) return <p className="assistant-help">Hablando de: {t.selected.name}</p>;
  return null;
}

export default function AssistantWorkspace({ pathname, compact = false }: { pathname: string; compact?: boolean }) {
  const c = useAssistant(), input = useRef<HTMLTextAreaElement>(null), screen = assistantScreen(pathname);
  useEffect(() => { if (!c.sessionChecking && c.authenticated && c.access === "checking") void c.activate(); });
  // Como cualquier chat: lo último siempre queda a la vista.
  const messages = useRef<HTMLDivElement>(null);
  useEffect(() => { const box = messages.current; if (box) box.scrollTop = box.scrollHeight; }, [c.history, c.live?.content, c.selected?.id]);
  if (c.sessionChecking) return <p role="status">Abriendo tu espacio privado…</p>;
  if (!c.authenticated || c.access === "login") return <section className="assistant-card"><h2>Entrá para conversar sobre tu PC</h2><p>Tu historial es privado.</p><Link href="/account">Iniciar sesión</Link></section>;
  if (c.access === "unavailable") return <section className="assistant-card"><h2>No pudimos abrir tus conversaciones</h2><p>No se enviaron mensajes.</p><button type="button" onClick={() => c.activate()}>Volver a intentar</button></section>;
  if (c.access === "checking") return <p role="status">Consultando conversaciones…</p>;
  const pcName = c.towerSelection.selected?.name, firstMessage = c.history?.items[0];
  const privacy = c.selected ? <details className="assistant-privacy"><summary>Privacidad y opciones de la charla</summary><p>Los mensajes y los datos que elijas se envían al proveedor configurado. Las consultas no guardan PCs ni planes: no modifican tu PC ni tus planes.</p><button className="text-button" type="button" disabled={c.busy} onClick={() => c.setDeleting(true)}>Preparar borrado de conversación</button>{c.deleting && <form aria-label="Confirmar borrado de conversación" onSubmit={c.remove}><fieldset disabled={c.busy}><legend>Eliminar historial privado</legend><label><input type="checkbox" required />Confirmo eliminar esta conversación y sus mensajes, no PCs ni planes</label><button type="submit">Eliminar conversación definitivamente</button><button type="button" className="secondary" onClick={() => c.setDeleting(false)}>Cancelar borrado</button></fieldset></form>}</details> : null;
  return <div className={compact ? "assistant-workspace is-compact" : "assistant-workspace"}>
    {compact ? <details className="assistant-manage"><summary>Tus charlas y opciones</summary><div className="assistant-manage-body"><AssistantConversations /><details><summary>PC y criterios para esta pregunta</summary><AssistantSelection /></details>{privacy}</div></details> : <AssistantConversations />}
    <section className="assistant-thread" aria-label="Conversación seleccionada" aria-busy={c.busy}>
      {!compact && <header className="assistant-thread-head"><div><h1>{c.selected?.title || "Preguntale al asistente"}</h1><p>{pcName ? `Hablando de: ${pcName}` : c.selected ? "Todavía no elegiste una PC para esta charla" : "Escribí tu pregunta para empezar"}</p></div>{c.selected && <button type="button" className="assistant-quiet" disabled={c.busy} onClick={() => c.recover()}>Recuperar historial sin reenviar</button>}</header>}
      <div className="assistant-messages" ref={messages}>
        {c.notice && <p role="status" className="assistant-status">{c.notice}</p>}
        {c.error && <p role="alert" className="notice">{c.error}</p>}
        {c.selected ? <>
          {compact && c.conflict && <button type="button" className="text-button" disabled={c.busy} onClick={() => c.recover()}>Recuperar historial sin reenviar</button>}
          {c.history && <section aria-label="Mensajes guardados">{firstMessage && <span className="assistant-day">{conversationDay(firstMessage.created_at, new Date())}</span>}<ol className="assistant-message-list">{c.history.items.map(message => <li key={message.id}>
            {message.role === "user"
              ? <div className="msg-user">{message.status !== "completed" && <p className="assistant-message-state">{statusLabel(message.status)}</p>}<Markdown content={message.content} /></div>
              : <div className="msg-bot"><div className="who"><i aria-hidden="true" />Asistente</div>{message.status !== "completed" && <p className="assistant-message-state">{statusLabel(message.status)}</p>}<div className="bot-text"><Markdown content={cleanAssistantText(message.content)} /></div><Citations values={Array.isArray(message.citations) ? message.citations : []} /></div>}
          </li>)}</ol><nav aria-label="Páginas de mensajes">{c.history.page > 1 && <button type="button" className="text-button" disabled={c.busy} onClick={() => c.operation(async () => { await c.loadMessages(c.selected!.id, c.history!.page - 1); })}>Mensajes anteriores</button>}{c.history.page * c.history.page_size < c.history.total && <button type="button" className="text-button" disabled={c.busy} onClick={() => c.operation(async () => { await c.loadMessages(c.selected!.id, c.history!.page + 1); })}>Mensajes siguientes</button>}</nav></section>}
          {c.live && <section aria-label="Respuesta provisional"><div className="msg-bot"><div className="who"><i aria-hidden="true" />Asistente</div>
            {c.live.tools.length > 0 && <ul className="did" aria-label="Lo que revisó el asistente">{c.live.tools.map((tool, index) => <li key={index}>{tool.status === "completed" ? <Check aria-hidden="true" size={14} strokeWidth={2.25} /> : tool.status === "failed" || tool.status === "interrupted" ? <X aria-hidden="true" size={14} strokeWidth={2.25} /> : <Loader2 aria-hidden="true" size={14} strokeWidth={2.25} />}{toolNameLabel(tool.name)}<span className="sr-only">: {toolStatusLabel(tool.status)}</span></li>)}</ul>}
            <p className="assistant-message-state">{c.live.status === "pending" ? "Escribiendo… respuesta provisional, todavía no guardada" : c.live.status}</p><div className="bot-text" aria-live="polite"><Markdown content={cleanAssistantText(c.live.content)} /></div><Citations values={c.live.citations} /></div></section>}
        </> : <div className="assistant-welcome"><h2>Una buena mejora empieza con una buena pregunta.</h2><p>Contanos qué querés conseguir. Si faltan datos, te ayudamos a identificarlos.</p></div>}
      </div>
      <div className="assistant-composer-area">
        {c.streaming && <button type="button" className="assistant-stop" onClick={c.stop}><Square aria-hidden="true" size={14} /> Detener respuesta</button>}
        {(!compact || !c.history?.items.length) && <div className="assistant-suggest"><ChatSuggestions sugerencias={screen.questions} onElegir={question => { c.editContent(question); input.current?.focus(); }} /></div>}
        {compact && <p className="assistant-help assistant-privacy-note">No escribas datos personales. Puede equivocarse.</p>}
        <PcPrompt />
        <form aria-label="Enviar mensaje al asistente" className="assistant-composer" onSubmit={c.send}>
          <label className="sr-only" htmlFor="assistant-message">Mensaje al asistente</label><textarea ref={input} id="assistant-message" rows={1} required maxLength={8000} value={c.content} disabled={c.busy || c.conflict} onChange={event => c.editContent(event.target.value)} placeholder="Preguntá sobre tu PC" />
          <button type="submit" className="assistant-send" disabled={c.busy || c.conflict} aria-label="Enviar"><SendHorizontal aria-hidden="true" size={18} strokeWidth={2.25} /></button>
        </form>
        {!compact && <p className="assistant-help">No escribas contraseñas ni datos personales. El asistente puede equivocarse al explicar; si algo encaja lo decide nuestro revisor.</p>}
        {c.conflict && <><p>Hay una solicitud ya registrada. Recuperá el historial y revisá la PC antes de redactar otra pregunta.</p><button type="button" disabled={c.busy} onClick={c.newQuestion}>Redactar una pregunta nueva sin reenviar</button></>}
        {!compact && privacy}
      </div>
    </section>
    {!compact && <aside className="assistant-context" aria-label="Contexto"><div className="assistant-card"><h2>Estamos hablando de</h2><AssistantSelection /></div><div className="assistant-card assistant-trust"><h2>¿Quién decide si encaja?</h2><p>Nuestro revisor automático, con reglas fijas y los datos de tu PC. El asistente te lo explica, pero no lo inventa.</p></div><div className="assistant-card"><h2>Puedo ayudarte a</h2><ul className="assistant-can"><li><Check aria-hidden="true" size={18} />Elegir qué mejorar primero</li><li><Check aria-hidden="true" size={18} />Revisar si un componente encaja</li><li><Check aria-hidden="true" size={18} />Armar o cambiar tu plan, siempre con tu OK</li><li className="cant"><X aria-hidden="true" size={18} />Comprar por vos ni guardar cambios en tu PC o tus planes</li></ul><Link href="/pcs">Ver mis PCs</Link><Link href="/tower-plans">Ver mis planes</Link></div></aside>}
  </div>;
}
