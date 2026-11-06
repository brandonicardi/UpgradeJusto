"use client";

import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { Button, Notice } from "./uj";
import {
  ACCESS_TABS,
  createdAnnouncement,
  createdNotice,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_RULE,
  accessIds,
  describeAccessError,
  nextTab,
  type AccessTab,
} from "../lib/account-access";
import { DISPLAY_NAME_MAX } from "../lib/account-settings";

export type AccountAccessProps = {
  tab: AccessTab;
  busy: boolean;
  /** Bloquea el formulario local mientras hay un intento con Google en curso. */
  locked: boolean;
  email: string;
  error: string;
  created: boolean;
  /** Nombre que la persona escribió al crear la cuenta, para saludarla en el aviso. */
  createdName?: string;
  /** Estado de la operación en curso (por ejemplo, «Consultando tu sesión…»). */
  statusText: string;
  onTabChange: (tab: AccessTab) => void;
  onEmailChange: (email: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Acceso alternativo, debajo del formulario. */
  alternative?: ReactNode;
};

const TAB_BASE =
  "min-h-11 cursor-pointer rounded-pill border-0 px-space-4 font-sans-uj text-cuerpo-fuerte hover:filter-none " +
  "disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
const ETIQUETA = "text-cuerpo-fuerte";
const CAMPO =
  "block min-h-12 w-full rounded-sm border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-4 py-space-3 font-sans-uj text-cuerpo text-tinta " +
  "placeholder:text-tinta-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

/**
 * Contraseña con «Mostrar / Ocultar»; el valor nunca pasa por el estado de React:
 * solo se guarda cuántos caracteres lleva, para tildar la regla de largo.
 */
function PasswordField({ id, etiqueta, register }: { id: string; etiqueta: string; register: boolean }) {
  const [shown, setShown] = useState(false);
  const [length, setLength] = useState(0);
  const cumple = length >= PASSWORD_MIN && length <= PASSWORD_MAX;
  return (
    <div className="grid w-full content-start gap-space-2">
      <label htmlFor={id} className={ETIQUETA}>{etiqueta}</label>
      <div className="relative">
        <input id={id} name="password" type={shown ? "text" : "password"} required maxLength={PASSWORD_MAX} onInput={(event) => setLength(event.currentTarget.value.length)} autoComplete={register ? "new-password" : "current-password"} aria-describedby={register ? `${id}-reglas` : undefined} className={`${CAMPO} pr-24`} />
        <button
          type="button"
          aria-controls={id}
          aria-pressed={shown}
          onClick={() => setShown(!shown)}
          className="absolute right-[6px] top-1/2 min-h-9 -translate-y-1/2 cursor-pointer rounded-sm border-0 bg-transparent px-space-3 font-sans-uj text-[14px] font-semibold leading-5 text-pino underline underline-offset-[3px] hover:filter-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          {shown ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {register && (
        <ul id={`${id}-reglas`} className="m-0 flex list-none flex-wrap gap-x-space-4 gap-y-space-2 p-0 text-[14px] font-medium leading-5">
          <li className={`inline-flex items-center gap-space-1 ${cumple ? "text-tinta" : "text-tinta-suave"}`} data-cumple={cumple}>
            {cumple ? <Check aria-hidden="true" className="size-4 text-pino" strokeWidth={2.25} /> : <Circle aria-hidden="true" className="size-4" strokeWidth={2.25} />}
            {PASSWORD_RULE}
            <span className="sr-only">{cumple ? ": listo" : ": todavía no"}</span>
          </li>
        </ul>
      )}
    </div>
  );
}

export default function AccountAccess(props: AccountAccessProps) {
  const { tab, busy, locked, email, error, created, createdName = "", statusText, onTabChange, onEmailChange, onSubmit, alternative } = props;
  const notice = createdNotice(createdName);
  const ids = accessIds(tab);
  const register = tab === "register";
  const failure = error ? describeAccessError(error, tab) : null;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const next = nextTab(tab, event.key);
    if (!next) return;
    event.preventDefault();
    onTabChange(next);
    document.getElementById(accessIds(next).tab)?.focus();
  }

  return (
    <div className="grid w-full min-w-0 gap-space-5 font-sans-uj text-tinta">
      <div role="tablist" aria-label="Elegí una opción" className="grid grid-cols-2 rounded-pill bg-papel-hundido p-[4px]">
        {ACCESS_TABS.map((item) => {
          const selected = item.id === tab;
          const itemIds = accessIds(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={itemIds.tab}
              aria-selected={selected}
              aria-controls={itemIds.panel}
              tabIndex={selected ? 0 : -1}
              disabled={busy}
              onClick={() => onTabChange(item.id)}
              onKeyDown={onKeyDown}
              className={`${TAB_BASE} ${selected ? "bg-papel-alto text-tinta shadow-[var(--sombra-1)]" : "bg-transparent text-tinta-suave"}`}
            >
              {item.etiqueta}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="grid gap-space-5">
        <h2 className="m-0 font-display text-titular-l">{register ? "Creá tu cuenta" : "Hola de nuevo"}</h2>
        {register && <p className="m-0 -mt-space-3 text-tinta-suave">Es gratis y te lleva un minuto.</p>}
        <form onSubmit={onSubmit} aria-labelledby={ids.tab} className="grid gap-space-4">
          {failure && <Notice tono="no" titulo={failure.titulo}>{failure.cuerpo}</Notice>}
          <fieldset disabled={busy || locked} className="m-0 grid min-w-0 gap-space-4 border-0 p-0">
            {register && (
              <div className="grid w-full content-start gap-space-2">
                <label htmlFor="acceso-nombre" className={ETIQUETA}>¿Cómo te llamamos? <span className="font-medium text-tinta-suave">(opcional)</span></label>
                <input id="acceso-nombre" name="display_name" autoComplete="given-name" maxLength={DISPLAY_NAME_MAX} placeholder="Tu nombre o apodo" className={CAMPO} />
              </div>
            )}
            <div className="grid w-full content-start gap-space-2">
              <label htmlFor="acceso-email" className={ETIQUETA}>Tu correo</label>
              <input
                id="acceso-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                placeholder="nombre@correo.com"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                className={CAMPO}
              />
            </div>
            <PasswordField key={tab} id="acceso-password" etiqueta={register ? "Elegí una contraseña" : "Tu contraseña"} register={register} />
            <div className="grid [&>button]:w-full">
              <Button peso="principal" type="submit">{register ? "Crear mi cuenta" : "Entrar"}</Button>
            </div>
          </fieldset>
        </form>
      </div>

      <div role="status" aria-label="Estado de cuenta" className="grid gap-space-3 empty:hidden">
        {statusText && <p className="m-0 text-chico text-tinta-suave">{statusText}</p>}
        {created && (
          <>
            <p className="sr-only">{createdAnnouncement(createdName)}</p>
            <div aria-hidden="true"><Notice tono="encaja" titulo={notice.titulo}>{notice.cuerpo}</Notice></div>
          </>
        )}
      </div>

      {alternative && (
        <>
          <div aria-hidden="true" className="grid grid-cols-[1fr_auto_1fr] items-center gap-space-3 text-chico font-semibold text-tinta-suave before:h-px before:bg-linea before:content-[''] after:h-px after:bg-linea after:content-['']">o</div>
          <div className="grid min-w-0 gap-space-3 [&_button]:w-full [&_p]:m-0">{alternative}</div>
        </>
      )}
    </div>
  );
}
