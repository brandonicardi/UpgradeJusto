"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Field, Notice } from "../../components/uj";
import { adminExamples, attributeKeys } from "../../lib/admin-contract";
import {
  affectedPcsLabel,
  dashboardCategoryLabels,
  dashboardRequest,
  formatInputARS,
  missingAttributeLabel,
  oldPriceAmountLabel,
  oldPriceDateLabel,
  normalizePriceAmount,
  publishPriceRequest,
  storeLabel,
  type AdminDashboard,
  type DashboardCategory,
  type MissingDataItem,
  type PublishPriceInput,
} from "../../lib/admin-dashboard";
import { collectionKeys, curationRequest, parseAdminData, type AdminPage, type Collection, type Revision, type Row } from "../../lib/curation";
import { money } from "../../lib/presentation";
import "./admin.css";

const collectionLabels: Record<Collection, string> = { components: "Componentes", prices: "Precios históricos", sources: "Fuentes documentadas", cpu_support: "Soporte de procesadores" };
function rowLabel(row: Row, collection: Collection, index: number): string {
  if (typeof row.data.name === "string") return row.data.name;
  if (collection === "prices" && typeof row.data.amount === "string" && typeof row.data.currency === "string") return `Precio histórico · ${money(row.data.amount, row.data.currency)}`;
  return `${collectionLabels[collection]} · Registro ${index + 1}`;
}

const SELECT = "block w-full min-h-12 rounded-sm border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-4 py-space-3 text-tinta text-cuerpo font-sans-uj focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

type PieceOption = { id: string; name: string; store: string; category: DashboardCategory };

function Dashboard({ onComplete }: { onComplete: (item: MissingDataItem) => void }) {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"datos" | "precios">("datos");

  // Formulario de carga de precio.
  const [pieceId, setPieceId] = useState("");
  const [amount, setAmount] = useState("");
  const [observedOn, setObservedOn] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [priceNotice, setPriceNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    dashboardRequest()
      .then((result) => { if (mounted) setData(result); })
      .catch((failure) => { if (mounted) setError(failure instanceof Error ? failure.message : "No se pudo consultar el tablero."); })
      .finally(() => { if (mounted) setBusy(false); });
    return () => { mounted = false; };
  }, []);

  const pieces = useMemo<PieceOption[]>(() => {
    const seen = new Set<string>();
    const result: PieceOption[] = [];
    for (const item of data?.old_prices.items ?? []) {
      if (seen.has(item.component_id)) continue;
      seen.add(item.component_id);
      result.push({ id: item.component_id, name: item.name, store: item.store, category: item.category });
    }
    return result;
  }, [data]);

  const selectedPiece = pieces.find((piece) => piece.id === pieceId) ?? null;
  const normalizedAmount = normalizePriceAmount(amount);
  const summaryReady = Boolean(selectedPiece && normalizedAmount !== null && observedOn && /^https?:\/\/\S+\.\S+/.test(sourceUrl.trim()));

  function resetPriceForm() {
    setPieceId(""); setAmount(""); setObservedOn(""); setSourceUrl(""); setConfirmed(false); setPriceError(""); setPriceNotice("");
  }

  function fillPrice(item: { component_id: string }) {
    setPieceId(item.component_id); setConfirmed(false); setPriceError(""); setPriceNotice("");
    document.getElementById("precio-monto")?.focus();
  }

  async function submitPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !selectedPiece || normalizedAmount === null || !confirmed || publishing) return;
    setPublishing(true); setPriceError(""); setPriceNotice("");
    const input: PublishPriceInput = {
      expected_active: data.dataset_version,
      component_id: selectedPiece.id,
      amount: normalizedAmount,
      observed_on: observedOn,
      source_url: sourceUrl.trim(),
    };
    try {
      await publishPriceRequest(input);
      const fresh = await dashboardRequest();
      setData(fresh); resetPriceForm();
      setPriceNotice("Precio publicado. La ficha y el catálogo ya lo muestran.");
    } catch (failure) {
      setPriceError(failure instanceof Error ? failure.message : "No se pudo publicar el precio.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="admin-dashboard" aria-busy={busy}>
      <header className="admin-head">
        <h1>Qué hay que atender</h1>
        <p>Piezas a las que les faltan datos y precios que ya están viejos. Sin datos, el revisor dice “Falta un dato”; sin precio reciente, la pieza no se recomienda.</p>
      </header>

      {busy && !data && !error && <p role="status">Consultando el tablero…</p>}
      {error && <Notice tono="no" titulo="No se pudo consultar el tablero">{error}</Notice>}

      {data && (
        <>
          <section className="admin-stats" aria-label="Resumen">
            <div className="admin-stat"><b>{data.metrics.components}</b><span>Piezas en el catálogo</span></div>
            <div className="admin-stat warn"><b>{data.metrics.missing_data}</b><span>Con datos faltantes</span></div>
            <div className="admin-stat bad"><b>{data.metrics.without_recent_price}</b><span>Sin precio de los últimos 7 días</span></div>
            <div className="admin-stat"><b>{data.metrics.stores}</b><span>Tiendas que usamos como fuente</span></div>
          </section>

          <div className="admin-body">
            <div className="admin-lists">
              <div className="admin-tabs" role="tablist" aria-label="Listados del tablero">
                <button className="admin-tab" role="tab" aria-selected={tab === "datos"} onClick={() => setTab("datos")}>Datos faltantes<span className="n">{data.missing_data.total}</span></button>
                <button className="admin-tab" role="tab" aria-selected={tab === "precios"} onClick={() => setTab("precios")}>Precios viejos<span className="n">{data.old_prices.total}</span></button>
              </div>

              {tab === "datos" && (
                <div className="admin-table" role="tabpanel">
                  <table>
                    <thead><tr><th>Pieza</th><th>Le falta</th><th>Afecta a</th><th></th></tr></thead>
                    <tbody>
                      {data.missing_data.items.map((item) => (
                        <tr key={item.component_id}>
                          <td>{item.name}<span className="sub">{dashboardCategoryLabels[item.category]}</span></td>
                          <td>{item.missing.map((attribute) => <span key={attribute} className="miss">{missingAttributeLabel(attribute)}</span>)}</td>
                          <td>{affectedPcsLabel(item.affected_pcs)}</td>
                          <td><Button peso="quieto" chico type="button" onClick={() => onComplete(item)}>Completar</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "precios" && (
                <div className="admin-table" role="tabpanel">
                  <table>
                    <thead><tr><th>Pieza</th><th>Último precio</th><th>Visto el</th><th></th></tr></thead>
                    <tbody>
                      {data.old_prices.items.map((item) => (
                        <tr key={item.component_id}>
                          <td>{item.name}<span className="sub">{dashboardCategoryLabels[item.category]}</span></td>
                          <td>{oldPriceAmountLabel(item.amount)}<span className="sub">{storeLabel(item.store)}</span></td>
                          <td className="old">{oldPriceDateLabel(item.observed_at, item.days)}</td>
                          <td><Button peso="quieto" chico type="button" onClick={() => fillPrice(item)}>Cargar precio</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <form className="admin-form" onSubmit={submitPrice} noValidate>
              <h2>Cargar un precio</h2>
              <p>Todos los campos son obligatorios. Un precio sin fuente o sin fecha no se publica.</p>

              <div className="grid w-full content-start gap-space-2 font-sans-uj text-tinta">
                <label htmlFor="precio-pieza" className="text-cuerpo-fuerte">Pieza</label>
                <select id="precio-pieza" className={SELECT} value={pieceId} onChange={(event) => { setPieceId(event.target.value); setConfirmed(false); setPriceError(""); setPriceNotice(""); }}>
                  <option value="">Elegí una</option>
                  {pieces.map((piece) => <option key={piece.id} value={piece.id}>{piece.name} · {storeLabel(piece.store)}</option>)}
                </select>
                <p className="m-0 text-chico text-tinta-suave">Elegí una del catálogo.</p>
              </div>

              <Field id="precio-monto" etiqueta="Monto" inputMode="numeric" placeholder="389900" value={amount} onChange={(event) => { setAmount(event.target.value); setConfirmed(false); }} ayuda="Precio de contado en pesos." />

              <Field etiqueta="Visto el" type="date" value={observedOn} onChange={(event) => { setObservedOn(event.target.value); setConfirmed(false); }} ayuda="No puede ser futura." />

              <Field etiqueta="Enlace donde lo viste" type="url" placeholder="https://" value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); setConfirmed(false); }} ayuda="Es la fuente que ve la gente al lado del precio." />

              {summaryReady && selectedPiece && normalizedAmount !== null && (
                <Notice tono="info" titulo="Resumen del precio">
                  {formatInputARS(normalizedAmount)} para «{selectedPiece.name}», visto el {observedOn.split("-").reverse().slice(0, 2).join("/")} en {storeLabel(selectedPiece.store)}. Al confirmar, se publica una revisión nueva que solo cambia esta oferta.
                </Notice>
              )}

              {priceNotice && <Notice tono="encaja" titulo="Listo">{priceNotice}</Notice>}
              {priceError && <Notice tono="no" titulo="No se publicó">{priceError}</Notice>}

              <label className="flex gap-space-3">
                <input className="w-auto" type="checkbox" checked={confirmed} disabled={publishing} onChange={(event) => setConfirmed(event.target.checked)} />
                Confirmo publicar este precio de contado.
              </label>

              <Button peso="principal" type="submit" disabled={publishing || !confirmed || !summaryReady}>Publicar precio</Button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}

function RevisionEditor({ pendingComplete, onPendingHandled }: { pendingComplete: MissingDataItem | null; onPendingHandled: () => void }) {
  const [revisions, setRevisions] = useState<AdminPage<Revision> | null>(null);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [collection, setCollection] = useState<Collection>("sources");
  const [rows, setRows] = useState<AdminPage<Row> | null>(null);
  const [row, setRow] = useState<Row | null>(null), [json, setJson] = useState("{}");
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [publishConfirmed, setPublishConfirmed] = useState(false), [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const lock = useRef(false);
  const pendingRef = useRef<MissingDataItem | null>(pendingComplete);
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
  useEffect(() => {
    if (pendingComplete) { pendingRef.current = pendingComplete; }
  }, [pendingComplete]);
  async function operation(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Solicitud no completada. Revisá revisiones antes de reenviar."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function loadRows(revision: Revision, coll: Collection, offset = 0) {
    const data = await (await curationRequest(`${root}/${revision.id}/${coll}?limit=25&offset=${offset}`)).json();
    setSelected(revision); setCollection(coll); setRows(data); setRow(null); setJson("{}"); setPublishConfirmed(false); setDeleteConfirmed(false);
    return data as AdminPage<Row>;
  }
  async function create() {
    if (!active) return;
    const draft = await (await curationRequest(root, "POST", { base_version: active.id })).json();
    await list(0);
    if (pendingRef.current) {
      const target = pendingRef.current;
      const page = await loadRows({ ...draft, active: false }, "components");
      const match = page.items.find(r => r.id === target.component_id);
      if (match) { setRow(match); setJson(JSON.stringify(match.data, null, 2)); setNotice("Borrador creado. La pieza quedó abierta en el editor para completar sus datos."); }
      else { setNotice("Borrador creado, pero la pieza no aparece entre los componentes de este borrador."); }
      pendingRef.current = null;
      onPendingHandled();
    } else {
      await loadRows({ ...draft, active: false }, collection);
      setNotice("Borrador creado a partir de la publicación activa.");
    }
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
    setNotice("Publicación confirmada. Los datos publicados y las evaluaciones guardadas no se editan.");
  }
  return <section aria-busy={busy} className="admin-revisions stack">
    <header className="admin-editor-heading"><h2>Administrar el catálogo</h2><p className="muted">Prepará cambios en un borrador y publicalos solo después de revisarlos.</p></header>
    <p className="muted">Cada operación requiere permiso del servidor. <Link href="/account">Iniciar sesión con cuenta existente</Link></p>
    <p role="status">{busy ? "Consultando el servidor…" : notice}</p>
    {error && <p className="notice">{error}</p>}
    <button className="secondary" disabled={busy} onClick={() => operation(async () => { await list(0); })}>Consultar borradores y publicaciones</button>
    <div className="admin-workspace">
    {revisions && <section className="surface stack" aria-label="Revisiones del catálogo">
       <h2 className="text-xl font-bold">Borradores y publicaciones</h2>
      <p className="muted">{active ? "✓ Publicación activa identificada por el servidor" : "Activa no localizada: volvé a la primera página antes de crear o publicar."}</p>
       <p>{revisions.total} borradores y publicaciones. Los borradores no cambian los datos del catálogo público.</p>
      <ul className="revision-list">{revisions.items.map((revision, index) => <li key={revision.id}><button className="secondary" data-revision-id={revision.id} aria-pressed={selected?.id === revision.id} disabled={busy} onClick={() => operation(async () => { await loadRows(revision, collection); })}>{revision.status === "draft" ? "Borrador privado" : "Publicación inmutable"}{revision.active ? " · Activa" : ` · ${index + 1}`}</button></li>)}</ul>
      <button disabled={busy || !active} onClick={() => operation(create)}>Crear borrador desde activa</button>
      <nav aria-label="Páginas de revisiones" className="flex gap-3"><button disabled={busy || !revisions.offset} onClick={() => operation(async () => { await list(Math.max(0, revisions.offset - 100)); })}>Revisiones anteriores</button><button disabled={busy || revisions.offset + revisions.limit >= revisions.total} onClick={() => operation(async () => { await list(revisions.offset + revisions.limit); })}>Más revisiones</button></nav>
    </section>}
    {selected && <section className="surface stack" aria-label="Detalle de revisión" aria-busy={busy}>
       <h2 className="text-xl font-bold">{selected.status === "draft" ? "Guardado en borrador" : "Publicado · solo lectura"}</h2>
       {readonly && <p>Solo lectura. Para corregir, creá otro borrador desde la publicación activa.</p>}
      <label className="block" htmlFor="admin-collection">Colección</label>
      <select id="admin-collection" disabled={busy} value={collection} onChange={event => { const value = event.target.value as Collection; void operation(async () => { await loadRows(selected, value); }); }}>{(Object.keys(collectionKeys) as Collection[]).map(key => <option key={key} value={key}>{collectionLabels[key]}</option>)}</select>
       <div className="admin-detail-grid"><div className="stack">{rows && <><p className="muted">{rows.total} registros · Mostrando desde {rows.offset + 1}</p><div className="table-scroll"><table className="admin-table"><thead><tr><th>Registro</th><th>Datos</th></tr></thead><tbody>{rows.items.map((item, index) => <tr key={item.id}><td>{rowLabel(item, collection, index)}</td><td><button className="secondary" aria-label={`Ver registro ${index + 1}`} data-row-id={item.id} disabled={busy} onClick={() => { setRow(item); setJson(JSON.stringify(item.data, null, 2)); setDeleteConfirmed(false); }}>Revisar</button><details><summary>Datos completos</summary><pre className="technical-json">{JSON.stringify(item.data, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
        <nav aria-label="Páginas de filas" className="flex gap-3"><button disabled={busy || !rows.offset} onClick={() => operation(async () => { await loadRows(selected, collection, Math.max(0, rows.offset - 25)); })}>Filas anteriores</button><button disabled={busy || rows.offset + rows.limit >= rows.total} onClick={() => operation(async () => { await loadRows(selected, collection, rows.offset + 25); })}>Más filas</button></nav></>}
       <details><summary>Formato de datos y ejemplos a reemplazar (no son datos reales)</summary>
        <p>Solo JSON, nunca código, SQL, reglas arbitrarias ni DSL. Campos POST obligatorios: {collectionKeys[collection].join(", ")}. PATCH acepta esos campos parciales; objetos y listas anidados se reemplazan completos. El servidor valida tipos y referencias.</p>
        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(adminExamples[collection], null, 2)}</pre>
        <p>Los marcadores REEMPLAZAR, example.test y YYYY-MM-DD son placeholders explícitos: no guardar como evidencia. IDs nuevos los genera el servidor.</p>
        <p>Precios: importe decimal string no negativo, hasta dos decimales y 999999999999.99, ARS, fecha y procedencia obligatorias. Sin fila = desconocido, no cero. Gastos excluidos: envío, financiación y mano de obra; no se computan como cero.</p>
        <p>Fuentes HTTP(S) sin credenciales; par source_id/url único. Componentes requieren fuentes existentes. Atributos string o null, installed_bios solo null. Sin id, image ni prices en components.</p>
        <pre className="whitespace-pre-wrap">{JSON.stringify(attributeKeys, null, 2)}</pre>
        <p>CPU support: observaciones documentadas con evidencia no vacía; modelo, revisión y BIOS exactos. EvidenceRef: source_id, url, locator, consulted_on; par/fecha deben existir en fuentes. Sin SemVer, aliases ni comparación lexicográfica de BIOS. No inventar tolerancias.</p>
       </details></div><div className="admin-editor stack"><h2>{readonly ? "Datos publicados" : "Editor del borrador"}</h2><p>{readonly ? "Publicado · no se puede editar." : "Guardá los cambios en el borrador. Publicarlos requiere otra confirmación."}</p>
      {!readonly && <>
        <button disabled={busy} onClick={() => { setRow(null); setJson("{}"); setDeleteConfirmed(false); }}>Preparar nueva fila</button>
        <details className="accordion" open={row !== null}><summary>Editar datos técnicos del borrador</summary><label className="block" htmlFor="admin-row-json">Datos JSON de la fila</label>
        <textarea id="admin-row-json" rows={14} disabled={busy} data-row-selected={row !== null} value={json} onChange={event => setJson(event.target.value)} spellCheck={false} />
         <p>{row ? "Estás editando el registro elegido." : "Estás preparando un registro nuevo."} El servidor revisa los datos antes de guardarlos.</p>
        <button disabled={busy} onClick={() => operation(save)}>Guardar fila en borrador</button>
        </details>
        {row && <><label className="flex gap-3"><input className="w-auto" type="checkbox" checked={deleteConfirmed} disabled={busy} onChange={event => setDeleteConfirmed(event.target.checked)} />Confirmo eliminar esta fila del borrador</label><button disabled={busy || !deleteConfirmed} onClick={() => operation(async () => { await curationRequest(`${root}/${selected.id}/${collection}/${row.id}`, "DELETE"); await loadRows(selected, collection, rows?.offset ?? 0); setNotice("Fila eliminada del borrador."); })}>Eliminar fila</button></>}
         <label className="flex gap-3"><input className="w-auto" type="checkbox" checked={publishConfirmed} disabled={busy} onChange={event => setPublishConfirmed(event.target.checked)} />Confirmo publicar este borrador; después no se puede editar</label>
         <button disabled={busy || !publishConfirmed || !active} onClick={() => operation(publish)}>Publicar borrador</button>
         <p>Si otra persona publica cambios antes, vas a tener que revisarlos. No se vuelve a enviar automáticamente.</p>
       </>}</div></div>
    </section>}
    </div>
  </section>;
}

export default function Administration() {
  const [pendingComplete, setPendingComplete] = useState<MissingDataItem | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  function handleComplete(item: MissingDataItem) {
    setPendingComplete(item);
    const el = editorRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* Solo desplazamiento. */ }
    }
  }
  return <section className="admin-screen">
    <Dashboard onComplete={handleComplete} />
    <div ref={editorRef} tabIndex={-1} className="admin-editor-section">
      <RevisionEditor pendingComplete={pendingComplete} onPendingHandled={() => setPendingComplete(null)} />
    </div>
  </section>;
}
