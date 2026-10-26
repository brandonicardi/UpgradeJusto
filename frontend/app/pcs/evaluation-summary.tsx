"use client";
import { isBasicStock, evaluationWarnings, type Evaluation } from "../../lib/compatibility";
import { Badge } from "../../components/ui";
import { EvidenceValue } from "./compatibility";
import { componentChecks as checks, centralEvaluationLabel, installationActions, evaluationBrief } from "../../lib/evaluation-presentation";
export { centralEvaluationLabel } from "../../lib/evaluation-presentation";

export default function EvaluationSummary({ result, collapsePassedChecks = false }: { result: Evaluation; collapsePassedChecks?: boolean }) {
  const warnings = evaluationWarnings(result);
  const actions = installationActions(warnings, result.additional_checks);
  const collapse = collapsePassedChecks && result.rule_results.length > 0 && result.rule_results.every(rule => rule.state === "pass");
  const checklist = <ul className="rule-summary">{result.rule_results.map(rule => <li key={rule.rule_id} className={rule.state === "pass" ? undefined : "needs-action"}><span aria-hidden="true">{rule.state === "pass" ? "✓" : "!"}</span><div><span>{checks[rule.rule_id]?.label ?? "Comprobación guardada"}: <strong>{rule.state === "pass" ? "Comprobado" : rule.state === "fail" ? "No cumple" : "Falta información"}</strong></span>{rule.state !== "pass" && <p className={rule.state === "fail" ? "danger-text" : "muted"}>{checks[rule.rule_id]?.action ?? "Revisá los datos y las condiciones de esta comprobación en el detalle."}</p>}</div></li>)}</ul>;
  return <section className="evaluation-brief" aria-label="Comprobación de componentes">
    <div><Badge tone={result.verdict === "compatible" ? "good" : result.verdict === "incompatible" ? "danger" : "warning"}>{result.verdict === "compatible" ? "✓" : "!"} {centralEvaluationLabel(result)}</Badge></div>
    <p className="compact-help">{evaluationBrief(result)}</p>
    {!isBasicStock(result) && <p className="notice">Evaluación guardada con un alcance anterior o no identificado. No acredita la comprobación básica actual ni una certificación física total.</p>}
    {!collapse && checklist}
    {actions.length > 0 && <div className="notice" aria-label="Revisiones importantes antes de instalar">{actions.map((action, i) => <p key={i}>{action}</p>)}</div>}
    {collapse ? <details className="accordion"><summary>Ver comprobación de mi PC</summary>{checklist}<EvaluationEvidence result={result} warnings={warnings} /></details> : <EvaluationEvidence result={result} warnings={warnings} />}
  </section>;
}

function EvaluationEvidence({ result, warnings }: { result: Evaluation; warnings: string[] }) {
  return <>
    <details className="accordion"><summary>Cómo se comprobó</summary><div className="stack-sm">{result.rule_results.map(rule => <details key={rule.rule_id}><summary>{checks[rule.rule_id]?.label ?? "Comprobación guardada"}</summary><p>Código técnico: {rule.rule_id} · Estado informado: {rule.state}</p><EvidenceValue value={rule.facts} /><EvidenceValue value={rule.conditions} /><EvidenceValue value={rule.missing_fields} /><EvidenceValue value={rule.evidence} /></details>)}<EvidenceValue value={result.coverage} /><EvidenceValue value={result.missing_fields} /></div></details>
    <details className="accordion"><summary>Montaje y condiciones pendientes</summary><ul className="list-disc pl-5">{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>{result.additional_checks?.map(check => <details key={check.id}><summary>{check.reason}</summary><p>{check.id} · {check.status}</p><EvidenceValue value={check.evidence_refs} /></details>)}</details>
    <details className="accordion"><summary>Fuentes y versiones</summary><p>Reglas: {result.rules_version} · Datos: {result.data_revision} · Revisión: {result.pc_revision}</p>{result.scope && <EvidenceValue value={result.scope} />}<EvidenceValue value={result.evaluated_configuration} /></details>
  </>;
}
