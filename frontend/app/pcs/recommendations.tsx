"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { categories, safeSource, type CatalogPage, type Category } from "../../lib/catalog";
import { pcCategories, type PC, type PCGroup } from "../../lib/pcs";
import { previewInput, recommendationRequest, recommendationError, type DraftAlternative, type DraftReplacement, type Objective, type Preview } from "../../lib/recommendations";
import { EvidenceValue } from "./compatibility";
import EvaluationSummary from "./evaluation-summary";
import ProductVisual from "../../components/product-visual";
import ProductName from "../../components/product-name";
import { Badge, Price } from "../../components/ui";
import { documentedCapacity } from "../../lib/product-visuals";
import type { JsonValue } from "../../lib/compatibility";

const replacement = (category: Category): DraftReplacement => ({ category, candidates: [{ component_id: "", quantity: category === "ram" ? "" : "1" }], bios: "" });
export function candidateLabel(ai: number, ri: number, ci = 0) { return ai === 0 && ri === 0 ? (ci === 0 ? "Componente nuevo" : `Módulo nuevo ${ci + 1}`) : `Componente de dependencia ${ri}, alternativa ${ai + 1}, opción ${ci + 1}`; }
export function categoryLabel(ai: number, ri: number) { return ai === 0 && ri === 0 ? "Categoría de mejora" : `Categoría de dependencia ${ri}, alternativa ${ai + 1}`; }
export function quantityLabel(ai: number, ri: number, ci: number) { return ai === 0 && ri === 0 && ci === 0 ? "Cantidad de módulos" : `Cantidad de módulos ${ci + 1}, dependencia ${ri}, alternativa ${ai + 1}`; }
function evaluatedGroups(configuration: JsonValue): PCGroup[] {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration) || !Array.isArray(configuration.components)) return [];
  return configuration.components.flatMap(group => group && typeof group === "object" && !Array.isArray(group) && typeof group.category === "string" && pcCategories.includes(group.category as Category) && typeof group.component_id === "string" && typeof group.quantity === "number" ? [{ category: group.category as Category, component_id: group.component_id, quantity: group.quantity }] : []);
}
function balance(budget: string, total: string | null): string | null {
  if (total === null || !/^\d+(?:\.\d{1,2})?$/.test(total) || !/^\d+(?:\.\d{1,2})?$/.test(budget)) return null;
  const cents = (value: string) => { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")); };
  const remaining = cents(budget) - cents(total);
  const absolute = remaining < 0 ? -remaining : remaining;
  return `${remaining < 0 ? "−" : ""}${new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(absolute) / 100)}`;
}
function historicalDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "fecha por confirmar";
}

export default function Recommendations({ pc, catalog, disabled }: { pc: PC; catalog: CatalogPage | null; disabled: boolean }) {
  const [objective, setObjective] = useState<Objective>("general");
  const [budget, setBudget] = useState("");
  const [alternatives, setAlternatives] = useState<DraftAlternative[]>([{ key: "opcion-1", replacements: [replacement("ram")] }]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [result, setResult] = useState<Preview | null>(null);
  function update(index: number, change: Partial<DraftAlternative>) { setAlternatives(items => items.map((item, i) => i === index ? { ...item, ...change } : item)); setResult(null); }
  function updateReplacement(ai: number, ri: number, value: DraftReplacement) { update(ai, { replacements: alternatives[ai].replacements.map((group, i) => i === ri ? value : group) }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try { setResult(await recommendationRequest(pc.id, previewInput(pc.revision, objective, budget, alternatives))); }
    catch (failure) { setError(failure instanceof Error ? failure.message : recommendationError(503)); }
    finally { setBusy(false); }
  }
  function groups(alternative: DraftAlternative, ai: number) {
    return <div className="stack">{alternative.replacements.map((group, ri) => <div key={ri} className="stack-sm">
      {ri > 0 && <p className="eyebrow">COMPONENTE DEPENDIENTE · SE COMPRA JUNTO</p>}
      <div className="field"><label htmlFor={`rec-category-${ai}-${ri}`}>{categoryLabel(ai, ri)}</label><select id={`rec-category-${ai}-${ri}`} value={group.category} onChange={event => updateReplacement(ai, ri, replacement(event.target.value as Category))}>{pcCategories.map(category => <option key={category} value={category} disabled={alternative.replacements.some((other, index) => index !== ri && other.category === category)}>{categories[category]}</option>)}</select></div>
      {group.candidates.map((candidate, ci) => <div key={ci} className="candidate-field"><ProductVisual category={group.category} /><div className="field"><label htmlFor={`rec-ref-${ai}-${ri}-${ci}`}>{candidateLabel(ai, ri, ci)}</label><select id={`rec-ref-${ai}-${ri}-${ci}`} required value={candidate.component_id} onChange={event => updateReplacement(ai, ri, { ...group, candidates: group.candidates.map((item, index) => index === ci ? { ...item, component_id: event.target.value } : item) })}><option value="">Elegí del catálogo</option>{catalog?.items.filter(item => item.category === group.category).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {group.category === "ram" && <><label htmlFor={`rec-qty-${ai}-${ri}-${ci}`}>{quantityLabel(ai, ri, ci)}</label><input id={`rec-qty-${ai}-${ri}-${ci}`} type="number" min={1} max={8} step={1} required value={candidate.quantity} onChange={event => updateReplacement(ai, ri, { ...group, candidates: group.candidates.map((item, index) => index === ci ? { ...item, quantity: event.target.value } : item) })} /></>}
        {group.candidates.length > 1 && <button className="text-button" type="button" onClick={() => updateReplacement(ai, ri, { ...group, candidates: group.candidates.filter((_, index) => index !== ci) })}>Retirar módulo {ci + 1}</button>}
      </div></div>)}
      <p className="compact-help">{group.category === "ram" ? "Sustituye todos los módulos actuales; no se suman a los anteriores." : "Sustituye el componente actual. Una unidad."}</p>
      {group.category === "motherboard" && <label>BIOS de la placa nueva<input maxLength={100} value={group.bios} onChange={event => updateReplacement(ai, ri, { ...group, bios: event.target.value })} /><span className="compact-help">Vacío: por confirmar. No se hereda la BIOS anterior.</span></label>}
      <details className="accordion"><summary>Opciones de este componente</summary>{group.category === "ram" && <button className="secondary" type="button" disabled={group.candidates.length >= 8} onClick={() => updateReplacement(ai, ri, { ...group, candidates: [...group.candidates, { component_id: "", quantity: "" }] })}>Añadir otro módulo</button>}{alternative.replacements.length > 1 && <button className="text-button" type="button" onClick={() => update(ai, { replacements: alternative.replacements.filter((_, index) => index !== ri) })}>Retirar dependencia {ri}</button>}</details>
    </div>)}<button className="secondary" type="button" disabled={alternative.replacements.length >= 6} onClick={() => { const category = pcCategories.find(item => !alternative.replacements.some(group => group.category === item)); if (category) update(ai, { replacements: [...alternative.replacements, replacement(category)] }); }}>Añadir componente dependiente{ai > 0 ? ` a alternativa ${ai + 1}` : ""}</button></div>;
  }
  return <section className="surface recommendations" aria-label="Recomendaciones de mejoras" aria-busy={busy}>
    <p className="eyebrow">ELEGÍ QUÉ QUERÉS MEJORAR</p><h2>Una mejora a tu medida</h2><p className="muted" style={{ marginTop: 8, marginBottom: 24 }}>Compará componentes reales, sin cambiar tu PC guardada.</p>
    <form className="recommendation-form" onSubmit={submit} aria-label="Solicitar preview de alternativas"><fieldset className="stack" disabled={busy || disabled || !catalog}>
      <div className="form-grid primary-fields"><div className="field"><label htmlFor="recommendation-objective">Objetivo</label><select id="recommendation-objective" value={objective} onChange={event => { setObjective(event.target.value as Objective); setResult(null); }}><option value="general">Uso general</option><option value="gaming">Juegos</option><option value="productivity">Productividad</option></select></div><div className="field"><label htmlFor="recommendation-budget">Presupuesto ARS</label><input id="recommendation-budget" value={budget} onChange={event => { setBudget(event.target.value); setResult(null); }} required inputMode="decimal" placeholder="Ej. 1000000" maxLength={15} /></div></div>
      {groups(alternatives[0], 0)}
      <button className="primary-action" type="submit">{busy ? "Buscando mejora…" : "Buscar mejora"}</button>
      {!catalog && <p role="alert">El catálogo no está disponible. No podemos comparar componentes sin datos reales.</p>}
      <details className="accordion"><summary>Comparar más alternativas</summary><div className="stack">{alternatives.map((alternative, ai) => <div key={ai}><label>Nombre interno de alternativa {ai + 1}<input required maxLength={40} pattern="[A-Za-z0-9_-]+" value={alternative.key} onChange={event => update(ai, { key: event.target.value })} /></label>{ai > 0 && <>{groups(alternative, ai)}<button type="button" className="text-button" onClick={() => { setAlternatives(items => items.filter((_, index) => index !== ai)); setResult(null); }}>Retirar alternativa {ai + 1}</button></>}</div>)}<button type="button" className="secondary" disabled={alternatives.length >= 20} onClick={() => { setAlternatives(items => [...items, { key: `opcion-${items.length + 1}`, replacements: [replacement("ram")] }]); setResult(null); }}>Añadir alternativa</button></div></details>
    </fieldset></form>
    <p className="compact-help recommendation-expenses" style={{ marginTop: 16 }}>Gastos excluidos: envío, financiación y mano de obra. Precios históricos, no ofertas actuales.</p>
    <p role="status" className="compact-help status-line" aria-label="Estado de recomendaciones">{busy ? "Consultando el servidor…" : result ? "Comparación recibida. Tu PC no cambió." : ""}</p>{error && <p role="alert" className="notice">{error}</p>}
    {result && <section className="recommendations-output" aria-label="Preview de recomendaciones del servidor"><p className="compact-help">{result.objective === "general" ? "Uso general" : result.objective === "gaming" ? "Juegos" : "Productividad"} · Presupuesto <Price amount={result.budget_ars} /></p>{result.items.map((item, index) => {
      const configuration = evaluatedGroups(item.evaluation.evaluated_configuration);
      const changed = configuration.filter(group => !pc.components.some(old => old.category === group.category && old.component_id === group.component_id && old.quantity === group.quantity));
      const retained = pc.components.filter(group => configuration.some(current => current.category === group.category && current.component_id === group.component_id && current.quantity === group.quantity));
      const remaining = balance(result.budget_ars, item.cost.total_ars);
      return <article key={item.key} aria-label={`Resultado alternativa ${item.key}`} className="result-card">
        <div className="row between wrap"><p className="eyebrow">TU MEJORA{index > 0 ? ` · OPCIÓN ${index + 1}` : ""}</p><Badge tone={item.status === "recommended" ? "good" : item.status === "rejected" ? "danger" : "warning"}>{item.status === "recommended" ? "✓ Recomendada" : item.status === "rejected" ? "! No recomendada" : "! Requiere verificación"}</Badge></div>
        <h4>{item.status === "recommended" ? "Una actualización que encaja" : item.status === "rejected" ? "Esta opción necesita cambios" : "Antes de decidir, confirmá estos datos"}</h4>
        {changed.map(group => {
          const old = pc.components.find(part => part.category === group.category);
          const before = catalog?.items.find(part => part.id === old?.component_id);
          const after = catalog?.items.find(part => part.id === group.component_id);
          const beforeCapacity = old ? documentedCapacity(before, old.quantity) : null;
          const afterCapacity = documentedCapacity(after, group.quantity);
          const unit = group.category === "ram" ? "módulos" : "unidad";
          return <div key={group.category}>
            <div className="change-pair"><div className="change-part"><small>HOY · {old ? `${old.quantity} ${unit}` : "Cantidad desconocida"}</small><ProductVisual category={group.category} componentId={old?.component_id} /><p>{before ? <ProductName name={before.name} /> : "Componente no informado"}</p>{beforeCapacity && <small>{beforeCapacity}</small>}</div><span aria-label="Se sustituye por">→</span><div className="change-part"><small>PROPUESTA · {group.quantity} {unit}</small><ProductVisual category={group.category} componentId={group.component_id} /><p>{after ? <ProductName name={after.name} /> : "Nombre no disponible"}</p>{afterCapacity && <small>{afterCapacity}</small>}</div></div>
            {result.objective === "general" && item.benefit.status === "supported" && beforeCapacity && afterCapacity && beforeCapacity !== afterCapacity && <><p className="capacity-headline">{beforeCapacity} → {afterCapacity}</p><p className="compact-help">Capacidad documentada. Beneficio respaldado para uso general.</p></>}
          </div>;
        })}
        {changed.length === 0 && <p>Consultá el detalle de la configuración evaluada; no hay cambios identificables en la respuesta.</p>}
        {item.benefit.status === "supported" ? <p className="compact-help">Beneficio respaldado para tu objetivo. No implica FPS ni rendimiento medido.</p> : <p className="muted">El beneficio para este objetivo no está demostrado.</p>}
        <p className="result-price"><Price amount={item.cost.total_ars} /></p>
        {remaining !== null && <p className={item.cost.within_budget === false ? "danger-text" : "muted"}>{item.cost.within_budget === false ? "Te faltan" : "Disponible después de la compra"}: {remaining.replace(/^−/, "")}</p>}
        {item.cost.total_ars === null && <p className="muted">Hay costes por confirmar; el subtotal conocido no es el total.</p>}
        <p className="compact-help">Histórico · {[...new Set(item.cost.lines.map(line => historicalDate(line.date)))].join(" · ") || "Fecha por confirmar"}</p>
        {retained.length > 0 && <p className="compact-help" style={{ marginTop: 12 }}>Conservás: {retained.map(group => categories[group.category]).join(", ")}.</p>}
        {changed.some(group => group.category === "psu") && <p className="compact-help">La fuente forma parte de esta compra conjunta explícita.</p>}
        <EvaluationSummary result={item.evaluation} />
        <details className="accordion"><summary>Precio, beneficio y condiciones</summary><p>Objetivo: {result.objective} · Presupuesto: {result.budget_ars} ARS</p><p>Subtotal conocido: <Price amount={item.cost.known_subtotal_ars} /></p><p>Total: <Price amount={item.cost.total_ars} /></p><ul>{item.cost.lines.map((line, i) => <li key={i}>{catalog?.items.find(part => part.id === line.component_id)?.name ?? line.component_id} × {line.quantity}: {line.unit_amount} {line.currency} · {line.date} · {safeSource(line.source) ? <a href={safeSource(line.source)!} rel="noreferrer">{line.source}</a> : line.source}</li>)}</ul><p>Beneficio técnico informado: {item.benefit.status}</p><EvidenceValue value={item.benefit.evidence} /><EvidenceValue value={item.cost.missing_fields} /><EvidenceValue value={item.missing_fields} /><EvidenceValue value={item.replacements} /><EvidenceValue value={result.limitations} /><p>Gastos de envío, financiación y mano de obra excluidos; no son cero.</p></details>
        <Link className="plan-link" href="/plans">Planificar mejora →</Link><p className="compact-help">Abrís tus planes. Esta comparación no se guarda automáticamente.</p>
      </article>;
    })}</section>}
  </section>;
}
