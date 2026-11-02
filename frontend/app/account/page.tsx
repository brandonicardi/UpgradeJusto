"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { authError, authRequest, type PublicUser } from "../../lib/auth";
import GoogleSignIn from "../../components/google-signin";
import AccountProfile from "../../components/account-profile";

export default function Account() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [googleActive, setGoogleActive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (response.ok) setUser(await response.json());
        else if (response.status !== 401) setError(authError(response.status, response.headers.get("Retry-After")));
      } catch { if (!controller.signal.aborted) setError(authError(503)); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    // Never retain the password in React state or persistent storage.
    const field = form.elements.namedItem("password");
    if (field instanceof HTMLInputElement) field.value = "";
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await authRequest(mode, { email, password });
      if (mode === "register") {
        setMode("login");
        setNotice("Cuenta creada. Iniciá sesión: el registro no abre una sesión automáticamente.");
      } else {
        setUser(await response.json());
        setNotice("Sesión iniciada.");
        await authRequest("csrf"); // Cookie and CSRF rotate after login.
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : authError(503)); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError(""); setNotice("");
    try { await authRequest("logout"); setUser(null); setNotice("Sesión cerrada en el servidor."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : authError(503)); }
    finally { setBusy(false); }
  }

  return <section className="account-layout" aria-busy={busy}>
    <header className="account-intro"><h1>Tu cuenta</h1><p className="muted">Guardá tus configuraciones, organizá mejoras y retomá tus conversaciones.</p><ul className="account-benefits"><li>✓ Tus PCs, sólo para vos</li><li>✓ Planes por etapas</li><li>✓ Tus configuraciones son privadas</li></ul><Link href="/catalog">Explorar el catálogo sin cuenta</Link></header>
    <div className="surface account-card stack">
    <p role="status" aria-label="Estado de cuenta" className="status-line muted">{busy ? "Consultando tu sesión…" : notice}</p>
    {error && <p role="alert" className="notice">{error}</p>}
    {user ? <div className="stack"><span className="badge badge-good">✓ Conectado</span><h2>Continuar con mi PC</h2><p className="muted">Sesión activa validada por el servidor. Retomá una configuración o empezá una propuesta por comprar.</p><Link className="plan-link" href="/pcs">Continuar con mi PC</Link><Link href="/build">Armar una configuración desde cero</Link><Link href="/tower-plans">Ver mis planes de torre</Link><AccountProfile user={user} /><button className="secondary" type="button" disabled={busy} onClick={logout}>Cerrar sesión</button></div> : <>
      <div className="segmented-control" role="group" aria-label="Elegir acceso">
        <button className="secondary" type="button" disabled={busy} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); setNotice(""); }}>Iniciar sesión</button>
        <button className="secondary" type="button" disabled={busy} aria-pressed={mode === "register"} onClick={() => { setMode("register"); setError(""); setNotice(""); }}>Crear cuenta</button>
      </div>
      <form onSubmit={submit} aria-label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}>
        <fieldset disabled={busy || googleActive} className="stack">
          <legend className="form-legend">{mode === "login" ? "Qué bueno verte" : "Creá tu espacio"}</legend>
          <label className="block" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} aria-describedby="email-help" />
          <p id="email-help" className="muted">Usá el email con el que registraste tu cuenta.</p>
          <label className="block" htmlFor="password">Contraseña</label>
          <input key={mode} id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required aria-describedby="password-help" />
          <p id="password-help" className="muted">{mode === "register" ? "Entre 12 y 128 caracteres. Los espacios también cuentan." : "Tu contraseña no se almacena en este navegador."}</p>
          <button type="submit">{mode === "login" ? "Entrar" : "Registrar cuenta"}</button>
        </fieldset>
      </form>
      {!busy && <GoogleSignIn key={mode} onUser={setUser} onActiveChange={setGoogleActive} />}
    </>}
    <details className="accordion"><summary>Privacidad y condiciones de acceso</summary><p className="muted">El servidor valida la sesión y los permisos. Sin recuperación de contraseña ni verificación de titularidad del email en esta versión. El registro no inicia sesión automáticamente.</p><p className="muted">Email ASCII, normalizado a minúsculas conservando puntos y sufijos. Contraseña de hasta 512 bytes UTF-8, sin carácter NUL; se conservan espacios.</p></details>
    <noscript>Para gestionar tu sesión necesitás habilitar JavaScript. El catálogo sigue disponible.</noscript>
    </div>
  </section>;
}
