"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { categories, type CatalogPage } from "../../lib/catalog";
import { pcCategories, pcFormInput, pcRequest, pcError, type PC, type PCPage } from "../../lib/pcs";
import Compatibility from "./compatibility";
import Recommendations from "./recommendations";
import ProductVisual from "../../components/product-visual";
import { documentedCapacity } from "../../lib/product-visuals";
import ProductName from "../../components/product-name";

export default function PCs({ catalog }: { catalog: CatalogPage | null }) {
  const [list, setList] = useState<PCPage | null>(null);
  const [selected, setSelected] = useState<PC | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(page = 1) {
    const response = await pcRequest(`?page=${page}&page_size=20`);
    setList(await response.json());
  }
  useEffect(() => {
    let active = true;
    async function initial() {
      try {
        const response = await pcRequest("?page=1&page_size=20");
        const data = await response.json();
        if (active) setList(data);
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : pcError(503)); }
      finally { if (active) setBusy(false); }
    }
    void initial();
    return () => { active = false; };
  }, []);

  async function operation(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : pcError(503)); }
    finally { setBusy(false); }
  }
  async function open(id: string) {
    await operation(async () => {
      const response = await pcRequest(`/${id}`);
      setSelected(await response.json()); setEditing(false); setDeleting(false);
    });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await operation(async () => {
      const input = pcFormInput(form);
      const response = await pcRequest(selected ? `/${selected.id}` : "", selected ? "PUT" : "POST", selected ? { ...input, revision: selected.revision } : input);
      setSelected(await response.json()); setEditing(false); setDeleting(false);
      setNotice("PC guardada. No se evaluó compatibilidad.");
      await load(list?.page ?? 1);
    });
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await operation(async () => {
      await pcRequest(`/${selected.id}`, "DELETE");
      setSelected(null); setDeleting(false); setEditing(false);
      setNotice("PC eliminada del servidor."); await load(1);
    });
  }
  return <section aria-busy={busy}>
    <header className="pc-intro"><p className="eyebrow">CONFIGURACIÓN Y OBJETIVO</p><h1>Tu próxima mejora</h1><p>Partí de tu PC y compará una mejora con tu objetivo y presupuesto.</p></header>
    <p role="status" aria-label="Estado de PCs" className="status-line compact-help">{busy ? "Consultando el servidor…" : notice}</p>
    {error && <p role="alert" className="panel my-4">{error}</p>}
    <details className="accordion"><summary>Gestionar mis configuraciones</summary><div className="row wrap">
      <Link href="/pcs/import">Importar PC desde texto</Link>
      <button type="button" disabled={busy} onClick={() => { setSelected(null); setEditing(true); setDeleting(false); setError(""); setNotice(""); }}>Nueva PC</button>
      <button type="button" disabled={busy} onClick={() => operation(() => load(list?.page ?? 1))}>Recargar lista</button>
    </div></details>
    {list && <section aria-label="Lista de PCs" className="pc-picker">
      <span className="muted">Tu configuración</span>
      {list.items.length ? list.items.map(pc => <button key={pc.id} type="button" aria-pressed={selected?.id === pc.id} disabled={busy} onClick={() => open(pc.id)}>{pc.name}</button>) : <p>No hay PCs guardadas. Empezá con una configuración o importá una lista.</p>}
      <nav aria-label="Páginas de PCs" className="flex gap-3">
        {list.page > 1 && <button disabled={busy} onClick={() => operation(() => load(list.page - 1))}>Anterior</button>}
        {list.page * list.page_size < list.total && <button disabled={busy} onClick={() => operation(() => load(list.page + 1))}>Siguiente</button>}
      </nav>
    </section>}
    {list && list.items.length === 0 && !editing && <section className="surface empty-state" aria-label="Empezar mi configuración"><h2>Tu próxima mejora empieza con tu PC</h2><p className="muted">Elegí tus componentes o pegá una lista para revisar una propuesta. Nada se guarda sin tu confirmación.</p><button disabled={busy} onClick={() => { setSelected(null); setEditing(true); setDeleting(false); setError(""); setNotice(""); }}>Crear mi primera PC</button><Link href="/pcs/import">Importar desde texto →</Link></section>}
    {selected && !editing && <section aria-label="Detalle de PC" className="upgrade-grid">
      <div className="surface current-pc"><div className="row between"><h2>Tu PC actual</h2><span className="badge">Guardada</span></div><p className="compact-help">{selected.name}</p>
      <ul>{pcCategories.map(category => { const group = selected.components.find(item => item.category === category); const part = catalog?.items.find(item => item.id === group?.component_id); return <li key={category} className="component-row"><ProductVisual category={category} componentId={group?.component_id} /><div><small>{categories[category]}</small><p>{part ? <ProductName name={part.name} /> : group ? "Nombre no disponible en el catálogo" : "Sin componente declarado"}</p><small>{group ? `${group.quantity} ${category === "ram" ? "módulos" : "unidad"}${documentedCapacity(part, group.quantity) ? ` · ${documentedCapacity(part, group.quantity)}` : ""}` : "Falta información"}</small></div></li>; })}</ul>
      <p className="meta">BIOS declarada: {selected.context.bios_version ?? "Por confirmar"}</p>
      <div className="row wrap"><button className="secondary" disabled={busy} onClick={() => { setEditing(true); setDeleting(false); }}>Editar PC</button><details><summary>Más opciones</summary><p>Revisión {selected.revision}</p><p>{selected.context.notes ?? "Sin notas declaradas"}</p><button className="text-button" disabled={busy} onClick={() => open(selected.id)}>Recargar detalle</button><button className="text-button" disabled={busy} onClick={() => setDeleting(true)}>Preparar borrado</button></details></div>
      {deleting && <form onSubmit={remove} aria-label="Confirmar borrado" className="space-y-3">
        <p>Eliminar esta PC es definitivo. No se enviará el borrado sin tu confirmación.</p>
        <label className="flex items-center gap-3"><input className="w-auto" type="checkbox" name="confirm" required disabled={busy} />Confirmo eliminar esta PC</label>
        <button disabled={busy} type="submit">Eliminar definitivamente</button> <button disabled={busy} type="button" onClick={() => setDeleting(false)}>Cancelar borrado</button>
      </form>}
      <Compatibility key={`${selected.id}-${selected.revision}`} pc={selected} catalog={catalog} disabled={busy} />
      </div>
      <Recommendations key={`recommendations-${selected.id}-${selected.revision}`} pc={selected} catalog={catalog} disabled={busy} />
    </section>}
    {editing && <form key={`${selected?.id ?? "new"}-${selected?.revision ?? 0}`} onSubmit={save} className="surface pc-editor stack" aria-label="Editor de PC">
      <fieldset disabled={busy} className="space-y-4"><legend className="text-xl font-bold">{selected ? "Editar configuración" : "Crear configuración"}</legend>
        <p className="muted">Elegí las piezas de tu PC. Guardar reemplaza la configuración anterior y no comprueba compatibilidad.</p>
        <label className="block">Nombre de PC<input name="name" required maxLength={100} defaultValue={selected?.name ?? ""} /></label>
        {!catalog && <p role="alert">Catálogo no disponible. Recargá la página antes de cambiar componentes.</p>}
        {catalog && <p>Referencias reales del catálogo, hasta 50 en esta vista ({catalog.total} en total). <Link href="/catalog">Explorar catálogo</Link></p>}
        <div className="editor-components">{pcCategories.map(category => <div key={category} className="editor-component stack-sm">
          <ProductVisual category={category} />
          <label className="block" htmlFor={`pc-component-${category}`}>{categories[category]}</label>
          <select id={`pc-component-${category}`} name={category} defaultValue={selected?.components.find(group => group.category === category)?.component_id ?? ""} disabled={!catalog}>
            <option value="">Sin componente declarado</option>
            {selected?.components.filter(group => group.category === category && !catalog?.items.some(item => item.id === group.component_id)).map(group => <option key={group.component_id} value={group.component_id}>Componente guardado: nombre no disponible</option>)}
            {catalog?.items.filter(item => item.category === category).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {category === "ram" ? <label className="block mt-2">Cantidad de módulos RAM idénticos<input name="ram-quantity" type="number" min={1} max={8} step={1} defaultValue={selected?.components.find(group => group.category === "ram")?.quantity ?? ""} aria-describedby="ram-help" /></label> : <p className="text-sm">Cantidad fija: 1 si elegís componente.</p>}
        </div>)}</div>
        <p id="ram-help">RAM seleccionada exige cantidad explícita 1 a 8, sin valor inferido. Sin selección RAM, no hay grupo RAM.</p>
        <label className="block">BIOS declarada<input name="bios_version" maxLength={100} defaultValue={selected?.context.bios_version ?? ""} aria-describedby="context-help" /></label>
        <label className="block">Notas declaradas<textarea className="block w-full border rounded p-3" name="notes" maxLength={1000} defaultValue={selected?.context.notes ?? ""} aria-describedby="context-help" /></label>
        <p id="context-help" className="muted">Los campos vacíos quedan por confirmar. Son datos declarados por vos, no una comprobación de compatibilidad.</p>
        <button type="submit" disabled={!catalog}>Guardar PC</button> <button type="button" onClick={() => { setEditing(false); setError(""); }}>Cancelar edición</button>
        {selected && <button type="button" onClick={() => open(selected.id)}>Descartar cambios y recargar detalle</button>}
      </fieldset>
    </form>}
  </section>;
}
