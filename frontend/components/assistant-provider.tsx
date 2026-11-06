"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { sessionChangedEvent } from "../lib/session-role";
import { usePathname } from "next/navigation";
import { assistantAvailable } from "../lib/assistant-suggestions";
import { useChatSession } from "./use-chat-session";

type AssistantState = ReturnType<typeof useChatSession> & { authenticated: boolean; sessionChecking: boolean };
const AssistantContext = createContext<AssistantState | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const chat = useChatSession();
  const pathname = usePathname();
  const available = assistantAvailable(pathname) || pathname === "/chat" || pathname.startsWith("/chat/");
  const [authenticated, setAuthenticated] = useState(false), [sessionChecking, setSessionChecking] = useState(true);
  const identity = useRef<string | null>(null);
  const reset = chat.reset;
  useEffect(() => {
    let generation = 0, abort: AbortController | null = null;
    async function check() {
      if (!available) return;
      const ticket = ++generation; abort?.abort(); abort = new AbortController();
      setSessionChecking(true);
      try {
        const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) });
        const user = response.ok ? await response.json() : null;
        if (ticket !== generation) return;
        const next = typeof user?.id === "string" ? user.id : null;
        if (identity.current !== next) reset();
        identity.current = next; setAuthenticated(next !== null);
      } catch { if (ticket === generation) { identity.current = null; reset(); setAuthenticated(false); } }
      finally { if (ticket === generation) setSessionChecking(false); }
    }
    function changed() { identity.current = null; reset(); setAuthenticated(false); void check(); }
    window.addEventListener(sessionChangedEvent, changed);
    window.addEventListener("upgradejusto:assistant-session-lost", changed);
    window.addEventListener("focus", check);
    void check();
    return () => { generation++; abort?.abort(); window.removeEventListener(sessionChangedEvent, changed); window.removeEventListener("upgradejusto:assistant-session-lost", changed); window.removeEventListener("focus", check); };
  }, [reset, available]);
  return <AssistantContext.Provider value={{ ...chat, authenticated, sessionChecking }}>{children}</AssistantContext.Provider>;
}
export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("El asistente necesita AssistantProvider.");
  return value;
}
