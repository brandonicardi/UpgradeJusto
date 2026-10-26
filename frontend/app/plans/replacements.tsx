"use client";
import { categories, type CatalogPage, type Category } from "../../lib/catalog";
import { pcCategories } from "../../lib/pcs";
import type { DraftReplacement } from "../../lib/recommendations";
import ProductVisual from "../../components/product-visual";

export const emptyReplacement = (category: Category = "cpu"): DraftReplacement => ({ category, candidates: [{ component_id: "", quantity: category === "ram" ? "" : "1" }], bios: "" });

export default function Replacements({ stage, groups, catalog, change }: { stage: number; groups: DraftReplacement[]; catalog: CatalogPage | null; change: (value: DraftReplacement[]) => void }) {
  const update = (index: number, group: DraftReplacement) => change(groups.map((item, i) => i === index ? group : item));
  return <div className="space-y-4">{groups.map((group, ri) => {
    const prefix = `plan-${stage}-${ri}`;
    return <fieldset key={ri} className="stage-card stack-sm"><legend>Cambio {ri + 1}{ri > 0 ? " · Compra dependiente" : ""}</legend>
      <ProductVisual category={group.category} />
      <label htmlFor={`${prefix}-category`}>Categoría de etapa {stage + 1}, cambio {ri + 1}</label>
      <select id={`${prefix}-category`} value={group.category} onChange={event => update(ri, emptyReplacement(event.target.value as Category))}>
        {pcCategories.map(category => <option key={category} value={category} disabled={groups.some((other, index) => index !== ri && other.category === category)}>{categories[category]}</option>)}
      </select>
      <p>{group.category === "ram" ? "Retira TODO el conjunto RAM de la etapa anterior. Máximo 8 módulos nuevos." : "Sustituye la categoría completa del resultado anterior; cantidad 1."}</p>
      {group.candidates.map((candidate, ci) => <div key={ci} className="space-y-2">
        <label className="block" htmlFor={`${prefix}-ref-${ci}`}>Componente de etapa {stage + 1}, cambio {ri + 1}, opción {ci + 1}</label>
        <select id={`${prefix}-ref-${ci}`} required value={candidate.component_id} onChange={event => update(ri, { ...group, candidates: group.candidates.map((item, index) => index === ci ? { ...item, component_id: event.target.value } : item) })}>
          <option value="">Elegí referencia real</option>
          {candidate.component_id && !catalog?.items.some(item => item.id === candidate.component_id) && <option value={candidate.component_id}>Componente guardado fuera de este catálogo; el servidor lo verificará</option>}
          {catalog?.items.filter(item => item.category === group.category).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {group.category === "ram" && <><label className="block" htmlFor={`${prefix}-qty-${ci}`}>Cantidad de etapa {stage + 1}, cambio {ri + 1}, opción {ci + 1}</label>
          <input id={`${prefix}-qty-${ci}`} type="number" min={1} max={8} step={1} required value={candidate.quantity} onChange={event => update(ri, { ...group, candidates: group.candidates.map((item, index) => index === ci ? { ...item, quantity: event.target.value } : item) })} />
          {group.candidates.length > 1 && <button type="button" onClick={() => update(ri, { ...group, candidates: group.candidates.filter((_, index) => index !== ci) })}>Retirar módulo {ci + 1} del cambio {ri + 1}, etapa {stage + 1}</button>}</>}
      </div>)}
      {group.category === "ram" && <button type="button" disabled={group.candidates.length >= 8} onClick={() => update(ri, { ...group, candidates: [...group.candidates, { component_id: "", quantity: "" }] })}>Añadir módulos al cambio {ri + 1}, etapa {stage + 1}</button>}
      {group.category === "motherboard" && <><label className="block" htmlFor={`${prefix}-bios`}>BIOS nueva de etapa {stage + 1}, cambio {ri + 1}</label><input id={`${prefix}-bios`} value={group.bios} maxLength={100} onChange={event => update(ri, { ...group, bios: event.target.value })} /><p>Vacío: por confirmar, sin heredar la BIOS de la placa retirada.</p></>}
      {groups.length > 1 && <button type="button" onClick={() => change(groups.filter((_, index) => index !== ri))}>Retirar cambio {ri + 1} de etapa {stage + 1}</button>}
    </fieldset>;
  })}<button type="button" disabled={groups.length >= 6} onClick={() => {
    const category = pcCategories.find(item => !groups.some(group => group.category === item));
    if (category) change([...groups, emptyReplacement(category)]);
  }}>Añadir dependencia etapa {stage + 1}</button></div>;
}
