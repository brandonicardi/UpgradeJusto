import { EvidenceValue } from "./compatibility";
import { towerResultLabel, towerRuleLabels, type TowerEvaluation } from "../../lib/tower-compatibility";
import { PendingFields } from "../../components/central-decision";

export default function TowerEvaluationView({ result }: { result: TowerEvaluation }) {
  const fail = result.rule_results.filter(rule => rule.state === "fail");
  return <section aria-label="Resultado de torre del servidor" className="stack central-evaluation">
    <h3>{towerResultLabel(result)}</h3><p>{result.scope.label} · Stock, sin overclock. Estado técnico: {result.verdict}.</p>
    <p>Se evaluó la revisión {result.pc_revision}. Consultar o simular no guardó cambios en tu PC.</p>
    <section aria-label="Cobertura de torre"><h4>Qué se pudo comprobar</h4><p>{result.coverage.complete ? "Cobertura informada como completa dentro del alcance declarado." : "Cobertura incompleta: no equivale a compatibilidad completa."}</p><dl><dt>Comprobaciones necesarias</dt><dd><EvidenceValue value={result.coverage.required} /></dd><dt>Evaluadas</dt><dd><EvidenceValue value={result.coverage.evaluated} /></dd><dt>Con datos pendientes</dt><dd><EvidenceValue value={result.coverage.unknown} /></dd><dt>Sin implementación</dt><dd><EvidenceValue value={result.coverage.not_implemented} /></dd></dl></section>
    {fail.length > 0 && <section aria-label="Incompatibilidades conocidas"><h4>Incompatibilidades conocidas</h4><ul>{fail.map(rule => <li key={rule.rule_id}>{towerRuleLabels[rule.rule_id] ?? rule.family} · {rule.rule_id}</li>)}</ul><p>Los fallos conocidos no desaparecen aunque también falten datos.</p></section>}
    <section aria-label="Datos faltantes de torre"><h4>Qué falta confirmar</h4>{result.missing_fields.length ? <PendingFields fields={result.missing_fields} /> : <p>Sin faltantes informados; revisá el veredicto y la cobertura.</p>}</section>
    <section aria-label="Límites de la comprobación"><h4>Alcance y límites</h4><p>No es una certificación física, térmica o eléctrica exhaustiva. Geometría avanzada y cables milimétricos no quedan aprobados. Fotos y ofertas no prueban atributos técnicos.</p><ul>{result.scope.excludes.map((text, index) => <li key={index}>{text}</li>)}</ul>
      {(result.warnings.length > 0 || result.additional_checks.length > 0) && <details><summary>Advertencias y comprobaciones adicionales</summary><ul>{result.warnings.map((text, index) => <li key={index}>{text}</li>)}</ul>{result.additional_checks.map(check => <p key={check.id}>{check.id} · {check.status}: {check.reason}</p>)}</details>}
    </section>
    <details><summary>Detalle de las comprobaciones y evidencia</summary>{result.rule_results.map(rule => <details key={rule.rule_id}><summary>{towerRuleLabels[rule.rule_id] ?? rule.family} · {rule.rule_id} · {rule.state === "pass" ? "Comprobación aprobada" : rule.state === "fail" ? "Fallo conocido" : "Por verificar"}</summary><h5>Hechos</h5><EvidenceValue value={rule.facts} /><h5>Evidencia</h5><EvidenceValue value={rule.evidence} /><h5>Condiciones</h5><EvidenceValue value={rule.conditions} /><h5>Faltantes</h5><EvidenceValue value={rule.missing_fields} /></details>)}</details>
    <details><summary>Versiones, cobertura completa y copia evaluada</summary><p>Reglas: {result.rules_version} · Datos: {result.data_revision}</p><p>Alcance: {result.scope.id} · Política: {result.scope.policy_version} · Inventario: {result.scope.inventory_version}</p><EvidenceValue value={result.coverage} /><pre className="hardware-example">{JSON.stringify(result.evaluated_configuration, null, 2)}</pre></details>
  </section>;
}
