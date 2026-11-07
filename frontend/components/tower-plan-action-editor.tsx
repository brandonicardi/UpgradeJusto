"use client";
import { useEffect, useId, useState } from "react";
import RemoteProductSelector from "./remote-product-selector";
import { TowerProductPhoto } from "./tower-product-summary";
import { remoteCatalog, type TowerCatalogPage, type TowerComponent } from "../lib/tower-catalog";
import { towerCategories, towerKeys, type Tower, type TowerCategory } from "../lib/towers";
import type { TowerAction } from "../lib/tower-compatibility";
import { planActions } from "../lib/tower-plans";

type Candidate = { mode: "declared" | "catalog"; component_id: string | null; declared_model: string | null; quantity: number | null };

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

// New candidatas have no quantity until the user enters it. This form adds
// explicit actions, never a simulated verdict or locally generated future UUID.
export default function TowerPlanActionEditor({ pc, disabled, onAdd }: { pc: Tower; disabled: boolean; onAdd: (action: TowerAction) => void }) {
  const uid = useId(), [category, setCategory] = useState<TowerCategory>("cpu"), [kind, setKind] = useState<TowerAction["action"]>("replace_category"), [lineId, setLineId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([{ mode: "declared", component_id: null, declared_model: "", quantity: null }]), [error, setError] = useState("");
  function reset() { setCandidates([{ mode: "declared", component_id: null, declared_model: "", quantity: null }]); setLineId(""); setError(""); }
  function update(index: number, patch: Partial<Candidate>) { setCandidates(candidates.map((candidate, i) => i === index ? { ...candidate, ...patch } : candidate)); setError(""); }
  const target = kind === "replace_line" || kind === "remove_line", limit = category === "ram" ? 4 : category === "storage" ? 16 : category === "fan" ? 8 : 1;
  return <fieldset disabled={disabled} className="stack-sm"><legend>Sumar un cambio a esta compra</legend><p>La memoria reemplaza todos los módulos. Las cantidades son de módulos, no de GB. Lo revisamos todo al guardar; tu PC no cambia.</p>
    <label htmlFor={`${uid}-category`}>Qué componente querés cambiar</label><select id={`${uid}-category`} value={category} onChange={event => { setCategory(event.target.value as TowerCategory); setKind("replace_category"); reset(); }}>{towerKeys.map(key => <option key={key} value={key}>{towerCategories[key]}</option>)}</select>
    <label htmlFor={`${uid}-kind`}>Cómo lo cambiás</label><select id={`${uid}-kind`} value={kind} onChange={event => { setKind(event.target.value as TowerAction["action"]); reset(); }}><option value="replace_category">Cambiar todos los de este tipo</option>{category !== "ram" && <><option value="replace_line">Cambiar uno solo</option><option value="remove_line">Sacar uno solo</option></>}{["storage", "fan"].includes(category) && <option value="add_line">Sumar uno más</option>}</select>
    {target && <><label htmlFor={`${uid}-line`}>Componente que ya tenés</label><select id={`${uid}-line`} value={lineId} onChange={event => setLineId(event.target.value)}><option value="">Elegí un componente que ya tenés</option>{pc.lines.filter(line => line.category === category).map(line => <option key={line.line_id} value={line.line_id ?? ""}>{line.declared_model ?? "Componente del catálogo"} · {line.quantity} {line.quantity === 1 ? "unidad" : "unidades"}</option>)}</select><p>Si ya lo cambiaste en una compra anterior, elegí cambiar todos los de este tipo.</p></>}
    {kind !== "remove_line" && candidates.map((candidate, index) => <section key={`${category}-${index}`} className="stack-sm"><label htmlFor={`${uid}-mode-${index}`}>Cómo elegís el componente {index + 1}</label><select id={`${uid}-mode-${index}`} value={candidate.mode} onChange={event => update(index, event.target.value === "declared" ? { mode: "declared", component_id: null, declared_model: "" } : { mode: "catalog", component_id: null, declared_model: null })}><option value="declared">Escribir el modelo</option><option value="catalog">Buscar en el catálogo</option></select>
      {candidate.mode === "declared"
        ? <ModelAutocomplete category={category} value={candidate.declared_model ?? ""} disabled={disabled} onTextChange={text => update(index, { declared_model: text, component_id: null })} onSelect={part => update(index, { mode: "catalog", component_id: part.id, declared_model: null })} />
        : <RemoteProductSelector category={category} value={candidate.component_id} onChange={id => update(index, { component_id: id, declared_model: null })} />}
      <label>Cantidad del componente {index + 1}<input type="number" min={1} max={category === "ram" ? 16 : category === "storage" ? 16 : category === "fan" ? 32 : 1} step={1} value={candidate.quantity ?? ""} onChange={event => update(index, { quantity: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })} /></label>{candidates.length > 1 && <button type="button" onClick={() => { setCandidates(candidates.filter((_, i) => i !== index)); setError(""); }}>Sacar el componente {index + 1}</button>}
    </section>)}
    {kind === "replace_category" && limit > 1 && <button type="button" disabled={candidates.length >= limit} onClick={() => setCandidates([...candidates, { mode: "declared", component_id: null, declared_model: "", quantity: null }])}>Sumar otro componente a este cambio</button>}
    <button type="button" onClick={() => { try { const action = planActions([{ action: kind, category, line_id: target ? lineId || null : null, candidates: candidates.map(candidate => ({ component_id: candidate.component_id, declared_model: candidate.declared_model, quantity: candidate.quantity })) as TowerAction["candidates"] }])[0]; onAdd(action); reset(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá el cambio."); } }}>Sumar el cambio a esta compra</button>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
