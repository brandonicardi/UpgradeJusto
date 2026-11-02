"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HardwareGuide from "../../components/hardware-guide";
import RemoteProductSelector from "../../components/remote-product-selector";
import TowerCompatibility from "./tower-compatibility";
import TowerRecommendations from "./tower-recommendations";
import TowerInventory from "../../components/tower-inventory";
import PathSelector from "../../components/path-selector";
import { emptyTower, towerCategories, towerInput, towerKeys, towerRequest, type CategoryStatus, type Tower, type TowerCategory, type TowerInput, type TowerLine, type TowerPage } from "../../lib/towers";

export default function PCs() {
  const [list, setList] = useState<TowerPage | null>(null), [selected, setSelected] = useState<Tower | null>(null), [draft, setDraft] = useState<TowerInput | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [deleting, setDeleting] = useState(false);
  const lock = useRef(false);
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
  return <section aria-busy={busy} className="stack central-workspace">
    <PathSelector active="existing" />
    <header className="pc-intro"><h1>Tu próxima mejora</h1><p>Primero tu PC: registrá lo que conocés y dejá visible lo que falta confirmar.</p></header>
    <p role="status" aria-label="Estado de PCs">{busy ? "Consultando el servidor…" : notice}</p>
    {error && <p role="alert">{error}</p>}
    <details className="pc-management" open={!selected || !!draft}><summary>Elegir o gestionar PCs</summary><div className="row wrap"><button disabled={busy} onClick={() => edit(null)}>Nueva PC</button><button className="secondary" disabled={busy} onClick={() => operation(() => load(list?.page ?? 1))}>Recargar lista</button><Link href="/tower-plans">Mis planes de torre</Link><Link href="/pcs/legacy">Evaluaciones y recomendaciones históricas (seis categorías)</Link></div>
    {!selected && <p className="compact-help">Guardar no comprueba compatibilidad. En notebooks y equipos prearmados, confirmá si las piezas se pueden cambiar.</p>}
    {list && <section aria-label="Lista de PCs" className="pc-picker"><h2>Elegí tu PC</h2>{list.items.map(pc => <button key={pc.id} disabled={busy} aria-pressed={selected?.id === pc.id} onClick={() => operation(async () => { setSelected(await (await towerRequest(`/${pc.id}`)).json()); setDraft(null); setDeleting(false); })}>{pc.name}</button>)}{!list.total && <p>No hay PCs guardadas.</p>}<nav aria-label="Páginas de PCs"><button disabled={busy || list.page <= 1} onClick={() => operation(() => load(list.page - 1))}>Anterior</button><button disabled={busy || list.page * list.page_size >= list.total} onClick={() => operation(() => load(list.page + 1))}>Siguiente</button></nav></section>}
    </details>
    {selected && !draft && <section className="surface stack saved-pc-reading" aria-label="Detalle de PC"><header className="saved-pc-identity"><div><h2>{selected.name}</h2><p>Revisión {selected.revision} · {selected.origin_schema === 1 ? "Configuración histórica" : "Configuración guardada"}</p></div><button className="secondary" disabled={busy} onClick={() => edit(selected)}>Editar PC</button></header>
      <TowerRecommendations key={`proposals-${selected.id}-${selected.revision}`} pc={selected} disabled={busy} configuration={<div className="central-decision-layout"><div className="central-configuration"><TowerInventory pc={selected} /><details><summary>BIOS y contexto declarado</summary><p>BIOS declarada: {selected.context.bios_version ?? "Por confirmar"}</p><p>{selected.context.notes}</p></details></div><aside className="central-context"><h3>Comprobar antes de comprar</h3><TowerCompatibility key={`${selected.id}-${selected.revision}`} pc={selected} disabled={busy} /></aside></div>} />
      <details><summary>Más opciones de esta PC</summary><p>Guardar sólo registra tu configuración; no comprueba compatibilidad. En notebooks y equipos prearmados, confirmá si las piezas se pueden cambiar.</p><button disabled={busy} className="secondary" onClick={() => setDeleting(true)}>Preparar borrado</button><p>Formato técnico: {selected.origin_schema === 1 ? "Histórico, adaptado para lectura" : "Torre schema2"}.</p></details>
      {deleting && <form aria-label="Confirmar borrado" onSubmit={event => { event.preventDefault(); void operation(async () => { await towerRequest(`/${selected.id}`, "DELETE"); setSelected(null); setDeleting(false); setNotice("PC eliminada del servidor."); await load(); }); }}><label><input type="checkbox" required disabled={busy} />Confirmo eliminar esta PC</label><button disabled={busy}>Eliminar definitivamente</button><button type="button" disabled={busy} onClick={() => setDeleting(false)}>Cancelar borrado</button></form>}
    </section>}
    {draft && <form className="surface stack pc-editor" aria-label="Editor de PC" onSubmit={event => { event.preventDefault(); void operation(async () => { const input = towerInput(draft); const saved: Tower = await (await towerRequest(selected ? `/${selected.id}` : "", selected ? "PUT" : "POST", selected ? { ...input, revision: selected.revision } : input)).json(); setSelected(saved); setDraft(null); setNotice("PC guardada. No se evaluó compatibilidad."); await load(list?.page ?? 1); }); }}>
      <fieldset disabled={busy} className="stack"><legend>{selected ? "Editar configuración" : "Crear configuración"}</legend>
        {selected?.origin_schema === 1 && <section><p>Leer no modificó tu PC histórica. Este primer guardado la convierte explícitamente a schema2; dejará de editarse/evaluarse por el flujo de seis categorías. Los resultados anteriores se conservan como históricos.</p><label><input type="checkbox" required />Confirmo convertir esta configuración a torre schema2 al guardar</label></section>}
        <label>Nombre de PC<input value={draft.name} required maxLength={100} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
        <details><summary>Cómo encontrar los datos de mi PC</summary><HardwareGuide id="tower-hardware-guide" /></details>
        <p>No sé no significa no tengo. Declarar ausencia no elimina los requisitos del hardware. Los modelos escritos no se convierten en especificaciones.</p>
        {towerKeys.map(category => <fieldset key={category} className="surface stack-sm"><legend>{towerCategories[category]}</legend>
          <label htmlFor={`tower-status-${category}`}>Estado de {towerCategories[category]}</label>
          <select id={`tower-status-${category}`} value={draft.category_status[category]} onChange={event => status(category, event.target.value as CategoryStatus)}><option value="unknown">No sé / por confirmar</option><option value="absent">No tengo (declarado)</option><option value="present">Tengo esta pieza</option></select>
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
    {!selected && !draft && <section className="surface"><h2>De tu PC a una propuesta</h2><p>Seleccioná una PC guardada para indicar objetivo y presupuesto. Envío, financiación y mano de obra quedan fuera del presupuesto de componentes.</p></section>}
  </section>;
}
