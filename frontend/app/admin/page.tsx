"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminExamples, attributeKeys } from "../../lib/admin-contract";
import { collectionKeys, curationRequest, parseAdminData, type AdminPage, type Collection, type Revision, type Row } from "../../lib/curation";
import { money } from "../../lib/presentation";

const collectionLabels: Record<Collection, string> = { components: "Componentes", prices: "Precios históricos", sources: "Fuentes documentadas", cpu_support: "Soporte de procesadores" };
function rowLabel(row: Row, collection: Collection, index: number): string {
  if (typeof row.data.name === "string") return row.data.name;
  if (collection === "prices" && typeof row.data.amount === "string" && typeof row.data.currency === "string") return `Precio histórico · ${money(row.data.amount, row.data.currency)}`;
  return `${collectionLabels[collection]} · Registro ${index + 1}`;
}

export default function Administration() {
  const [revisions, setRevisions] = useState<AdminPage<Revision> | null>(null);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [collection, setCollection] = useState<Collection>("sources");
  const [rows, setRows] = useState<AdminPage<Row> | null>(null);
  const [row, setRow] = useState<Row | null>(null), [json, setJson] = useState("{}");
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [publishConfirmed, setPublishConfirmed] = useState(false), [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const lock = useRef(false);
  const root = "/api/admin/revisions";
  const active = revisions?.items.find(r => r.active);
  const readonly = selected?.status !== "draft";
  async function list(offset = 0) {
    const page: AdminPage<Revision> = await (await curationRequest(`${root}?limit=100&offset=${offset}`)).json();
    setRevisions(page); return page;
  }
  useEffect(() => {
    let mounted = true;
    void curationRequest(`${root}?limit=100&offset=0`).then(r => r.json()).then(data => { if (mounted) setRevisions(data); }).catch(failure => { if (mounted) setError(failure instanceof Error ? failure.message : "Acceso no disponible."); }).finally(() => { if (mounted) setBusy(false); });
    return () => { mounted = false; };
  }, []);
  async function operation(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Solicitud no completada. Revisá revisiones antes de reenviar."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function loadRows(revision: Revision, coll: Collection, offset = 0) {
    const data = await (await curationRequest(`${root}/${revision.id}/${coll}?limit=25&offset=${offset}`)).json();
    setSelected(revision); setCollection(coll); setRows(data); setRow(null); setJson("{}"); setPublishConfirmed(false); setDeleteConfirmed(false);
  }
  async function create() {
    if (!active) return;
    const draft = await (await curationRequest(root, "POST", { base_version: active.id })).json();
    await list(0); await loadRows({ ...draft, active: false }, collection); setNotice("Borrador creado en PostgreSQL, basado en la activa.");
  }
  async function save() {
    if (!selected || readonly) return;
    const data = parseAdminData(json, collection);
    await curationRequest(`${root}/${selected.id}/${collection}${row ? `/${row.id}` : ""}`, row ? "PATCH" : "POST", { data });
    await loadRows(selected, collection, rows?.offset ?? 0); setNotice("Fila guardada en borrador; todavía no publicada.");
  }
  async function publish() {
    if (!selected || !active || !publishConfirmed || readonly) return;
    const result = await (await curationRequest(`${root}/${selected.id}/publish`, "POST", { expected_active_version: active.id })).json();
    await list(0); await loadRows({ ...selected, status: "published", active: true, id: result.dataset_version }, collection);
    setNotice("Revisión publicada e inmutable. Las evaluaciones guardadas no se editan.");
  }
  return <section aria-busy={busy} className="space-y-5">
    <header className="page-heading"><p className="eyebrow">CURACIÓN CON TRAZABILIDAD</p><h1>Administrar catálogo y parámetros soportados</h1><p className="muted">Prepará cambios en un borrador y publicalos sólo después de revisarlos.</p></header>
    <p className="muted">Cada operación requiere permiso del servidor. <Link href="/account">Iniciar sesión con cuenta existente</Link></p>
    <p role="status">{busy ? "Consultando el servidor…" : notice}</p>
    {error && <p role="alert" className="notice">{error}</p>}
    <button className="secondary" disabled={busy} onClick={() => operation(async () => { await list(0); })}>Consultar revisiones</button>
    <div className="admin-workspace">
    {revisions && <section className="surface stack" aria-label="Revisiones del catálogo">
      <h2 className="text-xl font-bold">Revisiones</h2>
      <p className="muted">{active ? "✓ Publicación activa identificada por el servidor" : "Activa no localizada: volvé a la primera página antes de crear o publicar."}</p>
      <p>{revisions.total} revisiones. Etiquetas de estado: borrador privado / publicación inmutable.</p>
      <ul className="revision-list">{revisions.items.map((revision, index) => <li key={revision.id}><button className="secondary" data-revision-id={revision.id} aria-pressed={selected?.id === revision.id} disabled={busy} onClick={() => operation(() => loadRows(revision, collection))}>{revision.status === "draft" ? "Borrador privado" : "Publicación inmutable"}{revision.active ? " · Activa" : ` · ${index + 1}`}</button></li>)}</ul>
      <button disabled={busy || !active} onClick={() => operation(create)}>Crear borrador desde activa</button>
      <nav aria-label="Páginas de revisiones" className="flex gap-3"><button disabled={busy || !revisions.offset} onClick={() => operation(async () => { await list(Math.max(0, revisions.offset - 100)); })}>Revisiones anteriores</button><button disabled={busy || revisions.offset + revisions.limit >= revisions.total} onClick={() => operation(async () => { await list(revisions.offset + revisions.limit); })}>Más revisiones</button></nav>
    </section>}
    {selected && <section className="surface stack" aria-label="Detalle de revisión" aria-busy={busy}>
      <h2 className="text-xl font-bold">Detalle: {selected.status === "draft" ? "Borrador privado" : "Publicación inmutable"}</h2>
      <details className="accordion"><summary>Identificación de revisión y base</summary><p>Versión técnica: {selected.id} · Base: {selected.base_version ?? "Sin base"}</p></details>
      {readonly && <p>Solo lectura. Para corregir, creá otra revisión desde la activa.</p>}
      <label className="block" htmlFor="admin-collection">Colección</label>
      <select id="admin-collection" disabled={busy} value={collection} onChange={event => { const value = event.target.value as Collection; void operation(() => loadRows(selected, value)); }}>{(Object.keys(collectionKeys) as Collection[]).map(key => <option key={key} value={key}>{collectionLabels[key]}</option>)}</select>
      {rows && <><p className="muted">{rows.total} registros · Mostrando desde {rows.offset + 1}</p><div className="table-scroll"><table className="admin-table"><thead><tr><th>Registro</th><th>Datos</th></tr></thead><tbody>{rows.items.map((item, index) => <tr key={item.id}><td>{rowLabel(item, collection, index)}</td><td><button className="secondary" aria-label={`Ver fila ${item.id}`} disabled={busy} onClick={() => { setRow(item); setJson(JSON.stringify(item.data, null, 2)); setDeleteConfirmed(false); }}>Revisar</button><details><summary>Datos completos</summary><pre className="technical-json">{JSON.stringify(item.data, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
        <nav aria-label="Páginas de filas" className="flex gap-3"><button disabled={busy || !rows.offset} onClick={() => operation(() => loadRows(selected, collection, Math.max(0, rows.offset - 25)))}>Filas anteriores</button><button disabled={busy || rows.offset + rows.limit >= rows.total} onClick={() => operation(() => loadRows(selected, collection, rows.offset + 25))}>Más filas</button></nav></>}
      <details><summary>Contrato de datos y ejemplos a reemplazar (no evidencia real)</summary>
        <p>Solo JSON, nunca código, SQL, reglas arbitrarias ni DSL. Campos POST obligatorios: {collectionKeys[collection].join(", ")}. PATCH acepta esos campos parciales; objetos y listas anidados se reemplazan completos. El servidor valida tipos y referencias.</p>
        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(adminExamples[collection], null, 2)}</pre>
        <p>Los marcadores REEMPLAZAR, example.test y YYYY-MM-DD son placeholders explícitos: no guardar como evidencia. IDs nuevos los genera el servidor.</p>
        <p>Precios: importe decimal string no negativo, hasta dos decimales y 999999999999.99, ARS, fecha y procedencia obligatorias. Sin fila = desconocido, no cero. Gastos excluidos: envío, financiación y mano de obra; no se computan como cero.</p>
        <p>Fuentes HTTP(S) sin credenciales; par source_id/url único. Componentes requieren fuentes existentes. Atributos string o null, installed_bios solo null. Sin id, image ni prices en components.</p>
        <pre className="whitespace-pre-wrap">{JSON.stringify(attributeKeys, null, 2)}</pre>
        <p>CPU support: observaciones documentadas con evidencia no vacía; modelo, revisión y BIOS exactos. EvidenceRef: source_id, url, locator, consulted_on; par/fecha deben existir en fuentes. Sin SemVer, aliases ni comparación lexicográfica de BIOS. No inventar tolerancias.</p>
      </details>
      {!readonly && <>
        <button disabled={busy} onClick={() => { setRow(null); setJson("{}"); setDeleteConfirmed(false); }}>Preparar nueva fila</button>
        <details className="accordion" open={row !== null}><summary>Editar datos técnicos del borrador</summary><label className="block" htmlFor="admin-row-json">Datos JSON de la fila</label>
        <textarea id="admin-row-json" rows={14} disabled={busy} data-row-selected={row !== null} value={json} onChange={event => setJson(event.target.value)} spellCheck={false} />
        <p>{row ? `PATCH fila ${row.id}` : "POST nueva fila"}. Validación de campos/tipos y publicación a cargo del servidor.</p>
        <button disabled={busy} onClick={() => operation(save)}>Guardar fila en borrador</button>
        </details>
        {row && <><label className="flex gap-3"><input className="w-auto" type="checkbox" checked={deleteConfirmed} disabled={busy} onChange={event => setDeleteConfirmed(event.target.checked)} />Confirmo eliminar esta fila del borrador</label><button disabled={busy || !deleteConfirmed} onClick={() => operation(async () => { await curationRequest(`${root}/${selected.id}/${collection}/${row.id}`, "DELETE"); await loadRows(selected, collection, rows?.offset ?? 0); setNotice("Fila eliminada del borrador."); })}>Eliminar fila</button></>}
        <label className="flex gap-3"><input className="w-auto" type="checkbox" checked={publishConfirmed} disabled={busy} onChange={event => setPublishConfirmed(event.target.checked)} />Confirmo publicar revisión inmutable con la activa esperada</label>
        <button disabled={busy || !publishConfirmed || !active} onClick={() => operation(publish)}>Publicar revisión</button>
        <details className="accordion"><summary>Control de publicación</summary><p>Activa esperada: {active?.id ?? "No disponible"}. Un conflicto 409 requiere revisar versiones. Sin reintento automático.</p></details>
      </>}
    </section>}
    </div>
  </section>;
}
