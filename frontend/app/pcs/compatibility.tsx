"use client";

import { useId, useState, type FormEvent } from "react";
import { categories, safeSource, type CatalogPage, type Category } from "../../lib/catalog";
import { pcCategories, pcError, type PC } from "../../lib/pcs";
import { compatibilityRequest, simulationInput, evaluationLabel, ruleLabel, additionalStatusLabel, evaluationWarnings, type Evaluation, type JsonValue } from "../../lib/compatibility";
import EvaluationSummary from "./evaluation-summary";

export function EvidenceValue({ value }: { value: JsonValue }) {
  if (value === null || value === undefined) return <span>Desconocido (null)</span>;
  if (Array.isArray(value)) return value.length ? <ul className="list-disc pl-5 space-y-2">{value.map((item, index) => <li key={index}><EvidenceValue value={item} /></li>)}</ul> : <span>Sin elementos informados</span>;
  if (typeof value === "object") return <dl className="space-y-2">{Object.entries(value).map(([key, item]) => <div key={key}><dt className="font-bold break-words">{key}</dt><dd className="pl-3 break-words"><EvidenceValue value={item} /></dd></div>)}</dl>;
  if (typeof value === "string" && /^https?:\/\//i.test(value) && safeSource(value)) return <a href={safeSource(value)!} rel="noreferrer">{value}</a>;
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

export default function Compatibility({ pc, catalog, disabled }: { pc: PC; catalog: CatalogPage | null; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Evaluation | null>(null);
  const [kind, setKind] = useState("");
  const [category, setCategory] = useState<Category>("cpu");
  const [rows, setRows] = useState([0]);
  const [nextRow, setNextRow] = useState(1);
  async function run(action: "evaluate" | "simulate", form?: FormData) {
    setBusy(true); setError(""); setResult(null);
    try {
      const input = action === "simulate" && form ? simulationInput(pc.revision, category, form) : { expected_pc_revision: pc.revision };
      setResult(await compatibilityRequest(pc.id, action, input));
      setKind(action === "simulate" ? "Simulación sobre copia" : "Evaluación de snapshot guardado");
    } catch (failure) { setError(failure instanceof Error ? failure.message : pcError(503)); }
    finally { setBusy(false); }
  }
  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); void run("simulate", new FormData(event.currentTarget));
  }
  return <section aria-label="Compatibilidad parcial" aria-busy={busy} className="border-t pt-5 space-y-4">
    <button className="secondary primary-action" type="button" disabled={busy || disabled} onClick={() => run("evaluate")}>{busy ? "Comprobando…" : "Comprobar mi PC"}</button>
    <p className="compact-help status-line" role="status" aria-label="Estado de compatibilidad">{busy ? "Comprobando componentes…" : result ? "Comprobación recibida. Tu PC no cambió." : "Se comprueba cuando vos lo pedís. No modifica tu PC."}</p>
    {error && <p role="alert">{error}</p>}
    <details className="accordion"><summary>Simular otro componente</summary><form onSubmit={simulate} aria-label="Simular sustitución" className="stack">
      <fieldset disabled={busy || disabled || !catalog} className="space-y-4">
        <legend className="font-bold">Sustituir categoría completa sobre una copia</legend>
        <p>RAM reemplaza TODO el conjunto anterior, sin sumarlo. Cantidades explícitas; hasta 8 módulos en total. No se añaden dependencias ni se guarda automáticamente.</p>
        {!catalog && <p>Catálogo no disponible. La simulación está deshabilitada; podés evaluar el snapshot guardado.</p>}
        <label htmlFor="simulation-category" className="block">Categoría a sustituir</label>
        <select id="simulation-category" value={category} onChange={event => { setCategory(event.target.value as Category); setRows([0]); setNextRow(1); }}>
          {pcCategories.map(item => <option key={item} value={item}>{categories[item]}</option>)}
        </select>
        <div key={category} className="space-y-3">{rows.map((row, index) => <div key={row}>
          <label className="block" htmlFor={`simulation-candidate-${row}`}>Referencia candidata {index + 1}</label>
          <select id={`simulation-candidate-${row}`} name="candidate" defaultValue="" required>
            <option value="">Seleccioná una referencia real</option>
            {catalog?.items.filter(item => item.category === category).map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
          </select>
          {category === "ram" ? <label className="block">Cantidad candidata {index + 1}<input name="quantity" type="number" min={1} max={8} step={1} required /></label> : <><input type="hidden" name="quantity" value="1" /><p>Cantidad explícita: 1</p></>}
          {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter(item => item !== row))}>Retirar candidata {index + 1}</button>}
        </div>)}</div>
        {category === "ram" && <button type="button" disabled={rows.length >= 8} onClick={() => { setRows([...rows, nextRow]); setNextRow(nextRow + 1); }}>Añadir referencia RAM</button>}
        {category === "motherboard" && <label className="block">BIOS declarada de placa candidata<input name="candidate_bios" maxLength={100} aria-describedby="candidate-bios-help" /><span id="candidate-bios-help">Vacío = desconocida (null). Nunca se hereda la BIOS de la placa retirada, aunque sea la misma referencia. Declaración no es evidencia curada.</span></label>}
        <button type="submit">Simular sin guardar</button>
      </fieldset>
    </form></details>
    {result && <section aria-label="Resultado parcial del servidor" className="stack-sm">
      <p className="compact-help">{kind === "Simulación sobre copia" ? "Simulación sobre copia · No guardada" : "Comprobación de tu PC guardada"}</p>
      <EvaluationSummary result={result} collapsePassedChecks={kind !== "Simulación sobre copia"} />
    </section>}
  </section>;
}

export function EvaluationView({ result }: { result: Evaluation }) {
  const warningId = useId();
  const warnings = evaluationWarnings(result);
  return <div className="space-y-4" aria-label="Evaluación y alcance">
    <p className="text-xl font-bold">{evaluationLabel(result)}</p>
    <p>Estado técnico: {result.verdict} · Revisión PC: {result.pc_revision}</p>
    {result.scope && <section aria-label="Alcance declarado" className="space-y-3">
      <h5 className="font-bold">{result.scope.label}</h5>
      <p>Régimen: {result.scope.operating_regime} — stock, sin overclock. No es certificación térmica o eléctrica exhaustiva.</p>
      <p>{result.scope.inventory_reason}</p>
      {([ ["Incluye", result.scope.includes], ["Excluye", result.scope.excludes], ["Supuestos", result.scope.assumptions] ] as const).map(([label, items]) => <div key={label}><h6 className="font-bold">{label}</h6><ul className="list-disc pl-5">{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
    </section>}
    <section aria-label="Advertencias del alcance" className="border-l-4 border-amber-600 pl-3 space-y-2">
      <h5 className="font-bold">Advertencias — no es compatibilidad física total</h5>
      <p>Geometría avanzada, cables milimétricos y certificación térmica/eléctrica exhaustiva no quedan aprobados. Un dato necesario desconocido dentro del alcance impide compatible.</p>
      <ul className="list-disc pl-5">{warnings.map((warning, i) => <li key={i} id={`${warningId}-${i}`}>{warning}</li>)}</ul>
      {result.additional_checks?.map(check => <div key={check.id}><p><strong>{check.id} · {additionalStatusLabel(check.status)}</strong> · <a href={`#${warningId}-${warnings.indexOf(check.reason)}`}>Advertencia n.º {warnings.indexOf(check.reason) + 1}</a></p><details><summary>Fuentes adicionales {check.id}</summary><EvidenceValue value={check.evidence_refs} /></details></div>)}
    </section>
    <section aria-label="Cobertura informada"><h5 className="font-bold">Cobertura necesaria, evaluada y pendiente</h5>
      <ul className="space-y-2">{result.rule_results.map(rule => <li key={rule.rule_id}><strong>{rule.rule_id} · {ruleLabel(rule.rule_id, rule.family)} · {rule.state}</strong>{rule.state === "unknown" && <><p>Necesita verificación; no equivale a compatible.</p><EvidenceValue value={rule.missing_fields} /></>}</li>)}</ul>
      <details><summary>Inventario de cobertura informado por servidor</summary><EvidenceValue value={result.coverage} /></details>
    </section>
    <section aria-label="Faltantes informados"><h5 className="font-bold">Faltantes necesarios</h5><EvidenceValue value={result.missing_fields} /></section>
    <details><summary>Versiones técnicas y configuración evaluada, no guardada</summary><p>Reglas: {result.rules_version} · Datos: {result.data_revision}</p>{result.scope && <p>Alcance: {result.scope.id} · Política: {result.scope.policy_version} · Inventario: {result.scope.inventory_version}</p>}<EvidenceValue value={result.evaluated_configuration} /></details>
    <section aria-label="Reglas y evidencia" className="space-y-3"><h5 className="font-bold">Reglas, hechos, fuentes y condiciones</h5>{result.rule_results.map(rule => <details key={rule.rule_id} className="border rounded p-3"><summary>{rule.rule_id} · {ruleLabel(rule.rule_id, rule.family)} · {rule.state}</summary><h6>Hechos</h6><EvidenceValue value={rule.facts} /><h6>Evidencia y fuentes históricas</h6><EvidenceValue value={rule.evidence} /><h6>Condiciones</h6><EvidenceValue value={rule.conditions} /><h6>Faltantes de regla</h6><EvidenceValue value={rule.missing_fields} /></details>)}</section>
  </div>;
}
