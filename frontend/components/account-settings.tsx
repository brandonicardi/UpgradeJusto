"use client";

import { useEffect, useRef, useState, type FormEvent, type Ref } from "react";
import { Button, Field, Notice } from "./uj";
import { PASSWORD_MAX, PASSWORD_MIN } from "../lib/account-access";
import {
  AccountSettingsError, DISPLAY_NAME_MAX, canConfirmDelete, deleteBody, describeAccountFailure, isGoogleUser,
  passwordBody, saveDisplayName, sendAccountChange, validateDisplayName, validateNewPassword,
} from "../lib/account-settings";
import type { PublicUser } from "../lib/public-user";

const card = "grid min-w-0 content-start gap-space-4 rounded-lg border border-linea bg-papel-alto p-space-5 sm:p-space-6";
const acciones = "flex flex-wrap items-center gap-space-3";
const confirmacion = "text-chico font-semibold text-encaja";

function failureText(operation: "name" | "password" | "delete", failure: unknown): string {
  return failure instanceof AccountSettingsError ? failure.message : describeAccountFailure(operation, 503);
}

/** Vacía un campo de contraseña sin pasar por el estado de React. */
function clearField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) field.value = "";
}

function readField(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value : "";
}

export function NameSection({ user, onUser }: { user: PublicUser; onUser: (user: PublicUser) => void }) {
  const [name, setName] = useState(user.display_name ?? "");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(""); setError("");
    const invalid = validateDisplayName(name);
    setFieldError(invalid ?? "");
    if (invalid) return;
    setBusy(true);
    try {
      const next = await saveDisplayName(name);
      onUser(next);
      setName(next.display_name ?? "");
      setSaved("Guardado.");
    } catch (failure) { setError(failureText("name", failure)); }
    finally { setBusy(false); }
  }

  return <section className={card} aria-labelledby="cuenta-datos">
    <h2 id="cuenta-datos" className="m-0 text-titular-m">Tus datos</h2>
    <form onSubmit={submit} noValidate className="grid min-w-0 gap-space-4">
      <div className="grid min-w-0 gap-space-4 sm:grid-cols-2">
        <Field etiqueta="Cómo te llamamos" name="display_name" autoComplete="nickname" value={name} onChange={event => setName(event.target.value)}
          ayuda={`Así te saludamos. Hasta ${DISPLAY_NAME_MAX} caracteres.`} error={fieldError || undefined} />
        <Field etiqueta="Tu correo" name="email" readOnly value={user.email ?? ""} ayuda="Con este entrás. Para cambiarlo, escribinos." />
      </div>
      {error && <Notice tono="no" titulo="No pudimos guardar">{error}</Notice>}
      <div className={acciones}>
        <Button peso="principal" chico type="submit" disabled={busy} aria-busy={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
        <span role="status" className={`${confirmacion} empty:hidden`}>{saved}</span>
      </div>
    </form>
  </section>;
}

export function PasswordSection({ user }: { user: PublicUser }) {
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  if (isGoogleUser(user)) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    // Las contraseñas no se guardan en estado ni en el navegador: se leen del formulario y se vacían.
    const current = readField(form, "current_password");
    const next = readField(form, "new_password");
    setDone(""); setError("");
    const invalid = validateNewPassword(next);
    setFieldError(invalid ?? "");
    if (invalid) return;
    clearField(form, "current_password"); clearField(form, "new_password");
    setBusy(true);
    try {
      await sendAccountChange("password", passwordBody(current, next));
      setDone("Contraseña cambiada. Cerramos tus otras sesiones.");
    } catch (failure) { setError(failureText("password", failure)); }
    finally { setBusy(false); }
  }

  return <section className={card} aria-labelledby="cuenta-contrasena">
    <h2 id="cuenta-contrasena" className="m-0 text-titular-m">Contraseña</h2>
    <form onSubmit={submit} noValidate className="grid min-w-0 gap-space-4">
      <div className="grid min-w-0 gap-space-4 sm:grid-cols-2">
        <Field etiqueta="La que usás ahora" name="current_password" type="password" autoComplete="current-password" />
        <Field etiqueta="La nueva" name="new_password" type="password" autoComplete="new-password"
          ayuda={`Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres. Los espacios también cuentan.`} error={fieldError || undefined} />
      </div>
      {error && <Notice tono="no" titulo="No pudimos cambiarla">{error}</Notice>}
      <div className={acciones}>
        <Button peso="secundario" chico type="submit" disabled={busy} aria-busy={busy}>{busy ? "Cambiando…" : "Cambiar contraseña"}</Button>
        <span role="status" className={`${confirmacion} empty:hidden`}>{done}</span>
      </div>
    </form>
  </section>;
}

export type DeleteViewProps = {
  open: boolean;
  word: string;
  busy: boolean;
  error: string;
  needsPassword: boolean;
  onAsk: () => void;
  onWord: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formRef?: Ref<HTMLFormElement>;
};

export function DeleteView({ open, word, busy, error, needsPassword, onAsk, onWord, onCancel, onSubmit, formRef }: DeleteViewProps) {
  const ready = canConfirmDelete(word);
  return <section className="grid min-w-0 content-start gap-space-4 rounded-lg border border-dashed border-no-encaja bg-transparent p-space-5 sm:p-space-6" aria-labelledby="cuenta-borrar">
    <h2 id="cuenta-borrar" className="m-0 text-titular-m text-no-encaja">Borrar tu cuenta</h2>
    <p className="m-0 text-cuerpo text-tinta-suave">Se borran tus PCs, planes y charlas, y se apagan todos tus enlaces. No se puede deshacer.</p>
    <div><Button id="borrar-pedir" peso="quieto" chico onClick={onAsk} aria-expanded={open} aria-controls="borrar-confirmar">Quiero borrar mi cuenta</Button></div>
    {open && <form id="borrar-confirmar" ref={formRef} onSubmit={onSubmit} noValidate autoComplete="off" className="grid min-w-0 gap-space-4">
      <Field etiqueta={"Para confirmar, escribí BORRAR"} name="confirmacion" autoComplete="off" value={word} onChange={event => onWord(event.target.value)} />
      {needsPassword && <Field etiqueta="Tu contraseña de ahora" name="password" type="password" autoComplete="current-password" />}
      {error && <Notice tono="no" titulo="No se borró nada">{error}</Notice>}
      <div className={acciones}>
        <Button peso="peligro" chico type="submit" disabled={busy || !ready} aria-busy={busy} motivo={ready ? undefined : "Escribí BORRAR para poder borrar"}>{busy ? "Borrando…" : "Borrar todo"}</Button>
        <Button peso="quieto" chico onClick={onCancel} disabled={busy}>Mejor no</Button>
      </div>
    </form>}
  </section>;
}

export function DeleteSection({ user, onDeleted }: { user: PublicUser; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const needsPassword = !isGoogleUser(user);

  useEffect(() => {
    if (!open) return;
    const field = formRef.current?.elements.namedItem("confirmacion");
    if (field instanceof HTMLInputElement) field.focus();
  }, [open]);

  function cancel() {
    setOpen(false); setWord(""); setError("");
    document.getElementById("borrar-pedir")?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canConfirmDelete(word) || busy) return;
    const form = event.currentTarget;
    const password = readField(form, "password");
    clearField(form, "password");
    setBusy(true); setError("");
    try {
      await sendAccountChange("delete", deleteBody(user, password));
      onDeleted();
    } catch (failure) { setError(failureText("delete", failure)); setBusy(false); }
  }

  return <DeleteView open={open} word={word} busy={busy} error={error} needsPassword={needsPassword} formRef={formRef}
    onAsk={() => { setOpen(true); const field = formRef.current?.elements.namedItem("confirmacion"); if (field instanceof HTMLInputElement) field.focus(); }}
    onWord={setWord} onCancel={cancel} onSubmit={submit} />;
}
