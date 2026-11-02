"use client";
import { useEffect, useRef, useState } from "react";
import { parseCreatedShare, parseShareList, shareCreateInput, shareTitles, type ShareMetadata } from "../lib/tower-share-dto";
import { shareCreateUncertain, shareStateLabel, TowerShareError, towerShareRequest } from "../lib/tower-share-client";
import { displayRetailDate } from "../lib/retail-presentation";

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
      if (alive.current) { setToken(result.token); setConfirmed(false); setNotice("Enlace creado. El token se muestra sólo durante esta operación; copiá o abrí por acción explícita."); refresh(); }
    } catch (failure) {
      if (alive.current) {
        const unknown = shareCreateUncertain(sent, failure); setUncertain(unknown);
        setNotice(unknown ? "Resultado incierto: pudo crearse un enlace. Consultá la lista, revocá si corresponde y decidí explícitamente antes de emitir otro. No se reintenta CREATE." : failure instanceof TowerShareError ? `${failure.message}${failure.retryAfter ? ` Esperá ${failure.retryAfter} segundos.` : ""}` : "Revisá revisión, título y consentimiento."); setConfirmed(false);
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
  return <section className="tower-share-document stack" aria-label="Gestión de enlaces de torre"><header><h1>Compartir una copia de tu plan</h1><p>Gestión privada. Publicar no guarda ni aplica cambios a tu PC. Máximo100 emisiones por plan, incluidas las revocadas.</p></header><p role="status">{notice}</p>
    <section className="surface stack"><h2>Qué vas a publicar</h2><p>Una copia de sólo lectura de la revisión seleccionada, con título controlado, nueve categorías, cantidades, estados, cotizaciones históricas y evidencia pública disponible. Se reservan ciertos hechos técnicos y no se publican notas ni nombres privados según las reglas de proyección del servidor.</p><p>No hay vista previa exacta antes de emitir ni detector universal de datos personales. La copia puede requerir verificación aunque el motor histórico informara compatible. Stock/precio no se actualizan ni reservan.</p><form onSubmit={create} aria-label="Publicar copia de torre"><fieldset disabled={busy || loading || revision === null || uncertain} className="stack-sm"><p>Revisión privada seleccionada: {revision ?? "No disponible para nueva publicación"}</p><label>Título público<select value={title} onChange={event => { setTitle(event.target.value); setConfirmed(false); setToken(null); }}>{shareTitles.map(value => <option key={value}>{value}</option>)}</select></label><label className="share-consent"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Reconozco las reglas de publicación y los datos reservados; confirmo publicar esta revisión privada</label><button disabled={!confirmed}>Crear enlace público una vez</button></fieldset></form>{uncertain && <button type="button" className="secondary" disabled={busy} onClick={() => { setUncertain(false); setConfirmed(false); setToken(null); refresh(); }}>Revisar lista y preparar una nueva decisión de publicación</button>}</section>
    {link && <section className="surface stack" aria-label="Enlace recién creado"><h2>Guardá este enlace ahora</h2><p>No se recupera desde la lista. Se pierde al salir de esta pantalla.</p><label>Enlace para copia manual<input readOnly value={link} /></label><div className="row wrap"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setNotice("Enlace copiado por tu acción. No se creó otro enlace."); } catch { setNotice("No se pudo copiar. Usá el campo de copia manual; no se creó otro enlace."); } }}>Copiar enlace creado</button><a href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir copia pública (otra pestaña)</a></div></section>}
    <section><h2>Enlaces emitidos</h2><button type="button" className="secondary" disabled={busy} onClick={refresh}>Consultar lista sin emitir enlaces</button>{loading ? <p>Consultando metadata propia…</p> : !listReady ? <p>Listado no confirmado. Consultá de nuevo antes de decidir.</p> : !items.length ? <p>No hay enlaces informados en la lista disponible.</p> : <ul className="share-list">{items.map(item => <li key={item.id}><h3>{item.title}</h3><p>Enlace {item.id.slice(0, 8)} · revisión congelada {item.plan_revision} · {shareStateLabel(item.effective_state)}</p><p>Creado {displayRetailDate(item.created_at)} · revocado {item.revoked_at ? displayRetailDate(item.revoked_at) : "Sin fecha de revocación; no implica activo"}</p><p>Proyección {item.projection_version}</p><button className="secondary" type="button" disabled={busy || item.effective_state === "revoked"} onClick={() => prepareRevoke(item)}>Preparar revocación de revisión {item.plan_revision}</button></li>)}</ul>}</section>
    {revoke && <form key={`${revoke.id}:${revoke.plan_revision}`} aria-label="Confirmar revocación de torre" onSubmit={revokeLink} className="surface stack"><h2>Revocar {revoke.title} · enlace {revoke.id.slice(0, 8)} · revisión {revoke.plan_revision}</h2><p>Las copias ya vistas o las respuestas iniciadas no se eliminan. Se usa la revisión capturada de este enlace, no la revisión más nueva del plan.</p><fieldset disabled={busy} className="stack-sm"><label className="share-consent"><input type="checkbox" required checked={revokeConfirmed} onChange={event => setRevokeConfirmed(event.target.checked)} />Confirmo deshabilitar futuros accesos de este enlace</label><button disabled={!revokeConfirmed}>Revocar enlace</button><button type="button" className="secondary" onClick={() => prepareRevoke(null)}>Cancelar revocación</button></fieldset></form>}
  </section>;
}
