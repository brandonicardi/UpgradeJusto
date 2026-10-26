"use client";
import { useEffect, useState, type FormEvent } from "react";
import { shareInput, shareRequest, shareError, validPublicPath, type ShareCreated, type ShareMetadata } from "../../lib/shares";

export default function Shares({ planId, revision, disabled }: { planId: string; revision: number; disabled: boolean }) {
  const [items, setItems] = useState<ShareMetadata[] | null>(null), [latest, setLatest] = useState<ShareCreated | null>(null);
  const [title, setTitle] = useState(""), [confirmed, setConfirmed] = useState(false), [revoking, setRevoking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  async function load() {
    const data = await (await shareRequest(planId)).json();
    // Never retain an unexpected token/path from a metadata list.
    setItems(data.items.map((item: ShareMetadata) => ({ id: item.id, title: item.title, plan_revision: item.plan_revision, created_at: item.created_at, revoked_at: item.revoked_at })));
  }
  useEffect(() => {
    let active = true;
    async function initial() {
      try {
        const data = await (await shareRequest(planId)).json();
        if (active) setItems(data.items.map((item: ShareMetadata) => ({ id: item.id, title: item.title, plan_revision: item.plan_revision, created_at: item.created_at, revoked_at: item.revoked_at })));
      } catch { if (active) setError("No se pudieron consultar metadatos de publicaciones."); }
    }
    void initial(); return () => { active = false; };
  }, [planId]);
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setLatest(null);
    try {
      if (!confirmed) throw new Error("Confirmá los datos técnicos que serán públicos.");
      const response = await shareRequest(planId, "POST", shareInput(revision, title));
      if (response.status !== 201) throw new Error(shareError(503));
      const data = await response.json();
      if (!validPublicPath(data.path)) throw new Error(shareError(503));
      setLatest({ id: data.id, plan_revision: data.plan_revision, title: data.title, created_at: data.created_at, path: data.path });
      setConfirmed(false); setNotice("Publicación creada. El enlace solo se muestra ahora; guardalo de forma segura si querés compartirlo.");
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : shareError(503)); }
    finally { setBusy(false); }
  }
  async function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!revoking) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await shareRequest(planId, "DELETE", undefined, revoking);
      if (latest?.id === revoking) setLatest(null);
      setRevoking(null); setNotice("Publicación revocada. Nuevas lecturas quedan denegadas; no borra copias ya vistas."); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : shareError(503)); }
    finally { setBusy(false); }
  }
  return <section aria-label="Publicaciones del plan" aria-busy={busy} className="border-t pt-4 space-y-4">
    <p className="eyebrow">MOSTRÁ TU PLAN, NO TU CUENTA</p><h3>Compartir una copia de solo lectura</h3>
    <p className="muted">El enlace muestra esta revisión guardada, no los cambios posteriores del plan. Compartir no resuelve datos pendientes.</p>
    <p className="muted">Cualquiera que tenga el enlace puede leerlo. No vence automáticamente; podés revocarlo.</p>
    <p role="status" aria-label="Estado de publicaciones">{busy ? "Consultando publicaciones…" : notice}</p>
    {error && <p role="alert">{error}</p>}
    <form aria-label="Publicar snapshot" onSubmit={publish}><fieldset disabled={busy || disabled} className="space-y-3">
      <legend>Confirmación de contenido público</legend>
      <label className="block" htmlFor="share-title">Título público de publicación</label><input id="share-title" required maxLength={100} value={title} onChange={event => { setTitle(event.target.value); setConfirmed(false); }} />
      <div className="notice"><p>Serán públicos el título y los datos técnicos: piezas, BIOS necesaria, presupuesto, etapas, costes, fuentes y evaluaciones con sus faltantes. No incluyas datos personales en el título.</p><details><summary>Privacidad y revocación</summary><p>No se publican cuenta/email, IDs privados, notas libres ni conversación. Revocar deniega nuevas lecturas; no borra copias ni cancela respuestas ya iniciadas.</p><p>Revisión que se publica: {revision}.</p></details></div>
      <label className="block"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo publicar estos datos técnicos de esta revisión como copia de solo lectura</label>
      <button type="submit" disabled={!confirmed}>Publicar revisión confirmada</button>
    </fieldset></form>
    {latest && <section aria-label="Enlace recién creado" className="panel space-y-3"><p>Enlace disponible solo en memoria de esta vista. No se recupera desde el listado ni tras recargar.</p><label className="block" htmlFor="new-share-path">Ruta pública recién creada</label><input id="new-share-path" readOnly value={latest.path} /><a href={latest.path} target="_blank" rel="noreferrer noopener" referrerPolicy="no-referrer">Abrir publicación sin precarga</a><button type="button" onClick={() => setLatest(null)}>Ocultar enlace</button></section>}
    <button type="button" disabled={busy || disabled} onClick={async () => { setBusy(true); setError(""); try { await load(); } catch { setError("No se pudieron consultar metadatos de publicaciones."); } finally { setBusy(false); } }}>Recargar metadatos de publicaciones</button>
    {items && <ul aria-label="Metadatos de publicaciones" className="space-y-3">{items.map(item => <li key={item.id} className="border rounded p-3"><p>{item.title} · Revisión {item.plan_revision} · Creada {item.created_at} · {item.revoked_at ? `Revocada ${item.revoked_at}` : "Activa"}</p><p>No se recupera el enlace desde metadatos.</p><button disabled={busy || disabled || !!item.revoked_at} type="button" onClick={() => setRevoking(item.id)}>Preparar revocación: {item.title}</button></li>)}</ul>}
    {revoking && <form aria-label="Confirmar revocación" onSubmit={revoke}><fieldset disabled={busy || disabled}><legend>Revocar publicación permanentemente</legend><label><input type="checkbox" required />Confirmo revocar este enlace sin borrar el plan</label><button type="submit">Revocar publicación definitivamente</button><button type="button" onClick={() => setRevoking(null)}>Cancelar revocación</button></fieldset></form>}
  </section>;
}
