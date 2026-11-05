"use client";

import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { Button, Field, Notice } from "./uj";
import {
  ACCESS_TABS,
  CREATED_ANNOUNCEMENT,
  CREATED_NOTICE,
  PASSWORD_HELP,
  accessIds,
  describeAccessError,
  nextTab,
  type AccessTab,
} from "../lib/account-access";

export type AccountAccessProps = {
  tab: AccessTab;
  busy: boolean;
  /** Bloquea el formulario local mientras hay un intento con Google en curso. */
  locked: boolean;
  email: string;
  error: string;
  created: boolean;
  /** Estado de la operación en curso (por ejemplo, «Consultando tu sesión…»). */
  statusText: string;
  onTabChange: (tab: AccessTab) => void;
  onEmailChange: (email: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Acceso alternativo, debajo del formulario. */
  alternative?: ReactNode;
};

const TAB_BASE =
  "min-h-11 rounded-pill border-0 px-space-4 font-sans-uj text-cuerpo-fuerte cursor-pointer hover:filter-none " +
  "disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

export default function AccountAccess(props: AccountAccessProps) {
  const { tab, busy, locked, email, error, created, statusText, onTabChange, onEmailChange, onSubmit, alternative } = props;
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
    <div className="grid min-w-0 content-start gap-space-5 rounded-lg border border-linea bg-papel-alto p-space-5 font-sans-uj text-tinta shadow-[var(--sombra-1)] sm:p-space-6">
      <div role="status" aria-label="Estado de cuenta" className="grid gap-space-3 empty:hidden">
        {statusText && <p className="m-0 text-chico text-tinta-suave">{statusText}</p>}
        {created && (
          <>
            <p className="sr-only">{CREATED_ANNOUNCEMENT}</p>
            <div aria-hidden="true"><Notice tono="encaja" titulo={CREATED_NOTICE.titulo}>{CREATED_NOTICE.cuerpo}</Notice></div>
          </>
        )}
      </div>
      {failure && <Notice tono="no" titulo={failure.titulo}>{failure.cuerpo}</Notice>}

      <div role="tablist" aria-label="Elegí una opción" className="grid grid-cols-2 rounded-pill bg-papel-hundido p-space-1">
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

      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="grid gap-space-4">
        <h2 className="m-0 text-titular-m">{register ? "Creá tu cuenta" : "Hola de nuevo"}</h2>
        <form onSubmit={onSubmit} aria-labelledby={ids.tab}>
          <fieldset disabled={busy || locked} className="m-0 grid min-w-0 gap-space-4 border-0 p-0">
            <Field
              etiqueta="Email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              ayuda={register ? "Lo vas a usar para entrar." : "Usá el email con el que creaste tu cuenta."}
            />
            <Field
              key={tab}
              etiqueta="Contraseña"
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              ayuda={PASSWORD_HELP[tab]}
            />
            <div className="grid [&>button]:w-full">
              <Button peso="principal" type="submit">{register ? "Registrar cuenta" : "Entrar"}</Button>
            </div>
          </fieldset>
        </form>
      </div>

      {alternative && (
        <>
          <div aria-hidden="true" className="grid grid-cols-[1fr_auto_1fr] items-center gap-space-3 text-chico font-semibold text-tinta-suave before:h-px before:bg-linea before:content-[''] after:h-px after:bg-linea after:content-['']">o</div>
          <div className="grid min-w-0 gap-space-3 [&_button]:w-full [&_h2]:m-0 [&_h2]:text-cuerpo-fuerte [&_p]:m-0">{alternative}</div>
        </>
      )}
    </div>
  );
}
