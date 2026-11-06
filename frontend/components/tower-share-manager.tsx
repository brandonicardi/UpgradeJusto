"use client";
import { useEffect, useRef, useState } from "react";
import { parseCreatedShare, parseShareList, shareCreateInput, shareTitles, type ShareMetadata } from "../lib/tower-share-dto";
import { shareCreateUncertain, shareStateLabel, TowerShareError, towerShareRequest } from "../lib/tower-share-client";
import { displayRetailDate } from "../lib/retail-presentation";
import "../app/shared-tower-plans/share.css";

export default function TowerShareManager({ planId }: { planId: string }) {
  const [items, setItems] = useState<ShareMetadata[]>([]), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const [revision, setRevision] = useState<number | null>(null), [title, setTitle] = useState<string>(shareTitles[0]), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [token, setToken] = useState<string | null>(null), [notice, setNotice] = useState(""), [revoke, setRevoke] = useState<ShareMetadata | null>(null);
  const [listReady, setListReady] = useState(false);
  const [revokeConfirmed, setRevokeConfirmed] = useState(false);
  const revokeGeneration = useRef(0), revokeAbort = useRef<AbortController | null>(null);
  const lock = useRef(false), alive = useRef(true);
  const path = `/api/tower-plans/${planId}/shares`;
  useEffect(() => {
    alive.current = true; const abort = new AbortController();
    towerShareRequest(path, "GET", undefined, abort.signal).then(response => response.json()).then(data => { if (!abort.signal.aborted) { setItems(parseShareList(data).items); setListReady(true); } }).catch(failure => { if (!abort.signal.aborted) { setListReady(false); setNotice(failure instanceof TowerShareError ? failure.message : "Lista no disponible. No se confirma estado de enlaces."); } }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    // This read only enables creating. Its404 must NOT prevent listing/revoking.
    towerShareRequest(`/api/tower-plans/${planId}`, "GET", undefined, abort.signal).then(response => response.json()).then(data => { if (!abort.signal.aborted && data.kind === "tower_plan" && data.id === planId && Number.isSafeInteger(data.revision) && data.revision >= 1) { setRevision(data.revision); setConfirmed(false); } }).catch(() => { if (!abort.signal.aborted) setRevision(null); });
    return () => { alive.current = false; abort.abort(); revokeAbort.current?.abort(); };
  }, [path, planId, reload]);
  function refresh() { setLoading(true); setListReady(false); setRevision(null); setConfirmed(false); setItems([]); setReload(value => value + 1); }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || uncertain || revision === null || !confirmed) return;
    lock.current = true; setBusy(true); setToken(null); setNotice(""); let sent = false;
    try {
      const response = await towerShareRequest(path, "POST", shareCreateInput(revision, title, confirmed), undefined, () => { sent = true; });
      if (response.status !== 201) throw new TowerShareError(503);
      const result = parseCreatedShare(await response.json());
       if (alive.current) { setToken(result.token); setConfirmed(false); setNotice("Enlace creado. Se muestra una sola vez: copialo antes de salir."); refresh(); }
    } catch (failure) {
      if (alive.current) {
        const unknown = shareCreateUncertain(sent, failure); setUncertain(unknown);
        setNotice(unknown ? "No pudimos confirmar el resultado: puede haberse creado un enlace. Consultá la lista y apagalo si corresponde antes de crear otro. No se vuelve a enviar automáticamente." : failure instanceof TowerShareError ? `${failure.message}${failure.retryAfter ? ` Esperá ${failure.retryAfter} segundos.` : ""}` : "Revisá el plan, el título y la confirmación."); setConfirmed(false);
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function prepareRevoke(item: ShareMetadata | null) {
    if (lock.current) return;
    revokeAbort.current?.abort(); revokeAbort.current = null; revokeGeneration.current++;
    setRevokeConfirmed(false); setRevoke(item ? { ...item } : null);
  }
  async function revokeLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!revoke || !revokeConfirmed || lock.current) return;
    const captured = { ...revoke }, ticket = revokeGeneration.current, abort = new AbortController(); revokeAbort.current = abort; lock.current = true; setBusy(true);
    try { const result = await towerShareRequest(`${path}/${captured.id}`, "DELETE", { expected_plan_revision: captured.plan_revision }, abort.signal); if (result.status !== 204) throw new TowerShareError(503); if (alive.current && ticket === revokeGeneration.current) { setNotice("Revocación confirmada. Las copias ya vistas o las respuestas iniciadas no se eliminan."); setRevoke(null); setRevokeConfirmed(false); setToken(null); refresh(); } }
    catch (failure) { if (alive.current && ticket === revokeGeneration.current) { setRevokeConfirmed(false); setNotice(failure instanceof TowerShareError ? failure.message : "No se confirmó revocación. Consultá la lista sin reenviar automáticamente."); } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/shared-tower-plans/${token}` : null;
  return <section className="share-screen share-manager" aria-label="Gestión de enlaces de torre"><a href={`/tower-plans/${planId}`}>Volver al plan</a><header className="share-heading"><h1>Compartir tu plan</h1><p>Creá un enlace para cada persona. Así, si después no querés que alguien lo vea más, apagás solo el suyo.</p></header><p role="status">{notice}</p><div className="share-layout"><div className="share-main">
    <section className="share-card stack"><h2>Nuevo enlace</h2><form onSubmit={create} aria-label="Publicar copia de torre"><fieldset disabled={busy || loading || revision === null || uncertain} className="stack-sm">{revision === null && <p>No disponible para una nueva publicación.</p>}<label>Título público<select value={title} onChange={event => { setTitle(event.target.value); setConfirmed(false); setToken(null); }}>{shareTitles.map(value => <option key={value}>{value}</option>)}</select></label><label className="share-consent"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Entiendo qué datos se comparten y confirmo publicar una copia de este plan</label><button disabled={!confirmed}>Crear enlace público una vez</button></fieldset></form>{uncertain && <button type="button" className="secondary" disabled={busy} onClick={() => { setUncertain(false); setConfirmed(false); setToken(null); refresh(); }}>Consultar lista antes de crear otro enlace</button>}</section>
    {link && <section className="surface stack" aria-label="Enlace recién creado"><h2>Guardá este enlace ahora</h2><p>No se recupera desde la lista. Se pierde al salir de esta pantalla.</p><label>Enlace para copia manual<input readOnly value={link} /></label><div className="row wrap"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setNotice("Enlace copiado por tu acción. No se creó otro enlace."); } catch { setNotice("No se pudo copiar. Usá el campo de copia manual; no se creó otro enlace."); } }}>Copiar enlace creado</button><a href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir copia pública (otra pestaña)</a></div></section>}
    <section className="share-links"><h2>Tus enlaces</h2><button type="button" className="secondary" disabled={busy} onClick={refresh}>Consultar lista sin emitir enlaces</button>{loading ? <p>Consultando tus enlaces…</p> : !listReady ? <p>Listado no confirmado. Consultá de nuevo antes de decidir.</p> : !items.length ? <p>Todavía no hay enlaces para mostrar.</p> : <ul className="share-list">{items.map((item, index) => <li key={item.id} data-share-id={item.id}><div><h3>{item.title} · enlace {index + 1}</h3><p className="share-state">{shareStateLabel(item.effective_state)}</p><p>Creado {displayRetailDate(item.created_at)}</p>{item.revoked_at && <p>Revocado {displayRetailDate(item.revoked_at)}</p>}</div><button className="secondary" type="button" disabled={busy || item.effective_state === "revoked"} onClick={() => prepareRevoke(item)}>Preparar revocación del enlace {index + 1}</button></li>)}</ul>}</section>
    {revoke && <form key={`${revoke.id}:${revoke.plan_revision}`} aria-label="Confirmar revocación de torre" onSubmit={revokeLink} className="share-card stack"><h2>¿Apagar este enlace?</h2><p>{revoke.title} · creado {displayRetailDate(revoke.created_at)}</p><p>Se deshabilitan accesos futuros. Las copias ya vistas o las respuestas iniciadas no se eliminan. Si después te arrepentís, vas a tener que crear uno nuevo.</p><fieldset disabled={busy} className="stack-sm"><label className="share-consent"><input type="checkbox" required checked={revokeConfirmed} onChange={event => setRevokeConfirmed(event.target.checked)} />Confirmo deshabilitar futuros accesos de este enlace</label><button disabled={!revokeConfirmed}>Revocar enlace</button><button type="button" className="secondary" onClick={() => prepareRevoke(null)}>Cancelar revocación</button></fieldset></form>}
    </div><aside className="share-side"><section className="share-card"><h2>Lo que ve quien lo abre</h2><p>Las etapas, las piezas y los precios con su fecha.</p><p>Una copia de solo lectura. Los precios y el stock pueden haber cambiado.</p></section><section className="share-card"><h2>Lo que nunca ve</h2><ul><li>Tu correo ni tu nombre completo</li><li>Tus otras PCs y otros planes</li><li>Tus charlas con el asistente</li><li>Ningún botón para cambiar el plan</li></ul></section><section className="share-card"><h2>Antes de compartir</h2><p>No hay vista previa exacta antes de crear el enlace. Hay datos técnicos reservados: la copia puede necesitar verificación aunque una evaluación anterior indicara que encajaba.</p><p>Podés crear hasta 100 enlaces por plan, incluidos los apagados.</p></section></aside></div>
  </section>;
}
