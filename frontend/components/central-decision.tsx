import { configurationNextSteps, missingLabel, pendingGroups, workloadLabel } from "../lib/central-presentation";
import type { Tower } from "../lib/towers";
import { formatRetailARS } from "../lib/retail-presentation";
import type { PlanCost, PlanBenefit } from "../lib/tower-plans";
import type { JsonValue } from "../lib/compatibility";

function pendingSummary(value: JsonValue): string {
  return typeof value === "string" ? missingLabel(value) : "Detalle técnico pendiente; consultá la evidencia original";
}
export function PendingFields({ fields, configuration }: { fields: readonly JsonValue[]; configuration?: Tower }) {
  if (!fields.length) return null;
  const grouped = pendingGroups(fields);
  const nextSteps = configuration ? configurationNextSteps(configuration) : [];
  return <section className="central-pending" aria-label="Datos pendientes de decisión"><p><strong>{grouped.total} datos o condiciones pendientes</strong></p>{configuration && <><p>El conteo es de entradas de evidencia, no de piezas distintas ni de compras necesarias.</p>{nextSteps.length > 0 && <><ul>{nextSteps.map(step => <li key={step}>{step}</li>)}</ul><p>Son declaraciones de la configuración base, no un diagnóstico del hardware actual. <a href="/pcs">Revisar mi configuración</a>. Este plan guardado no cambia automáticamente.</p></>}</>}<ul>{grouped.groups.map(group => <li key={group.summary}>{group.summary}{group.count > 1 && <span> ({group.count} entradas)</span>}</li>)}{grouped.remainingCount > 0 && <li>Otros {grouped.remainingCount} datos o condiciones requieren revisión; consultá el detalle técnico.</li>}</ul><details><summary>Todos los datos pendientes y códigos originales ({fields.length})</summary><ul>{fields.map((field, index) => <li key={index}><p>{pendingSummary(field)}</p>{typeof field === "string" ? <code>{field}</code> : <pre><code>{JSON.stringify(field, null, 2)}</code></pre>}</li>)}</ul></details></section>;
}
export function BenefitSummary({ benefit }: { benefit: PlanBenefit }) {
  return <><p>{workloadLabel(benefit.workload)}. Referencia curada; no mide el rendimiento universal de tu PC.</p><details><summary>Etiqueta y trabajo originales de la referencia</summary><p>{benefit.label ?? "Etiqueta no informada"}</p><p>{benefit.workload ?? "Trabajo no informado"}</p></details></>;
}
export function CostSummary({ cost, budget }: { cost: PlanCost; budget?: string }) {
  return <div className="central-cost-summary">{budget !== undefined && <div><span>Presupuesto</span><strong>{formatRetailARS(budget)}</strong></div>}<div><span>Total de los cambios</span><strong>{cost.total_ars === null ? "Total desconocido / incompleto" : formatRetailARS(cost.total_ars)}</strong></div><div><span>Subtotal conocido</span><strong>{formatRetailARS(cost.known_subtotal_ars)}</strong></div><p className={cost.within_budget === false ? "danger-text" : "compact-help"}>{cost.within_budget === false ? "Supera el presupuesto guardado" : cost.within_budget === true ? "Dentro del presupuesto guardado; no implica compatibilidad" : "Presupuesto sin verificar"}</p></div>;
}
