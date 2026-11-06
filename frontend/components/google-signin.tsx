"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "./uj";
import { createGoogleSignIn, GIS_SCRIPT, type GIS, type GoogleConfig, type GoogleState } from "../lib/google-signin";
import type { PublicUser } from "../lib/public-user";
import { sessionChangedEvent } from "../lib/session-role";

export default function GoogleSignIn({ onUser, onActiveChange, register = false }: { onUser: (user: PublicUser) => void; onActiveChange: (active: boolean) => void; register?: boolean }) {
  const [config, setConfig] = useState<GoogleConfig | null>(null), [ready, setReady] = useState(false);
  const [state, setState] = useState<GoogleState>({ phase: "idle", message: "" });
  const target = useRef<HTMLDivElement>(null), controller = useRef<ReturnType<typeof createGoogleSignIn> | null>(null), userCallback = useRef(onUser), activeCallback = useRef(onActiveChange);
  useEffect(() => { userCallback.current = onUser; activeCallback.current = onActiveChange; }, [onUser, onActiveChange]);
  useEffect(() => {
    const abort = new AbortController();
    controller.current = createGoogleSignIn({ sdk: () => (window as Window & { google?: { accounts?: { id?: GIS } } }).google?.accounts?.id, onState: next => { setState(next); activeCallback.current(["preparing", "ready", "submitting"].includes(next.phase)); }, onUser: user => userCallback.current(user), sessionChanged: () => window.dispatchEvent(new Event(sessionChangedEvent)) });
    fetch("/api/auth/google/config", { cache: "no-store", credentials: "same-origin", signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error(); const data = await response.json();
      if (typeof data.enabled !== "boolean" || (data.client_id !== null && typeof data.client_id !== "string")) throw new Error();
      if (!abort.signal.aborted) setConfig({ enabled: data.enabled, client_id: data.client_id });
    }).catch(() => { if (!abort.signal.aborted) setState({ phase: "error", message: "No se pudo consultar el acceso con Google. El acceso local sigue disponible." }); });
    return () => { abort.abort(); controller.current?.dispose(); controller.current = null; activeCallback.current(false); };
  }, []);
  const enabled = config?.enabled === true && !!config.client_id;
  const active = ["preparing", "ready", "submitting"].includes(state.phase);
  const idle = state.phase === "error" || state.phase === "idle";
  const label = idle ? (register ? "Crear cuenta con Google" : "Entrar con Google") : "Acceso con Google preparado";
  return <section aria-label="Acceso con Google" className="grid min-w-0 gap-space-3">
    {enabled && <Script id="google-gis" src={GIS_SCRIPT} strategy="afterInteractive" onReady={() => setReady(true)} onError={() => { setReady(false); setState({ phase: "error", message: "No se pudo cargar el botón oficial de Google. Usá el acceso local." }); }} />}
    <Button peso="secundario" icono={<LogIn className="size-5" />} disabled={!enabled || !ready || active || state.phase === "success"} onClick={() => { if (target.current && config?.client_id) void controller.current?.prepare(config.client_id, target.current); }}>{label}</Button>
    {!enabled && <p className="m-0 text-chico text-tinta-suave">{config ? "El acceso con Google no está habilitado en este servidor." : "Consultando disponibilidad de Google…"}</p>}
    <div ref={target} aria-label="Botón oficial de Google" className="grid justify-items-center empty:hidden" />
    {active && <Button peso="quieto" chico onClick={() => controller.current?.cancel()}>Cancelar acceso con Google</Button>}
    <p role="status" className="m-0 text-chico text-tinta-suave empty:hidden">{state.message}</p>
  </section>;
}
