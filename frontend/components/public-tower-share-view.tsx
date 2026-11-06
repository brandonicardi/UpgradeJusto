import { towerCategories, towerKeys } from "../lib/towers";
import { actionLabel } from "../lib/central-presentation";
import { formatRetailARS, displayRetailDate } from "../lib/retail-presentation";
import { towerRuleLabels } from "../lib/tower-compatibility";
import type { PublicTowerShare } from "../lib/tower-share-dto";
import PublicSharePhoto from "./public-share-photo";
import Link from "next/link";
import "../app/shared-tower-plans/share.css";

type Config = PublicTowerShare["base_configuration"];
type Cost = PublicTowerShare["cost"];
type Stage = PublicTowerShare["stages"][number];
const stateLabel = (state: string) => ({ ready: "Listo según la evaluación guardada", blocked: "No se pudo confirmar", requires_verification: "Falta un dato", compatible: "Encajaba según la evaluación guardada", incompatible: "No encaja", requiere_verificacion: "Falta un dato", pass: "Comprobación aprobada", fail: "Fallo conocido", unknown: "Falta un dato" }[state] ?? "Estado por verificar");
// Claves internas del servidor traducidas para quien mira: nada de códigos a la vista.
const keyLabels: Record<string, string> = { total_ars: "Total", known_subtotal_ars: "Subtotal conocido", within_budget: "Dentro del presupuesto", lines: "Partidas", missing_fields: "Datos que faltan", excluded: "No incluye", amount_ars: "Importe", unit_amount_ars: "Precio por unidad", amount: "Importe", quantity: "Cantidad", currency: "Moneda", condition: "Condición de pago", availability_at_quote: "Disponibilidad al cotizar", quoted_at: "Fecha de la cotización", expires_at: "Vencimiento registrado", notice: "Aviso", count: "Cantidad", code: "Motivo", required: "Se necesita", implemented: "Revisadas", evaluated: "Evaluadas", passed: "Aprobadas", failed: "No cumplen", unknown: "Sin dato", not_applicable: "No corresponde", not_implemented: "Sin revisar", complete: "Revisión completa", status: "Estado", before: "Antes", after: "Después", label: "Aclaración", source: "Fuentes", state: "Estado", reason: "Motivo", kind: "Tipo", name: "Nombre", value: "Valor", unit: "Unidad", action: "Acción", category: "Categoría", candidates: "Opciones", bios_context: "BIOS", cost: "Unidades de recurso (no ARS)", accepts: "Acepta", voltage_mv: "Tensión (mV)", max_current_ma: "Corriente máxima (mA)" };
const valueLabels: Record<string, string> = { required_fact_missing: "Falta un dato", quote_unresolved: "No tenemos ese dato", public_evidence_withheld: "No tenemos ese dato", shipping: "Envío", financing: "Financiación", labor: "Mano de obra", cash: "Contado", list: "Lista (no cuotas)", in_stock: "Con stock informado", out_of_stock: "Sin stock informado", unknown: "Falta un dato", supported: "Respaldado por referencia documentada", not_an_improvement: "La referencia no acredita mejora", priced: "Con precio", missing: "Falta un dato", included: "Ya incluido", available_confirmed: "Confirmado por la persona" };
const hiddenKeys = new Set(["ref", "component_ref", "quote_ref", "line_ref", "rule_id", "family", "group", "references", "excludes"]);
// Only parsed public data enters this tree. Never interpret strings as JSON/HTML.
function Evidence({ value }: { value: unknown }) {
  if (value === null) return <span>No tenemos ese dato</span>;
  if (Array.isArray(value)) return value.length ? <ul>{value.map((item, i) => <li key={i}><Evidence value={item} /></li>)}</ul> : <span>Sin elementos publicados; no equivale a aprobado</span>;
  if (typeof value === "object" && value) return <dl>{Object.entries(value).filter(([key]) => !hiddenKeys.has(key)).map(([key, item]) => <div key={key}><dt>{keyLabels[key] ?? "Detalle"}</dt><dd><Evidence value={item} /></dd></div>)}</dl>;
  return <span>{value === undefined ? "No publicado" : typeof value === "boolean" ? value ? "Sí" : "No" : typeof value === "string" ? valueLabels[value] ?? value : String(value)}</span>;
}
function CostView({ cost, title, headingLevel = 3 }: { cost: Cost; title: string; headingLevel?: 2 | 3 }) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return <section className="share-cost"><Heading>{title}</Heading><p className="share-amount">{cost.total_ars === null ? "Total desconocido / incompleto" : formatRetailARS(cost.total_ars)}</p><p>Subtotal conocido: {formatRetailARS(cost.known_subtotal_ars)}</p><p>{cost.within_budget === false ? "Supera el presupuesto informado" : cost.within_budget === true ? "Dentro del presupuesto histórico; no certifica compatibilidad" : "Presupuesto sin verificar"}</p><p>Envío, financiación y mano de obra excluidos.</p><details><summary>Partidas y faltantes de cotización</summary><Evidence value={cost} /></details></section>;
}
function Configuration({ config, data }: { config: Config; data: PublicTowerShare }) {
  return <div className="share-inventory">{towerKeys.map(category => <section key={category}><h4>{towerCategories[category]}</h4><p>{config.category_status[category] === "unknown" ? "No sé / por confirmar" : config.category_status[category] === "absent" ? "No tengo (declarado)" : "Presente"}</p>{config.lines.filter(line => line.category === category).map(line => <p key={line.line_ref}>{data.components.find(part => part.ref === line.component_ref)?.name ?? "Identificación no publicada"} · cantidad explícita {line.quantity} {category === "ram" ? "módulos, no GB" : "unidades"}</p>)}</section>)}</div>;
}
function StageCard({ stage, data }: { stage: Stage; data: PublicTowerShare }) {
  const name = (ref: string) => data.components.find(part => part.ref === ref);
  const candidateRefs = stage.actions.flatMap(action => action.candidates.map(candidate => candidate.component_ref));
  const photoPart = candidateRefs.map(name).find(part => part?.image);
  const categories = [...new Set(stage.actions.map(action => towerCategories[action.category]))].join(" y ");
  return <li className="share-stage" aria-label={`Etapa pública ${stage.position}`}>
    <span className="share-dot" aria-hidden="true">{stage.position}</span>
    <div className="share-stage-body">
      <div className="share-kicker">Etapa {stage.position} · {categories}</div>
      <h2>{stage.actions.map(action => actionLabel(action.action)).filter((label, i, all) => all.indexOf(label) === i).join(" · ")}</h2>
      {stage.actions.map((action, i) => <div key={i} className="share-tech">{action.candidates.map(candidate => `${name(candidate.component_ref)?.name ?? "No identificado"} × ${candidate.quantity}`).join(" · ")}{action.bios_context && <> · {action.bios_context}</>}</div>)}
      <p className="share-tech">Presupuesto de la etapa: {formatRetailARS(stage.budget_ars)} · {stateLabel(stage.status)}</p>
    </div>
    <div className="share-stage-aside">
      {photoPart && <PublicSharePhoto photo={photoPart.image} compact />}
      {stage.offers.length ? stage.offers.map(offer => <div key={offer.quote_ref} className="share-offer"><span className="share-offer-amount">{formatRetailARS(offer.amount)}</span><span className="share-offer-meta">Visto el {displayRetailDate(offer.quoted_at)} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"}</span></div>) : <div className="share-offer"><span className="share-offer-meta">Sin precio publicado</span></div>}
    </div>
    <details className="share-stage-detail"><summary>Ver el detalle de esta etapa</summary>
      <section><h3>Qué pudimos comprobar</h3><p>Veredicto del motor conservado: {stateLabel(stage.evaluation.verdict)}. No sustituye el estado público ni los datos retenidos.</p><p>{stage.evaluation.scope.label}</p>{stage.warnings.map((warning, i) => <p key={i}>{warning}</p>)}<p>{stage.evaluation.coverage.complete ? "Se revisó todo lo necesario dentro del alcance publicado" : "Faltan datos: no es una comprobación completa"}. No cumplen: {stage.evaluation.coverage.failed.length}. Quedaron sin dato: {stage.evaluation.coverage.unknown.length}.</p>
        <details><summary>Detalle de lo comprobado</summary><Evidence value={stage.evaluation.coverage} /></details>
        {stage.evaluation.rule_results.map(rule => <details key={rule.rule_id}><summary>{towerRuleLabels[rule.rule_id] ?? "Comprobación guardada"} · {stateLabel(rule.state)} · {rule.reason}</summary><p>Código interno: {rule.rule_id}</p><h4>Hechos publicados</h4><Evidence value={rule.facts} /><h4>Fuentes</h4><p>{rule.references.length ? `${rule.references.length} fuentes publicadas` : "Sin fuentes publicadas"}</p><h4>Datos necesarios pendientes</h4><Evidence value={rule.missing_fields} /></details>)}
        <Evidence value={stage.evaluation.missing_fields} /><Evidence value={stage.evaluation.scope.excludes} /></section>
      <div className="share-columns"><CostView cost={stage.cost} title="Coste de etapa" /><CostView cost={stage.cumulative_cost} title="Coste acumulado" /></div>
      <p>Materiales: {stage.materials.length ? "Pasta térmica confirmada explícitamente en esta etapa" : "Ninguno confirmado; no se heredan de otra etapa"}.</p>
      <details><summary>Configuración acumulada publicada</summary><Configuration config={stage.evaluated_configuration} data={data} /><details><summary>Copia evaluada por el motor</summary><Configuration config={stage.evaluation.evaluated_configuration} data={data} /></details></details>
      <details><summary>Cotizaciones históricas congeladas</summary>{stage.offers.map(offer => <section key={offer.quote_ref}><h3>{formatRetailARS(offer.amount)} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"}</h3><p>{offer.notice}</p><p>Observado {displayRetailDate(offer.quoted_at)} · vencimiento registrado {displayRetailDate(offer.expires_at)}</p><p>Disponibilidad al cotizar: {{ in_stock: "Con stock informado", out_of_stock: "Sin stock informado", unknown: "Desconocida" }[offer.availability_at_quote]}. No se comprueba stock actual.</p><Evidence value={offer} /></section>)}</details>
      <details><summary>Dependencias, beneficio y faltantes de etapa</summary><p>No sumar dependencias al coste otra vez: se conserva el cálculo del servidor.</p><Evidence value={stage.dependencies} /><Evidence value={stage.benefit} /><Evidence value={stage.missing_fields} /></details>
    </details>
  </li>;
}
export default function PublicTowerShareView({ data }: { data: PublicTowerShare }) {
  return <article className="tower-share-document share-screen stack" aria-label="Plan de torre compartido"><div className="share-ribbon">Te compartieron este plan. Podés mirarlo, no cambiarlo.</div>
    <header className="share-heading"><h1>{data.title}</h1><div aria-label="Estado de esta copia"><p className="share-state">{stateLabel(data.status)}</p><p>{data.projection.evidence_complete ? "La evidencia publicada está completa dentro de lo que se evaluó." : "Hay evidencia pública incompleta y datos reservados."}</p></div><p>Publicado {displayRetailDate(data.published_at)} · calculado {displayRetailDate(data.generated_at)}</p><p>Presupuesto {formatRetailARS(data.budget_ars)} · {data.price_condition === "cash" ? "Contado" : "Lista (no cuotas)"} · Objetivo: {{ general: "Uso general", gaming: "Juegos", productivity: "Productividad" }[data.objective]}{data.workload ? " · Blender: render CPU" : ""}</p></header>
    <section className="notice share-notice" aria-label="Reservas de publicación"><p>Una evaluación guardada no confirma compatibilidad actual. Es una copia de solo lectura: no indica etapas compradas y no hay acciones de compra, guardado ni aplicación a una PC.</p><details><summary>Qué quedó sin confirmar</summary><h2>Alcance de esta copia</h2><p>{data.projection.evidence_complete ? "Evidencia publicada como completa por el servidor dentro de la proyección" : "Evidencia pública incompleta: no habilita compatibilidad total"}. Detalles retenidos: {data.projection.withheld_details}.</p>{data.warnings.map((warning, i) => <p key={i}>{warning}</p>)}{data.missing_fields.map((field, i) => <p key={i}>Evidencia pública reservada: {field.count} datos.</p>)}<p>Las copias ya vistas o las respuestas iniciadas no se eliminan al revocar.</p></details></section>
    <div className="share-layout"><div className="share-main">
      <ol className="share-stages" aria-label="Etapas del plan">{data.stages.map(stage => <StageCard key={stage.position} stage={stage} data={data} />)}</ol>
      <details className="share-card"><summary>Configuración base y componentes de esta copia</summary><Configuration config={data.base_configuration} data={data} /><div className="share-inventory">{data.components.map(part => <section key={part.ref}><h3>{part.name}</h3><PublicSharePhoto photo={part.image} /><p>{towerCategories[part.category]}</p><Evidence value={part.evidence_summary} /></section>)}</div></details>
      <details className="share-card"><summary>Fuentes de esta copia</summary>{data.references.length ? data.references.map(ref => <p key={ref.ref}>{ref.locator} · consultado {ref.consulted_on} · <a href={ref.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir fuente publicada (otra pestaña)</a></p>) : <p>Sin fuentes publicadas.</p>}</details>
    </div><aside className="share-side"><CostView cost={data.cost} title="Resumen del plan" headingLevel={2} /><section className="share-card"><h2>Beneficio de referencia</h2><p>{data.benefit.status === "supported" ? "Respaldado por referencia documentada" : data.benefit.status === "not_an_improvement" ? "La referencia no acredita mejora" : "Beneficio desconocido"}</p><p>{data.benefit.before ?? "Desconocido"} → {data.benefit.after ?? "Desconocido"}</p><p>{data.benefit.label}</p></section><section className="share-card share-cta"><h2>¿Tu PC también puede dar más?</h2><p>Cargala y te decimos qué conviene mejorar con tu presupuesto.</p><Link href="/">Probar con mi PC</Link></section></aside></div>
    <footer className="share-foot"><span>Este plan es privado: solo lo ve quien tiene el enlace. No mostramos datos de la cuenta de quien lo comparte.</span></footer>
  </article>;
}
