"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { Button, Notice } from "../../components/uj";
import AccountAccess from "../../components/account-access";
import type { AccessTab } from "../../lib/account-access";
import { authError, authRequest, type PublicUser } from "../../lib/auth";
import GoogleSignIn from "../../components/google-signin";
import { DeleteSection, NameSection, PasswordSection } from "../../components/account-settings";
import { loadStash, stashTiles, type Stash } from "../../lib/account-stash";
import { sessionChangedEvent } from "../../lib/session-role";
import { saveDisplayName, validateDisplayName } from "../../lib/account-settings";

const BRAND_PROMESAS = ["Guardá tus PCs para no cargarlas de nuevo.", "Armá un plan y seguilo de a una compra por vez.", "Retomá tus charlas con el asistente donde las dejaste."];
const PRIVACIDAD = ["Tus PCs, planes y charlas son solo tuyos.", "Un plan se ve solo si vos lo compartís, y lo podés apagar.", "Tu contraseña la guardamos cifrada: ni nosotros la vemos."];
const card = "grid min-w-0 content-start gap-space-3 rounded-md border border-solid border-linea bg-papel-alto p-space-5";
const cardTitulo = "m-0 font-display text-[20px] font-[650] leading-[26px]";

/** «Lo que guardaste»: cuenta lo que devuelven los listados; si uno falla, lo dice en vez de poner cero. */
function SavedSection() {
  const [stash, setStash] = useState<Stash | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void loadStash(controller.signal).then(next => { if (!controller.signal.aborted) setStash(next); });
    return () => controller.abort();
  }, []);
  return <section className="grid min-w-0 content-start gap-space-4 rounded-lg border border-solid border-linea bg-papel-alto p-space-5 sm:p-space-6" aria-labelledby="cuenta-cosas" aria-busy={stash === null}>
    <h2 id="cuenta-cosas" className="m-0 font-display text-[22px] font-[650] leading-7">Lo que guardaste</h2>
    {stash === null
      ? <p role="status" className="m-0 text-chico text-tinta-suave">Buscando lo que guardaste…</p>
      : <div className="grid gap-space-3 min-[701px]:grid-cols-2">
        {stashTiles(stash).map(tile => <Link key={tile.href} href={tile.href} className="grid gap-[2px] rounded-md border border-solid border-linea bg-papel p-space-4 text-inherit no-underline hover:border-pino focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
          <b className="font-display text-[30px] font-bold leading-[34px]">{tile.count}</b>
          <span className="text-chico text-tinta-suave">{tile.text}</span>
        </Link>)}
      </div>}
  </section>;
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<AccessTab>("login");
  const [googleActive, setGoogleActive] = useState(false);
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState(false);
  const [pendingName, setPendingName] = useState("");

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
        // El registro solo lleva correo y contraseña: el nombre opcional se guarda al entrar por primera vez.
        setPendingName(String(data.get("display_name") ?? "").trim());
        setMode("login");
        setCreated(true);
      } else {
        const signedIn = await response.json();
        setUser(signedIn);
        setNotice("Sesión iniciada.");
        await authRequest("csrf"); // Cookie and CSRF rotate after login.
        if (pendingName && !validateDisplayName(pendingName)) {
          try { setUser(await saveDisplayName(pendingName)); } catch { /* El nombre es opcional: se puede cargar desde Tu cuenta. */ }
        }
        setPendingName("");
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

  // La cuenta ya no existe: se limpia lo que se ve, se avisa a la barra y se vuelve a la portada.
  function deleted() {
    setUser(null);
    window.dispatchEvent(new Event(sessionChangedEvent));
    router.replace("/");
  }

  const noscript = <noscript>Para gestionar tu sesión necesitás habilitar JavaScript. El catálogo sigue disponible.</noscript>;

  if (!user) return <section className="grid min-h-[720px] min-w-0 overflow-hidden rounded-lg bg-papel-alto min-[901px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" aria-busy={busy}>
    <section aria-label="UpgradeJusto" className="relative grid content-start gap-space-5 overflow-hidden bg-pino p-space-5 text-sobre-pino min-[901px]:grid-rows-[auto_1fr_auto] min-[901px]:gap-space-6 min-[901px]:p-space-7">
      <div className="relative z-[1] grid gap-space-5 self-center">
        <h1 className="m-0 max-w-[12ch] font-display text-[34px] font-bold leading-10 tracking-[-0.02em] min-[901px]:text-[48px] min-[901px]:leading-[52px]">Tu PC puede dar <mark className="rounded-sm bg-lima px-[.12em] text-sobre-lima">más</mark>.</h1>
        <ul className="m-0 hidden list-none gap-space-3 p-0 text-cuerpo-l min-[901px]:grid">
          {BRAND_PROMESAS.map(item => <li key={item} className="flex items-start gap-space-3"><Check aria-hidden="true" className="mt-[2px] size-6 flex-none text-lima" strokeWidth={2.25} />{item}</li>)}
        </ul>
      </div>
      <p className="relative z-[1] m-0 hidden text-[15px] leading-[22px] opacity-90 min-[901px]:block">Te decimos qué te conviene, cuánto cuesta y si encaja. Lo que no sabemos, te lo decimos también.</p>
      <span aria-hidden="true" className="absolute -bottom-[50px] -right-[60px] h-[120px] w-[200px] -rotate-12 rounded-pill bg-lima opacity-90 min-[901px]:-bottom-[60px] min-[901px]:-right-[80px] min-[901px]:h-[200px] min-[901px]:w-[320px]" />
      <span aria-hidden="true" className="absolute -bottom-[110px] right-[140px] hidden h-[160px] w-[200px] rotate-[8deg] rounded-pill bg-pino-suave opacity-35 min-[901px]:block" />
    </section>
    <div className="grid content-center justify-items-center p-space-5 min-[901px]:p-space-7">
      <div className="grid w-full max-w-[440px] gap-space-5">
        <AccountAccess
          tab={mode} busy={busy} locked={googleActive} email={email} error={error} created={created} createdName={pendingName} statusText={busy ? "Consultando tu sesión…" : notice}
          onTabChange={changeTab} onEmailChange={setEmail} onSubmit={submit}
          alternative={!busy && <GoogleSignIn key={mode} register={mode === "register"} onUser={setUser} onActiveChange={setGoogleActive} />}
        />
        <p className="m-0 text-center text-[15px] leading-[22px] text-tinta-suave">¿Solo querés mirar? <Link href="/catalog" className="font-semibold text-pino">Seguí sin cuenta</Link>. Para guardar tu PC y tu plan vas a necesitar una.</p>
        <p className="m-0 flex gap-space-2 border-t border-solid border-linea pt-space-4 text-chico font-medium text-tinta-suave"><Lock aria-hidden="true" className="size-[18px] flex-none text-pino" />Tus PCs, planes y charlas son privados. Solo se ve un plan si vos lo compartís, y podés dejar de compartirlo cuando quieras.</p>
        {noscript}
      </div>
    </div>
  </section>;

  return <section className="grid min-w-0" aria-busy={busy}>
    <header className="grid gap-space-2 pb-space-6 pt-space-7">
      <h1 className="m-0 font-display text-[36px] font-bold leading-10 tracking-[-0.02em] min-[701px]:text-[48px] min-[701px]:leading-[52px]">Tu cuenta</h1>
      <p className="m-0 text-cuerpo-l text-tinta-suave">Tus datos y lo que guardaste. Nada de esto lo ve nadie más.</p>
    </header>
    <div role="status" aria-label="Estado de cuenta" className="pb-space-4 text-chico text-tinta-suave empty:hidden">{busy ? "Consultando tu sesión…" : notice}</div>
    {error && <div className="pb-space-4"><Notice tono="no" titulo="No pudimos continuar">{error}</Notice></div>}
    <div className="grid min-w-0 items-start gap-space-6 min-[1051px]:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid min-w-0 gap-space-5">
        <NameSection key={user.id} user={user} onUser={setUser} />
        <PasswordSection user={user} />
        <SavedSection />
        <DeleteSection user={user} onDeleted={deleted} />
      </div>
      <aside className="grid min-w-0 gap-space-4 min-[1051px]:sticky min-[1051px]:top-space-5">
        <div className={card}>
          <h2 className={cardTitulo}>Tu privacidad</h2>
          <ul className="m-0 grid list-none gap-space-2 p-0 text-[15px] leading-[22px]">
            {PRIVACIDAD.map(item => <li key={item} className="flex gap-space-2"><Check aria-hidden="true" className="mt-[2px] size-[18px] flex-none text-pino" strokeWidth={2.25} />{item}</li>)}
          </ul>
        </div>
        <div className={card}>
          <h2 className={cardTitulo}>Salir</h2>
          <p className="m-0 text-tinta-suave">Cerrá la sesión si usás una compu que no es tuya.</p>
          <Button peso="secundario" disabled={busy} onClick={logout}>Cerrar sesión</Button>
        </div>
      </aside>
    </div>
    <div className="mt-space-8 flex flex-wrap justify-between gap-space-4 border-t border-solid border-linea py-space-6 text-chico text-tinta-suave">
      <span>¿Algo no anda? Escribinos y te respondemos.</span>
      <span><Link href="/" className="text-pino">Volver al inicio</Link></span>
    </div>
    {noscript}
  </section>;
}
