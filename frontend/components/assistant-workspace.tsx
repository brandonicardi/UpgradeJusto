"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { SendHorizontal, Square } from "lucide-react";
import { useAssistant } from "./assistant-provider";
import { ChatBubble, ChatSuggestions } from "./uj/chat-bubble";
import Markdown from "./markdown";
import { citationText } from "../lib/assistant";
import { toolNameLabel, toolStatusLabel } from "../lib/assistant-presentation";
import { assistantScreen } from "../lib/assistant-suggestions";
import { statusLabel } from "./use-chat-session";
import TowerChatContext from "./tower-chat-context";

function Citations({ values }: { values: unknown[] }) {
  return values.length ? <ul className="assistant-citations">{values.map((value, index) => {
    const citation = citationText(value);
    return <li key={index}>{citation ? <details><summary>{citation.title}</summary><p>{citation.locator}</p><p className="break-words">{citation.url}</p><blockquote>{citation.excerpt}</blockquote></details> : <p>No pudimos verificar esta fuente.</p>}</li>;
  })}</ul> : null;
}

export function AssistantConversations() {
  const c = useAssistant();
  return <aside className="assistant-conversations" aria-label="Tus charlas">
    <form aria-label="Crear conversación" onSubmit={c.create}><fieldset disabled={c.busy} className="stack-sm"><legend>Nueva charla</legend><label htmlFor="assistant-title">Título de conversación</label><input id="assistant-title" value={c.title} required maxLength={100} onChange={event => c.setTitle(event.target.value)} placeholder="Ej. Más memoria para trabajar" /><button type="submit">Crear conversación privada</button></fieldset></form>
    <h2>Tus charlas</h2>
    {c.list?.items.length ? <ul>{c.list.items.map(item => <li key={item.id}><button type="button" disabled={c.busy} aria-current={c.selected?.id === item.id ? "true" : undefined} onClick={() => c.open(item.id)}><b>{item.title}</b><span>Charla privada</span></button></li>)}</ul> : <p className="muted">Todavía no hay charlas.</p>}
    {c.list && <nav aria-label="Páginas de conversaciones">{c.list.page > 1 && <button type="button" className="secondary" disabled={c.busy} onClick={() => c.operation(() => c.loadList(c.list!.page - 1))}>Conversaciones anteriores</button>}{c.list.page * c.list.page_size < c.list.total && <button type="button" className="secondary" disabled={c.busy} onClick={() => c.operation(() => c.loadList(c.list!.page + 1))}>Conversaciones siguientes</button>}<button type="button" className="text-button" disabled={c.busy} onClick={() => c.operation(() => c.loadList(c.list!.page))}>Recargar conversaciones</button></nav>}
  </aside>;
}

export function AssistantSelection() {
  const c = useAssistant();
  return c.selected ? <TowerChatContext key={`${c.selected.id}-${c.contextKey}`} controller={c.towerSelection} disabled={c.busy || c.conflict} onChange={c.changeContext} /> : <p>Elegí o creá una charla para seleccionar tu PC. No se adjunta ninguna automáticamente.</p>;
}

export default function AssistantWorkspace({ pathname, compact = false }: { pathname: string; compact?: boolean }) {
  const c = useAssistant(), input = useRef<HTMLTextAreaElement>(null), screen = assistantScreen(pathname);
  useEffect(() => { if (!c.sessionChecking && c.authenticated && c.access === "checking") void c.activate(); });
  if (c.sessionChecking) return <p role="status">Abriendo tu espacio privado…</p>;
  if (!c.authenticated || c.access === "login") return <section className="assistant-card"><h2>Entrá para conversar sobre tu PC</h2><p>Tu historial es privado.</p><Link href="/account">Iniciar sesión</Link></section>;
  if (c.access === "unavailable") return <section className="assistant-card"><h2>No pudimos abrir tus conversaciones</h2><p>No se enviaron mensajes.</p><button type="button" onClick={() => c.activate()}>Volver a intentar</button></section>;
  if (c.access === "checking") return <p role="status">Consultando conversaciones…</p>;
  return <div className={compact ? "assistant-workspace is-compact" : "assistant-workspace"}>
    {compact ? <details className="assistant-manage" open={!c.selected}><summary>Conversaciones</summary><AssistantConversations /></details> : <AssistantConversations />}
    <section className="assistant-thread" aria-label="Conversación seleccionada" aria-busy={c.busy}>
      {!compact && <header className="assistant-thread-head"><div><h1>{c.selected?.title || "Preguntale al asistente"}</h1><p>Tu charla privada · Sin cambios en tu PC</p></div></header>}
      <div className="assistant-messages">
        <p role="status" className="assistant-status">{c.notice || "Preguntá, compará y entendé qué datos faltan antes de decidir."}</p>
        {c.error && <p role="alert" className="notice">{c.error}</p>}
        {c.selected ? <>
          <button type="button" className="text-button" disabled={c.busy} onClick={() => c.recover()}>Recuperar historial sin reenviar</button>
          {c.history && <section aria-label="Mensajes guardados"><ol className="assistant-message-list">{c.history.items.map(message => <li key={message.id}><ChatBubble autor={message.role === "user" ? "persona" : "asistente"}><p className="assistant-message-state">{statusLabel(message.status)}</p><Markdown content={message.content} /><Citations values={Array.isArray(message.citations) ? message.citations : []} /></ChatBubble></li>)}</ol><nav aria-label="Páginas de mensajes">{c.history.page > 1 && <button type="button" className="text-button" disabled={c.busy} onClick={() => c.operation(async () => { await c.loadMessages(c.selected!.id, c.history!.page - 1); })}>Mensajes anteriores</button>}{c.history.page * c.history.page_size < c.history.total && <button type="button" className="text-button" disabled={c.busy} onClick={() => c.operation(async () => { await c.loadMessages(c.selected!.id, c.history!.page + 1); })}>Mensajes siguientes</button>}</nav></section>}
          {c.live && <section aria-label="Respuesta provisional"><ChatBubble autor="asistente"><p className="assistant-message-state">{c.live.status === "pending" ? "Escribiendo… respuesta provisional, todavía no guardada" : c.live.status}</p><div aria-live="polite"><Markdown content={c.live.content} /></div>{c.live.tools.length > 0 && <ul className="assistant-tools" aria-label="Consultas del asistente">{c.live.tools.map((tool, index) => <li key={index}>{toolNameLabel(tool.name)}: {toolStatusLabel(tool.status)}</li>)}</ul>}<Citations values={c.live.citations} /></ChatBubble></section>}
        </> : <div className="assistant-welcome"><h2>Una buena mejora empieza con una buena pregunta.</h2><p>Creá una charla y contanos qué querés conseguir. Si faltan datos, te ayudamos a identificarlos.</p></div>}
      </div>
      <div className="assistant-composer-area">
        {compact && c.selected && <details><summary>PC y criterios para esta pregunta</summary><AssistantSelection /></details>}
        <ChatSuggestions sugerencias={screen.questions} onElegir={question => { c.editContent(question); input.current?.focus(); }} />
        <form aria-label="Enviar mensaje al asistente" className="assistant-composer" onSubmit={c.send}>
          <label className="sr-only" htmlFor="assistant-message">Mensaje al asistente</label><textarea ref={input} id="assistant-message" rows={2} required maxLength={8000} value={c.content} disabled={c.busy || c.conflict} onChange={event => c.editContent(event.target.value)} placeholder="Preguntá lo que quieras sobre tu PC" />
          <button type="submit" disabled={!c.selected || c.busy || c.conflict} aria-label="Enviar"><SendHorizontal aria-hidden="true" size={20} /></button>
        </form>
        {!c.selected && <p className="assistant-help">Creá o elegí una charla antes de enviar. Las sugerencias solo completan tu pregunta.</p>}
        <p className="assistant-help">No escribas contraseñas ni datos personales. Si algo encaja lo decide nuestro revisor, con reglas fijas. Las consultas no guardan ni modifican tu PC ni tus planes.</p>
        {c.streaming && <button type="button" className="secondary" onClick={c.stop}><Square aria-hidden="true" size={16} /> Detener respuesta</button>}
        {c.conflict && <><p>Hay una solicitud ya registrada. Recuperá el historial y revisá la PC antes de redactar otra pregunta.</p><button type="button" disabled={c.busy} onClick={c.newQuestion}>Redactar una pregunta nueva sin reenviar</button></>}
        {c.selected && <details><summary>Privacidad y opciones de la charla</summary><p>Los mensajes y los datos que elijas se envían al proveedor configurado. Las consultas no guardan PCs ni planes.</p><button className="text-button" type="button" disabled={c.busy} onClick={() => c.setDeleting(true)}>Preparar borrado de conversación</button>{c.deleting && <form aria-label="Confirmar borrado de conversación" onSubmit={c.remove}><fieldset disabled={c.busy}><legend>Eliminar historial privado</legend><label><input type="checkbox" required />Confirmo eliminar esta conversación y sus mensajes, no PCs ni planes</label><button type="submit">Eliminar conversación definitivamente</button><button type="button" className="secondary" onClick={() => c.setDeleting(false)}>Cancelar borrado</button></fieldset></form>}</details>}
      </div>
    </section>
    {!compact && <aside className="assistant-context" aria-label="Contexto"><div className="assistant-card"><h2>Estamos hablando de</h2><AssistantSelection /></div><div className="assistant-card assistant-trust"><h2>¿Quién decide si encaja?</h2><p>Nuestro revisor automático, con reglas fijas y los datos de tu PC. El asistente te lo explica, pero no lo inventa.</p></div><div className="assistant-card"><h2>Puedo ayudarte a</h2><ul><li>Elegir qué mejorar primero</li><li>Revisar si una pieza encaja</li><li>Comparar alternativas sin modificar tu PC</li></ul><p>No compro por vos ni guardo cambios en tu PC o tus planes.</p><Link href="/pcs">Ver mis PCs</Link><Link href="/tower-plans">Ver mis planes</Link></div></aside>}
  </div>;
}
