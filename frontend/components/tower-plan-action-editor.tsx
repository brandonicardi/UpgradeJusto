"use client";
import { useEffect, useId, useState } from "react";
import RemoteProductSelector from "./remote-product-selector";
import { TowerProductPhoto } from "./tower-product-summary";
import { remoteCatalog, type TowerCatalogPage, type TowerComponent } from "../lib/tower-catalog";
import { towerCategories, towerKeys, type Tower, type TowerCategory } from "../lib/towers";
import { categoryNames } from "../lib/conviene-view";
import { isSingleUnitCategory, quantityLimit } from "../lib/catalog-offers";
import type { TowerAction } from "../lib/tower-compatibility";
import { planActions } from "../lib/tower-plans";

/**
 * Sugerencias mientras se escribe un modelo propio. Consulta el catálogo real y
 * solo entrega la pieza que la persona elige: nunca elige la primera por su cuenta.
 */
export function ModelAutocomplete({ category, value, disabled, onTextChange, onSelect }: { category: TowerCategory; value: string; disabled?: boolean; onTextChange: (text: string) => void; onSelect: (part: TowerComponent) => void }) {
  const uid = useId(), [result, setResult] = useState<{ query: string; items: TowerComponent[]; phase: "busy" | "ready" | "error" }>({ query: "", items: [], phase: "busy" }), [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const query = value.trim();
  const listId = `${uid}-models`, optionId = (index: number) => `${uid}-model-${index}`;
  // Lo mostrado solo vale para la consulta actual: al cambiar el texto no se muestran coincidencias viejas.
  const items = result.query === query ? result.items : [], phase = result.query === query ? result.phase : "busy";

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      remoteCatalog<TowerCatalogPage>(`?${new URLSearchParams({ category, q: query, page: "1", page_size: "8", sort: "retail_first" })}`, controller.signal)
        .then(page => {
          if (controller.signal.aborted) return;
          setResult({ query, items: page.items.filter(item => item.category === category), phase: "ready" });
          setActive(-1);
        })
        .catch(() => { if (!controller.signal.aborted) { setResult({ query, items: [], phase: "error" }); setActive(-1); } });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [category, query]);

  const showing = open && query.length >= 2;
  function choose(part: TowerComponent) { onSelect(part); setOpen(false); setActive(-1); }
  function key(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); setActive(-1); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive(index => items.length ? Math.min(index + 1, items.length - 1) : -1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(index => index <= 0 ? 0 : index - 1); return; }
    if (event.key === "Enter" && showing && active >= 0 && items[active]) { event.preventDefault(); choose(items[active]); }
  }

  return <div className="grid gap-space-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <label htmlFor={uid}>Modelo del componente
      <input id={uid} role="combobox" aria-autocomplete="list" aria-expanded={showing} aria-controls={showing ? listId : undefined} aria-activedescendant={showing && active >= 0 ? optionId(active) : undefined} aria-describedby={`${uid}-help`} autoComplete="off" maxLength={200} disabled={disabled} value={value} placeholder="Ej.: RTX 4060, Ryzen 5 5600" onChange={event => { onTextChange(event.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={key} className="w-full rounded-md border border-linea-fuerte bg-papel-alto px-space-3 py-space-2 text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco" />
    </label>
    <p id={`${uid}-help`} className="m-0 text-chico text-tinta-suave">Si está en el catálogo, elegilo de la lista. Si no, dejalo escrito: queda como lo escribiste y el sistema te avisa si no puede comprobarlo.</p>
    {showing && <div className="rounded-md border border-linea bg-papel-alto shadow-[var(--sombra-1)]">
      {phase === "busy" && <p role="status" className="m-0 px-space-3 py-space-2 text-chico text-tinta-suave">Buscando modelos en el catálogo…</p>}
      {phase === "error" && <p role="status" className="m-0 px-space-3 py-space-2 text-chico text-tinta-suave">No pudimos consultar el catálogo. Podés dejar el modelo escrito.</p>}
      {phase === "ready" && items.length === 0 && <p role="status" className="m-0 px-space-3 py-space-2 text-chico text-tinta-suave">No encontramos ese modelo. Podés dejarlo escrito igual.</p>}
      {items.length > 0 && <ul id={listId} role="listbox" aria-label={`Modelos de ${towerCategories[category]} que coinciden`} className="m-0 grid list-none gap-0 p-0">
        {items.map((part, index) => <li key={part.id} id={optionId(index)} role="option" aria-selected={index === active} onMouseDown={event => event.preventDefault()} onClick={() => choose(part)} className={`flex cursor-pointer items-center gap-space-3 px-space-3 py-space-2 [&_.tower-product-photo]:size-9 [&_.tower-product-photo]:flex-none [&_.tower-product-photo_img]:size-9 ${index === active ? "bg-pino-suave" : "hover:bg-papel-hundido"}`}>
          <TowerProductPhoto part={part} />
          <span className="grid min-w-0 gap-[2px]"><span className="text-chico font-bold text-tinta-suave">{towerCategories[part.category]}</span><span className="min-w-0 font-semibold text-tinta [overflow-wrap:anywhere]">{part.name}</span></span>
        </li>)}
      </ul>}
    </div>}
  </div>;
}

/**
 * Flujo guiado para sumar un componente a una compra, una decisión por vez:
 * qué se compra, cuál es, cuántos (solo si puede haber varios) y, si ya tiene
 * de ese tipo, si reemplaza o suma. No emite veredictos: eso lo decide el servidor al guardar.
 */
export default function TowerPlanActionEditor({ pc, disabled, onAdd, onCancel }: { pc: Tower; disabled: boolean; onAdd: (action: TowerAction) => void; onCancel?: () => void }) {
  const uid = useId(), [category, setCategory] = useState<TowerCategory | null>(null), [componentId, setComponentId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false), [model, setModel] = useState(""), [quantity, setQuantity] = useState<number | null>(1), [kind, setKind] = useState<"replace_category" | "add_line">("replace_category"), [error, setError] = useState("");
  const owned = category ? pc.lines.filter(line => line.category === category) : [];
  const asksKind = !!category && ["storage", "fan"].includes(category) && owned.length > 0;
  const hasQuantity = !!category && !isSingleUnitCategory(category);
  const ready = !!category && (typing ? model.trim().length > 0 : !!componentId);
  function clear() { setCategory(null); setComponentId(null); setTyping(false); setModel(""); setQuantity(1); setKind("replace_category"); setError(""); }
  function pick(next: TowerCategory) { clear(); setCategory(next); }
  function submit() {
    if (!category) return;
    try {
      const candidate = { component_id: typing ? null : componentId, declared_model: typing ? model : null, quantity: hasQuantity ? quantity : 1 } as TowerAction["candidates"][number];
      onAdd(planActions([{ action: asksKind ? kind : "replace_category", category, line_id: null, candidates: [candidate] }])[0]); clear();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá lo que elegiste."); }
  }
  return <fieldset disabled={disabled} className="tpe-flow"><legend className="tpe-q">¿Qué querés comprar?</legend>
    <div className="tpe-chips" role="group" aria-label="Tipo de componente">{towerKeys.map(key => <button key={key} type="button" className="mp-btn mp-btn-secundario mp-btn-chico tpe-chip" aria-pressed={category === key} onClick={() => pick(key)}>{categoryNames[key]}</button>)}</div>
    {category && <>
      <div className="tpe-step"><p className="tpe-q">{typing ? "¿Cuál es el modelo?" : "¿Cuál querés? Buscalo en el catálogo."}</p>
        {typing
          ? <ModelAutocomplete category={category} value={model} disabled={disabled} onTextChange={text => { setModel(text); setError(""); }} onSelect={part => { setTyping(false); setModel(""); setComponentId(part.id); setError(""); }} />
          : <RemoteProductSelector key={category} category={category} value={componentId} onChange={id => { setComponentId(id); setError(""); }} onClear={() => setComponentId(null)} />}
        <button type="button" className="mp-link tpe-switch" onClick={() => { setTyping(!typing); setComponentId(null); setModel(""); setError(""); }}>{typing ? "Mejor buscarlo en el catálogo" : "No lo encuentro, escribir el modelo"}</button>
      </div>
      {hasQuantity && ready && <label className="mp-field tpe-qty">Cantidad<input type="number" inputMode="numeric" min={1} max={quantityLimit(category)} step={1} value={quantity ?? ""} onChange={event => { setQuantity(Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber); setError(""); }} />{category === "ram" && <small>Módulos iguales. Un kit de 2 cuenta como 1.</small>}</label>}
      {asksKind && <fieldset className="tpe-kind"><legend className="tpe-q">Ya tenés {categoryNames[category].toLowerCase()}. ¿Qué hacemos?</legend>
        <label><input type="radio" name={`${uid}-kind`} checked={kind === "replace_category"} onChange={() => setKind("replace_category")} /> Reemplazar los que tengo</label>
        <label><input type="radio" name={`${uid}-kind`} checked={kind === "add_line"} onChange={() => setKind("add_line")} /> Sumar uno más</label>
      </fieldset>}
    </>}
    {error && <p role="alert" className="tpe-msg is-bad">{error}</p>}
    <div className="mp-row"><button type="button" className="mp-btn mp-btn-principal mp-btn-chico" disabled={!ready} onClick={submit}>Sumar a esta compra</button>{onCancel && <button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" onClick={onCancel}>Cancelar</button>}</div>
  </fieldset>;
}
