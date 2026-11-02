"use client";
import { useId, useState } from "react";
import RemoteProductSelector from "../../components/remote-product-selector";
import { towerCategories, towerKeys, type Tower, type TowerCategory } from "../../lib/towers";
import { towerSimulationInput, type TowerAction, type TowerCandidate, type TowerSimulation } from "../../lib/tower-compatibility";
import { updateSimulationCandidate } from "../../lib/tower-simulation-state";

const newCandidate = (): TowerCandidate => ({ component_id: null, declared_model: "", quantity: 1 });
export default function TowerSimulationForm({ pc, disabled, onDirty, onRun }: { pc: Tower; disabled: boolean; onDirty: () => void; onRun: (input: TowerSimulation) => void }) {
  const uid = useId(), [category, setCategory] = useState<TowerCategory>("cpu"), [action, setAction] = useState<TowerAction["action"]>("replace_category"), [lineId, setLineId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<TowerCandidate[]>([newCandidate()]), [bios, setBios] = useState(""), [actions, setActions] = useState<TowerAction[]>([]), [error, setError] = useState("");
  const targeted = action === "replace_line" || action === "remove_line";
  function changed() { setError(""); onDirty(); }
  function update(index: number, patch: Partial<TowerCandidate>) { const next = updateSimulationCandidate(category, candidates, bios, index, patch); setBios(next.bios); setCandidates(next.candidates); changed(); }
  function current(): TowerAction { return { action, category, line_id: targeted ? lineId : null, candidates: action === "remove_line" ? [] : candidates, ...(category === "motherboard" && action !== "remove_line" ? { candidate_context: { bios_version: bios.trim() || null } } : {}) }; }
  const limit = category === "ram" ? 4 : category === "storage" ? 16 : category === "fan" ? 8 : 1;
  return <details className="accordion"><summary>Comparación manual: simular cambios sin guardar</summary>
    <form aria-label="Simulación manual de torre" className="stack" onSubmit={event => { event.preventDefault(); try { setError(""); onRun(towerSimulationInput(pc, actions.length ? actions : [current()])); } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá las acciones manuales."); } }}>
      <fieldset disabled={disabled} className="stack-sm"><legend>Propuesta manual sobre una copia acumulada</legend><p>No es una recomendación automática. RAM reemplaza todos los grupos anteriores; no amplía el conjunto. Los cambios de placa no heredan BIOS. Ninguna acción guarda la PC.</p>
        <label htmlFor={`${uid}-category`}>Categoría de la acción</label><select id={`${uid}-category`} value={category} onChange={event => { setCategory(event.target.value as TowerCategory); setAction("replace_category"); setLineId(null); setCandidates([newCandidate()]); setBios(""); changed(); }}>{towerKeys.map(key => <option key={key} value={key}>{towerCategories[key]}</option>)}</select>
        <label htmlFor={`${uid}-action`}>Acción manual</label><select id={`${uid}-action`} value={action} onChange={event => { setAction(event.target.value as TowerAction["action"]); setLineId(null); setCandidates([newCandidate()]); setBios(""); changed(); }}><option value="replace_category">Reemplazar la categoría completa</option>{category !== "ram" && <><option value="replace_line">Reemplazar una línea guardada</option><option value="remove_line">Quitar una línea guardada</option></>}{["storage", "fan"].includes(category) && <option value="add_line">Añadir una línea</option>}</select>
        {targeted && <><label htmlFor={`${uid}-line`}>Línea propia que querés cambiar</label><select id={`${uid}-line`} value={lineId ?? ""} onChange={event => { setLineId(event.target.value || null); changed(); }}><option value="">Elegí una línea guardada</option>{pc.lines.filter(line => line.category === category).map((line, index) => <option key={line.line_id} value={line.line_id ?? ""}>Línea {index + 1} · {line.declared_model ?? line.component_id} · {line.quantity} unidades</option>)}</select></>}
        {action !== "remove_line" && candidates.map((candidate, index) => <section key={`${category}-${index}`} className="surface stack-sm" aria-label={`Candidata manual ${index + 1}`}>
          <label htmlFor={`${uid}-kind-${index}`}>Identificación candidata {index + 1}</label><select id={`${uid}-kind-${index}`} value={candidate.declared_model !== null ? "declared" : "catalog"} onChange={event => update(index, event.target.value === "declared" ? { declared_model: "", component_id: null } : { declared_model: null, component_id: null })}><option value="declared">Escribir modelo declarado</option><option value="catalog">Buscar referencia real en catálogo</option></select>
          {candidate.declared_model !== null ? <label>Modelo candidato {index + 1}<input maxLength={200} value={candidate.declared_model} onChange={event => update(index, { declared_model: event.target.value })} /></label> : <RemoteProductSelector category={category} value={candidate.component_id} onChange={id => update(index, { component_id: id, declared_model: null })} />}
          <label>Cantidad candidata {index + 1} ({category === "ram" ? "módulos, no GB" : "unidades"})<input type="number" min={1} max={category === "ram" ? 16 : category === "storage" ? 16 : category === "fan" ? 32 : 1} step={1} value={Number.isNaN(candidate.quantity) ? "" : candidate.quantity} onChange={event => update(index, { quantity: event.target.valueAsNumber })} /></label>
          {candidates.length > 1 && <button type="button" onClick={() => { setCandidates(candidates.filter((_, i) => i !== index)); changed(); }}>Retirar candidata {index + 1}</button>}
        </section>)}
        {action === "replace_category" && limit > 1 && <button type="button" disabled={candidates.length >= limit} onClick={() => { setCandidates([...candidates, newCandidate()]); changed(); }}>Añadir candidata a la categoría</button>}
        {category === "motherboard" && action !== "remove_line" && <label>BIOS candidata (vacío = desconocida)<input maxLength={100} value={bios} onChange={event => { setBios(event.target.value); changed(); }} /></label>}
        <button type="button" className="secondary" onClick={() => { try { const input = towerSimulationInput(pc, [...actions, current()]); setActions(input.actions); setCandidates([newCandidate()]); setLineId(null); setBios(""); changed(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá esta acción."); } }}>Agregar acción a la secuencia</button>
        {actions.length > 0 && <section aria-label="Secuencia manual"><h4>Acciones que se simularán, en orden</h4><p>Con secuencia preparada, el formulario superior sólo se incluye si pulsás Agregar acción.</p><ol>{actions.map((item, index) => <li key={index}>{towerCategories[item.category]} · {item.action} · {item.candidates.length} candidatas <button type="button" onClick={() => { setActions(actions.filter((_, i) => i !== index)); changed(); }}>Retirar acción {index + 1}</button></li>)}</ol></section>}
        {error && <p role="alert">{error}</p>}
        <button type="submit">Simular sin guardar</button>
      </fieldset>
    </form>
  </details>;
}
