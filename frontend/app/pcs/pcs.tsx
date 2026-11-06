"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import HardwareGuide from "../../components/hardware-guide";
import RemoteProductSelector from "../../components/remote-product-selector";
import TowerCompatibility from "./tower-compatibility";
import TowerRecommendations from "./tower-recommendations";
import TowerInventory, { focusTowerCategory, towerStatusId } from "../../components/tower-inventory";
import PcsEmptyState from "../../components/pcs-empty-state";
import { emptyTower, towerCategories, towerInput, towerKeys, towerRequest, type CategoryStatus, type Tower, type TowerCategory, type TowerInput, type TowerLine, type TowerPage } from "../../lib/towers";
import "./pcs.css";

export default function PCs() {
  const [list, setList] = useState<TowerPage | null>(null), [selected, setSelected] = useState<Tower | null>(null), [draft, setDraft] = useState<TowerInput | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [deleting, setDeleting] = useState(false);
  const lock = useRef(false), focusAfterOpen = useRef<TowerCategory | null>(null);
  useEffect(() => {
    if (!draft || !focusAfterOpen.current) return;
    focusTowerCategory(focusAfterOpen.current); focusAfterOpen.current = null;
  }, [draft]);
  async function load(page = 1) { setList(await (await towerRequest(`?page=${page}&page_size=20`)).json()); }
  useEffect(() => {
    let active = true;
    towerRequest("?page=1&page_size=20").then(response => response.json()).then(data => { if (active) setList(data); }).catch(() => { if (active) setError("No se pudo consultar torres. Iniciá sesión o usá el flujo histórico si la API aún no está disponible."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  async function operation(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Servicio no disponible. No se confirmaron cambios."); }
    finally { lock.current = false; setBusy(false); }
  }
  function edit(pc: Tower | null) { setSelected(pc); setDraft(pc ? towerInput(pc) : emptyTower()); setDeleting(false); setError(""); setNotice(""); }
  function editCategory(category: TowerCategory) { if (!selected) return; focusAfterOpen.current = category; edit(selected); }
  function status(category: TowerCategory, value: CategoryStatus) {
    if (!draft) return;
    if (draft.lines.some(line => line.category === category) && value !== "present") {
      setError("Quitá explícitamente las líneas de esta categoría antes de marcar no sé o no tengo."); return;
    }
    setDraft({ ...draft, category_status: { ...draft.category_status, [category]: value } }); setError("");
  }
  function updateLine(index: number, patch: Partial<TowerLine>) {
    if (!draft) return;
    const lines = draft.lines.map((line, i) => i === index ? { ...line, ...patch } : line);
    const changedBoard = draft.lines[index]?.category === "motherboard" && ("component_id" in patch || "declared_model" in patch);
    setDraft({ ...draft, lines, context: changedBoard ? { ...draft.context, bios_version: null } : draft.context });
  }
  const presentCount = selected ? towerKeys.filter(category => selected.category_status[category] === "present").length : 0;
  const unknownCount = selected ? towerKeys.filter(category => selected.category_status[category] === "unknown").length : 0;
  const title = selected ? selected.name : draft ? (draft.name.trim() || "Nueva PC") : "Mi PC";
  const subtitle = selected
    ? "Esto es lo que sabemos de tu PC."
    : draft
      ? "Completá las piezas que conozcas y guardá. Lo que no sepas queda para después."
      : list && !list.total
        ? "Cargá tu primera PC para empezar."
        : "Elegí una de tus PCs para ver sus piezas.";
  return <section className="pcs-screen" aria-busy={busy}>
    <div className="pcs-tabs" role="group" aria-label="Tus PCs">
      <span className="pcs-label">Tus PCs</span>
      {list?.items.map(pc => <button key={pc.id} className="pcs-tab" disabled={busy} aria-pressed={selected?.id === pc.id} onClick={() => operation(async () => { setSelected(await (await towerRequest(`/${pc.id}`)).json()); setDraft(null); setDeleting(false); })}>{pc.name}</button>)}
      <button className="pcs-add" disabled={busy} onClick={() => edit(null)}><Plus aria-hidden="true" />Agregar otra PC</button>
      {list && list.total > list.page_size && <nav aria-label="Páginas de PCs" className="row"><button disabled={busy || list.page <= 1} onClick={() => operation(() => load(list.page - 1))}>Anterior</button><button disabled={busy || list.page * list.page_size >= list.total} onClick={() => operation(() => load(list.page + 1))}>Siguiente</button></nav>}
    </div>

    <header className="pcs-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {selected && <div className="pcs-complete" aria-label={`${presentCount} de 9 piezas cargadas, ${unknownCount} ${unknownCount === 1 ? "dato" : "datos"} por confirmar`}>
        <div className="pcs-complete-top"><strong>{presentCount} de 9 piezas</strong><span>{unknownCount ? `${unknownCount} ${unknownCount === 1 ? "dato" : "datos"} por confirmar` : "Sin datos por confirmar"}</span></div>
        <ul className="pcs-dots" aria-hidden="true">{towerKeys.map(category => <li key={category} className={selected.category_status[category] === "unknown" ? "q" : selected.category_status[category] === "absent" ? "e" : ""} />)}</ul>
      </div>}
    </header>

    <p role="status" aria-label="Estado de PCs">{busy ? "Consultando el servidor…" : notice}</p>
    {error && <p role="alert">{error}</p>}

    <div className="pcs-body">
      <section aria-label="Piezas de tu PC" className="pcs-main">
        {selected && !draft && <>
          <TowerInventory pc={selected} onEditCategory={busy ? undefined : editCategory} />
          <details className="pcs-more"><summary>BIOS y contexto declarado</summary><p>BIOS declarada: {selected.context.bios_version ?? "Por confirmar"}</p><p>{selected.context.notes || "Sin notas declaradas."}</p></details>
          <TowerRecommendations key={`proposals-${selected.id}`} pc={selected} disabled={busy} />
          <details className="pcs-more"><summary>Más opciones de esta PC</summary><p>Guardar sólo registra tu configuración; no comprueba compatibilidad. En notebooks y equipos prearmados, confirmá si las piezas se pueden cambiar.</p><button disabled={busy} className="secondary" onClick={() => setDeleting(true)}>Preparar borrado</button></details>
          {deleting && <form aria-label="Confirmar borrado" onSubmit={event => { event.preventDefault(); void operation(async () => { await towerRequest(`/${selected.id}`, "DELETE"); setSelected(null); setDeleting(false); setNotice("PC eliminada del servidor."); await load(); }); }}><label><input type="checkbox" required disabled={busy} />Confirmo eliminar esta PC</label><button disabled={busy}>Eliminar definitivamente</button><button type="button" disabled={busy} onClick={() => setDeleting(false)}>Cancelar borrado</button></form>}
        </>}

        {draft && <form className="surface stack pc-editor" aria-label="Editor de PC" onSubmit={event => { event.preventDefault(); void operation(async () => { const input = towerInput(draft); const saved: Tower = await (await towerRequest(selected ? `/${selected.id}` : "", selected ? "PUT" : "POST", selected ? { ...input, revision: selected.revision } : input)).json(); setSelected(saved); setDraft(null); setNotice("PC guardada. No se evaluó compatibilidad."); await load(list?.page ?? 1); }); }}>
          <fieldset disabled={busy} className="stack"><legend>{selected ? "Editar configuración" : "Crear configuración"}</legend>
            {selected?.origin_schema === 1 && <section><p>Leer no modificó tu PC histórica. Este primer guardado la convierte explícitamente a schema2; dejará de editarse/evaluarse por el flujo de seis categorías. Los resultados anteriores se conservan como históricos.</p><label><input type="checkbox" required />Confirmo convertir esta configuración a torre schema2 al guardar</label></section>}
            <label>Nombre de PC<input value={draft.name} required maxLength={100} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
            <details><summary>Cómo encontrar los datos de mi PC</summary><HardwareGuide id="tower-hardware-guide" /></details>
            <p>No sé no significa no tengo. Declarar ausencia no elimina los requisitos del hardware. Los modelos escritos no se convierten en especificaciones.</p>
            {towerKeys.map(category => <fieldset key={category} className="surface stack-sm"><legend>{towerCategories[category]}</legend>
              <label htmlFor={towerStatusId(category)}>Estado de {towerCategories[category]}</label>
              <select id={towerStatusId(category)} value={draft.category_status[category]} onChange={event => status(category, event.target.value as CategoryStatus)}><option value="unknown">No sé / por confirmar</option><option value="absent">No tengo (declarado)</option><option value="present">Tengo esta pieza</option></select>
              {category === "ram" && <p>Cantidad = módulos, no GB. Hasta 4 grupos y 16 módulos. No deduzcas cantidad ni capacidad desde el nombre.</p>}
              {draft.lines.map((line, index) => line.category !== category ? null : <section key={`${category}-${index}`} className="stack-sm" aria-label={`${towerCategories[category]} línea ${index + 1}`}>
                <label>Identificación de la pieza<select value={line.declared_model !== null ? "declared" : "catalog"} onChange={event => updateLine(index, event.target.value === "declared" ? { component_id: null, declared_model: "" } : { component_id: null, declared_model: null })}><option value="catalog">Elegir en catálogo</option><option value="declared">Escribir modelo declarado</option></select></label>
                {line.declared_model !== null ? <label>Modelo declarado de {towerCategories[category]}<input maxLength={200} required value={line.declared_model} onChange={event => updateLine(index, { declared_model: event.target.value })} /></label> : <RemoteProductSelector category={category} value={line.component_id} onChange={id => updateLine(index, { component_id: id, declared_model: null })} />}
                <label>Cantidad de {category === "ram" ? "módulos" : "unidades"}<input type="number" required min={1} max={category === "ram" ? 16 : category === "storage" ? 16 : category === "fan" ? 32 : 1} step={1} value={Number.isNaN(line.quantity) ? "" : line.quantity} onChange={event => updateLine(index, { quantity: event.target.valueAsNumber })} /></label>
                <button type="button" className="secondary" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== index), context: category === "motherboard" ? { ...draft.context, bios_version: null } : draft.context })}>Quitar línea de {towerCategories[category]}</button>
              </section>)}
              {draft.category_status[category] === "present" && <button type="button" className="secondary" disabled={draft.lines.filter(line => line.category === category).length >= (category === "ram" ? 4 : category === "storage" ? 16 : category === "fan" ? 8 : 1)} onClick={() => setDraft({ ...draft, lines: [...draft.lines, { line_id: null, category, component_id: null, declared_model: "", quantity: 1 }] })}>Agregar línea de {towerCategories[category]}</button>}
            </fieldset>)}
            <label>BIOS declarada<input maxLength={100} value={draft.context.bios_version ?? ""} onChange={event => setDraft({ ...draft, context: { ...draft.context, bios_version: event.target.value || null } })} /></label><p>Cambiar o quitar placa borra la BIOS declarada del borrador. Vacía significa por confirmar; no se hereda.</p>
            <label>Notas declaradas<textarea maxLength={1000} value={draft.context.notes ?? ""} onChange={event => setDraft({ ...draft, context: { ...draft.context, notes: event.target.value || null } })} /></label>
            <button>Guardar PC</button><button type="button" className="secondary" onClick={() => { setDraft(null); setError(""); }}>Cancelar edición</button>
          </fieldset>
        </form>}
      </section>

      <aside className="pcs-side">
        {selected && !draft && <div className="pcs-card"><h2>¿Encaja todo entre sí?</h2><TowerCompatibility key={`${selected.id}`} pc={selected} disabled={busy} /></div>}
        <div className="pcs-card">
          <div className="pcs-links">
            <Link href="/tower-plans">Ver mi plan <ArrowRight aria-hidden="true" /></Link>
            <Link href="/chat">Preguntarle al asistente <ArrowRight aria-hidden="true" /></Link>
            <Link href="/pcs/import">Pegar una lista para actualizarla <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </aside>
    </div>

    {!selected && !draft && list && !list.total && <PcsEmptyState disabled={busy} onCreate={() => edit(null)} />}
    {!selected && !draft && !!list?.total && <p className="compact-help">Elegí una de tus PCs para ver sus piezas.</p>}
  </section>;
}
