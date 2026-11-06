"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize2, MessageCircle, X } from "lucide-react";
import { useAssistant } from "./assistant-provider";
import { assistantAvailable, assistantScreen } from "../lib/assistant-suggestions";
import AssistantWorkspace from "./assistant-workspace";
import "../app/chat/assistant.css";

export default function AssistantPanel() {
  const pathname = usePathname(), chat = useAssistant();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null);
  // Volver a la ventana revalida la sesión: el panel sigue abierto y su contenido se oculta mientras tanto.
  const reachable = chat.authenticated && chat.access !== "login" && assistantAvailable(pathname);
  const available = reachable && !chat.sessionChecking;
  const open = reachable && openedOn === pathname;
  function close() { setOpenedOn(null); trigger.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); setOpenedOn(null); trigger.current?.focus(); } }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  // Adjust the view at a route/session boundary, never the shared request.
  if (openedOn !== null && (!reachable || openedOn !== pathname)) setOpenedOn(null);
  if (!available && !open) return null;
  return <div className="assistant-floating">
    {open && <section ref={panel} tabIndex={-1} id="assistant-panel" className="assistant-panel" role="dialog" aria-labelledby="assistant-panel-title">
      <header className="assistant-panel-head"><div><b id="assistant-panel-title">Asistente</b><small>Sobre: {assistantScreen(pathname).label}</small></div><Link className="assistant-icon" href="/chat" aria-label="Abrir la charla en pantalla completa" onClick={() => setOpenedOn(null)}><Maximize2 aria-hidden="true" size={20} /></Link><button className="assistant-icon secondary" type="button" onClick={close} aria-label="Cerrar el asistente"><X aria-hidden="true" size={20} /></button></header>
      <div className="assistant-panel-body"><AssistantWorkspace compact pathname={pathname} /></div>
    </section>}
    <button ref={trigger} type="button" className="assistant-trigger" aria-controls="assistant-panel" aria-expanded={open} onClick={() => open ? close() : setOpenedOn(pathname)}><MessageCircle aria-hidden="true" size={20} /><span>¿Dudas?</span></button>
  </div>;
}
