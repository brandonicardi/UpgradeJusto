"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button, Notice } from "../../components/uj";
import AccountAccess from "../../components/account-access";
import type { AccessTab } from "../../lib/account-access";
import { authError, authRequest, type PublicUser } from "../../lib/auth";
import GoogleSignIn from "../../components/google-signin";
import AccountProfile from "../../components/account-profile";

export default function Account() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<AccessTab>("login");
  const [googleActive, setGoogleActive] = useState(false);
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState(false);

  // Cambiar de pestaña limpia los avisos pero conserva el email escrito.
  function changeTab(next: AccessTab) {
    setMode(next); setError(""); setNotice(""); setCreated(false);
  }

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
    const typedEmail = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    // Never retain the password in React state or persistent storage.
    const field = form.elements.namedItem("password");
    if (field instanceof HTMLInputElement) field.value = "";
    setBusy(true); setError(""); setNotice(""); setCreated(false);
    try {
      const response = await authRequest(mode, { email: typedEmail, password });
      if (mode === "register") {
        setMode("login");
        setCreated(true);
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

  const privacy = <details className="accordion"><summary>Privacidad y condiciones de acceso</summary><p className="muted">El servidor valida la sesión y los permisos. Sin recuperación de contraseña ni verificación de titularidad del email en esta versión. El registro no inicia sesión automáticamente.</p><p className="muted">Usá un email con letras, números y símbolos comunes, sin acentos ni caracteres especiales; lo guardamos en minúsculas. La contraseña puede llevar espacios, que cuentan como parte de ella, y no puede ser demasiado larga. Crear la cuenta no te abre la sesión: después entrás con tu email y tu contraseña.</p></details>;
  const noscript = <noscript>Para gestionar tu sesión necesitás habilitar JavaScript. El catálogo sigue disponible.</noscript>;

  if (!user) return <section className="mx-auto grid w-full max-w-[1120px] min-w-0 gap-space-6 py-space-5 lg:grid-cols-[5fr_6fr] lg:items-start lg:gap-space-7" aria-busy={busy}>
    <header className="grid content-start gap-space-4 text-tinta">
      <h1 className="m-0 text-titular-l lg:text-titular-xl">Tu PC puede dar <mark className="rounded-sm bg-lima px-[0.12em] text-sobre-lima">más</mark>.</h1>
      <ul className="m-0 grid list-none gap-space-3 p-0 text-cuerpo-l">
        {["Guardá tus PCs para no cargarlas de nuevo.", "Armá un plan y seguilo de a una compra por vez.", "Retomá tus charlas con el asistente donde las dejaste."].map(item => <li key={item} className="flex items-start gap-space-3"><Check aria-hidden="true" className="mt-[2px] size-6 flex-none text-pino" strokeWidth={2.25} />{item}</li>)}
      </ul>
      <p className="m-0 text-cuerpo text-tinta-suave">¿Solo querés mirar? <Link href="/catalog" className="font-semibold text-pino underline underline-offset-4">Explorá el catálogo sin cuenta</Link>. Para guardar tu PC y tu plan vas a necesitar una.</p>
    </header>
    <div className="grid min-w-0 gap-space-4">
      <AccountAccess
        tab={mode} busy={busy} locked={googleActive} email={email} error={error} created={created} statusText={busy ? "Consultando tu sesión…" : notice}
        onTabChange={changeTab} onEmailChange={setEmail} onSubmit={submit}
        alternative={!busy && <GoogleSignIn key={mode} onUser={setUser} onActiveChange={setGoogleActive} />}
      />
      {privacy}
      {noscript}
    </div>
  </section>;

  const card = "grid min-w-0 content-start gap-space-4 rounded-lg border border-linea bg-papel-alto p-space-5 sm:p-space-6";
  const link = "inline-flex min-h-11 items-center rounded-pill border border-linea-fuerte bg-papel-alto px-space-4 font-semibold text-tinta no-underline hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
  return <section className="mx-auto grid w-full max-w-[1120px] min-w-0 gap-space-6 py-space-5" aria-busy={busy}>
    <header className="grid gap-space-2 text-tinta">
      <h1 className="m-0 text-titular-l lg:text-titular-xl">Tu cuenta</h1>
      <p className="m-0 text-cuerpo-l text-tinta-suave">Tus datos y a dónde seguir.</p>
    </header>
    <div role="status" aria-label="Estado de cuenta" className="text-chico text-tinta-suave empty:hidden">{busy ? "Consultando tu sesión…" : notice}</div>
    {error && <Notice tono="no" titulo="No pudimos continuar">{error}</Notice>}
    <div className="grid min-w-0 gap-space-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-space-6">
      <div className="grid min-w-0 gap-space-5">
        <section className={card} aria-labelledby="cuenta-datos">
          <h2 id="cuenta-datos" className="m-0 text-titular-m">Tus datos</h2>
          <AccountProfile user={user} />
        </section>
        <section className={card} aria-labelledby="cuenta-seguir">
          <h2 id="cuenta-seguir" className="m-0 text-titular-m">Seguí por acá</h2>
          <div className="flex flex-wrap gap-space-3">
            <Link className={link} href="/pcs">Mi PC</Link>
            <Link className={link} href="/tower-plans">Mis planes</Link>
            <Link className={link} href="/build">Armar una configuración</Link>
            <Link className={link} href="/catalog">Catálogo</Link>
          </div>
        </section>
      </div>
      <aside className="grid min-w-0 gap-space-4">
        <div className={card}>
          <h2 className="m-0 text-cuerpo-l font-semibold">Tu privacidad</h2>
          <ul className="m-0 grid list-none gap-space-2 p-0 text-cuerpo text-tinta-suave">
            {["Tus PCs son privadas.", "Un plan solo lo ve quien tenga el enlace, si decidís compartirlo; podés dejar de compartirlo cuando quieras.", "El servidor revisa tu sesión en cada pedido."].map(item => <li key={item} className="flex items-start gap-space-2"><Check aria-hidden="true" className="mt-[2px] size-5 flex-none text-pino" strokeWidth={2.25} />{item}</li>)}
          </ul>
        </div>
        <div className={card}>
          <h2 className="m-0 text-cuerpo-l font-semibold">Salir</h2>
          <p className="m-0 text-cuerpo text-tinta-suave">Cerrá la sesión si usás una compu que no es tuya.</p>
          <Button peso="secundario" disabled={busy} onClick={logout}>Cerrar sesión</Button>
        </div>
      </aside>
    </div>
    {noscript}
  </section>;
}
