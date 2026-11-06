"use client";
import { useId } from "react";
import AssemblyStateSelect from "../app/pcs/assembly-state";
import RemoteProductSelector from "./remote-product-selector";
import { towerCategories, towerKeys, type CategoryStatus, type TowerCategory } from "../lib/towers";
import type { TowerProposalDraft } from "../lib/tower-extraction";

export default function EditableTowerProposal({ value, onChange, disabled, showName = true }: { value: TowerProposalDraft; onChange: (draft: TowerProposalDraft) => void; disabled: boolean; showName?: boolean }) {
  const uid = useId();
  function update(index: number, patch: Partial<TowerProposalDraft["lines"][number]>) {
    const next = { ...value.lines[index], ...patch };
    // El contexto guardado se conserva: ya no se pide BIOS ni se borra la que existía.
    onChange({ ...value, lines: value.lines.map((line, i) => i === index ? next : line) });
  }
  function status(category: TowerCategory, next: CategoryStatus) { onChange({ ...value, category_status: { ...value.category_status, [category]: next } }); }
  return <fieldset disabled={disabled} className="stack"><legend>Corregir mi propuesta de torre</legend>
    <p>No sé no significa no tengo. Los modelos declarados no prueban especificaciones. Las cantidades vacías siguen desconocidas: completalas explícitamente, sin deducir módulos desde GB.</p>
    {showName && <label>Nombre de PC<input required maxLength={100} value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} /></label>}
    <AssemblyStateSelect value={value.context.assembly_state ?? null} disabled={disabled} onChange={assembly_state => onChange({ ...value, context: { ...value.context, assembly_state } })} />
    {towerKeys.map(category => {
      const lines = value.lines.filter(line => line.category === category), limit = category === "ram" ? 4 : category === "storage" ? 16 : category === "fan" ? 8 : 1;
      return <fieldset key={category} className="surface stack-sm"><legend>{towerCategories[category]}</legend>
        <label htmlFor={`${uid}-${category}`}>Estado de {towerCategories[category]}</label><select id={`${uid}-${category}`} value={value.category_status[category]} onChange={event => status(category, event.target.value as CategoryStatus)}><option value="unknown" disabled={lines.length > 0}>No sé / por confirmar</option><option value="absent" disabled={lines.length > 0}>No tengo (declarado)</option><option value="present">Tengo esta pieza</option></select>
        {lines.length > 0 && <p>Para marcar no sé o no tengo, retirás explícitamente sus líneas primero.</p>}
        {category === "ram" && <p>Cantidad = módulos, no capacidad GB. Hasta4 grupos/16 módulos; capacidad sin evidencia queda por confirmar.</p>}
        {value.lines.map((line, index) => line.category !== category ? null : <section key={`${category}-${index}`} className="stack-sm" aria-label={`${towerCategories[category]} propuesta línea ${index + 1}`}>
          <label htmlFor={`${uid}-kind-${index}`}>Identificación de línea {index + 1}</label><select id={`${uid}-kind-${index}`} value={line.declared_model !== null ? "declared" : "catalog"} onChange={event => update(index, event.target.value === "declared" ? { component_id: null, declared_model: "" } : { component_id: null, declared_model: null })}><option value="declared">Escribir modelo declarado</option><option value="catalog">Buscar en catálogo completo</option></select>
          {line.declared_model !== null ? <label>Modelo declarado {index + 1}<input required maxLength={200} value={line.declared_model} onChange={event => update(index, { declared_model: event.target.value })} /></label> : <RemoteProductSelector category={category} value={line.component_id} onChange={id => update(index, { component_id: id, declared_model: null })} />}
          <label>Cantidad explícita {index + 1} ({category === "ram" ? "módulos" : "unidades"})<input type="number" required min={1} max={category === "ram" ? 16 : category === "storage" ? 16 : category === "fan" ? 32 : 1} step={1} value={line.quantity ?? ""} onChange={event => update(index, { quantity: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })} /></label>
          <button type="button" className="secondary" onClick={() => onChange({ ...value, lines: value.lines.filter((_, i) => i !== index) })}>Retirar línea {index + 1}</button>
        </section>)}
        {value.category_status[category] === "present" && <button type="button" className="secondary" disabled={lines.length >= limit || value.lines.length >= 36} onClick={() => onChange({ ...value, lines: [...value.lines, { line_id: null, category, component_id: null, declared_model: "", quantity: null }] })}>Agregar línea de {towerCategories[category]}</button>}
      </fieldset>;
    })}
    <label>Notas declaradas<textarea maxLength={1000} value={value.context.notes ?? ""} onChange={event => onChange({ ...value, context: { ...value.context, notes: event.target.value || null } })} /></label>
  </fieldset>;
}
