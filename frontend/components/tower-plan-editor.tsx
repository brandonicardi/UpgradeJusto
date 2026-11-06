"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { Tower } from "../lib/towers";
import { createTowerPlanWriter, type PlanWriteState, type TowerPlanDraft, type TowerPlanRead } from "../lib/tower-plans";
import TowerPlanActionEditor from "./tower-plan-action-editor";
import { towerCategories } from "../lib/towers";
import { actionLabel } from "../lib/central-presentation";

/** Lo que ve la persona sobre el guardado, sin nombres internos del servidor. */
function stateText(state: PlanWriteState): string {
  if (state.phase === "saving") return "Guardando el plan; tu PC no cambia.";
  if (state.phase === "saved") return "Guardamos el plan. Tu PC sigue igual.";
  if (state.phase === "error") return "No pudimos guardar el plan. El borrador sigue acá para que lo revises.";
  if (state.phase === "uncertain") return "Puede que el plan se haya guardado. Revisá tus planes antes de volver a intentar.";
  return "Borrador de etapas: no guardado ni aplicado a la PC.";
}

export default function TowerPlanEditor({ seed, pc, planId, revision, onSaved }: { seed: TowerPlanDraft; pc: Tower; planId?: string; revision?: number; onSaved: (plan: TowerPlanRead) => void }) {
  const uid = useId(), [draft, setDraft] = useState(() => structuredClone(seed)), [confirmed, setConfirmed] = useState(false);
  const [stageKeys, setStageKeys] = useState(() => seed.stages.map((_, index) => String(index))), nextStageKey = useRef(seed.stages.length);
  const [state, setState] = useState<PlanWriteState>({ phase: "idle", message: "Borrador de etapas: no guardado ni aplicado a la PC." });
  const writer = useRef<ReturnType<typeof createTowerPlanWriter> | null>(null), callback = useRef(onSaved);
  useEffect(() => { callback.current = onSaved; }, [onSaved]);
  useEffect(() => { writer.current = createTowerPlanWriter({ onState: setState, onSaved: plan => callback.current(plan) }); return () => { writer.current?.dispose(); writer.current = null; }; }, []);
  const busy = state.phase === "saving";
  const actionsReady = draft.stages.length > 0 && draft.stages.every(item => item.actions.length > 0);
  function change(next: TowerPlanDraft) { setDraft(next); setConfirmed(false); writer.current?.changed(); }
  function stage(index: number, patch: Partial<TowerPlanDraft["stages"][number]>) { change({ ...draft, stages: draft.stages.map((item, i) => i === index ? { ...item, ...patch } : item) }); }
  function move(index: number, to: number) { const stages = [...draft.stages], [item] = stages.splice(index, 1); stages.splice(to, 0, item); const keys = [...stageKeys], [key] = keys.splice(index, 1); keys.splice(to, 0, key); setStageKeys(keys); change({ ...draft, stages }); }
  return <section className="surface stack tower-plan-workbench" aria-label="Borrador de plan por etapas"><h3>{planId ? "Revisar y guardar una nueva versión del plan" : "Organizar mi plan por etapas"}</h3>
    <p>Al guardar, revisamos cada etapa sobre lo que ya elegiste antes, sin cambiar tu PC. Los cambios que sumás acá quedan en el plan; tu PC sigue igual.</p>
    <p role={state.phase === "error" || state.phase === "uncertain" ? "alert" : "status"} aria-label="Estado de guardado del plan">{stateText(state)}</p>
    <form aria-label="Editor de plan de torre" className="stack" onSubmit={event => { event.preventDefault(); if (confirmed && actionsReady) void writer.current?.save(draft, planId, revision); }}><fieldset disabled={busy || state.phase === "saved"} className="stack">
      <label>Nombre del plan<input required value={draft.name} onChange={event => change({ ...draft, name: event.target.value })} /></label>
      <label htmlFor={`${uid}-objective`}>Objetivo del plan</label><select id={`${uid}-objective`} value={draft.objective} onChange={event => change({ ...draft, objective: event.target.value as TowerPlanDraft["objective"], workload: null })}><option value="general">Uso general / capacidad</option><option value="gaming">Juegos</option><option value="productivity">Productividad</option></select>
      {draft.objective === "productivity" && <><label htmlFor={`${uid}-workload`}>Trabajo del plan</label><select id={`${uid}-workload`} value={draft.workload ?? ""} onChange={event => change({ ...draft, workload: event.target.value === "blender-cpu" ? "blender-cpu" : null })}><option value="">Sin trabajo específico confirmado</option><option value="blender-cpu">Blender · CPU</option></select></>}
      <label>Presupuesto total ARS del plan<input required inputMode="decimal" value={draft.budget_ars} onChange={event => change({ ...draft, budget_ars: event.target.value })} /></label>
      <label htmlFor={`${uid}-condition`}>Condición de precio del plan</label><select id={`${uid}-condition`} value={draft.price_condition} onChange={event => change({ ...draft, price_condition: event.target.value as TowerPlanDraft["price_condition"] })}><option value="cash">Contado</option><option value="list">Lista (no cuotas)</option></select>
      <div className="central-stage-grid">{draft.stages.map((item, index) => <section key={stageKeys[index]} className="surface stack" aria-label={`Editar etapa ${index + 1}`}><h4>Etapa {index + 1}</h4><label>Nombre de etapa {index + 1}<input required value={item.name} onChange={event => stage(index, { name: event.target.value })} /></label><label>Presupuesto ARS de etapa {index + 1}<input required inputMode="decimal" value={item.budget_ars} onChange={event => stage(index, { budget_ars: event.target.value })} /></label>
        <label><input type="checkbox" checked={item.materials.length > 0} onChange={event => stage(index, { materials: event.target.checked ? [{ kind: "thermal_compound", state: "available_confirmed", confirmed: true }] : [] })} />Confirmé pasta térmica disponible para etapa {index + 1}</label><p>No se hereda a la etapa siguiente; un cooler/embalaje no confirma disponibilidad.</p>
        <ol>{item.actions.map((action, actionIndex) => <li key={actionIndex}><strong>{towerCategories[action.category]} · {actionLabel(action.action)}</strong><p>{action.candidates.map(candidate => `${candidate.declared_model ?? candidate.component_id} × ${candidate.quantity}`).join("; ")} {action.candidate_context?.bios_version && `· BIOS declarada: ${action.candidate_context.bios_version}`}</p><details><summary>Detalle técnico del cambio</summary><p>{action.category} · {action.action}</p></details><button type="button" className="text-button" onClick={() => stage(index, { actions: item.actions.filter((_, i) => i !== actionIndex) })}>Retirar acción {actionIndex + 1} de etapa {index + 1}</button></li>)}</ol>
        <details><summary>Agregar acción a etapa {index + 1}</summary><TowerPlanActionEditor key={`${index}-${item.actions.length}`} pc={pc} disabled={busy || item.actions.length >= 36} onAdd={action => stage(index, { actions: [...item.actions, action] })} /></details>
        <div className="row wrap"><button type="button" className="secondary" disabled={index === 0} onClick={() => move(index, index - 1)}>Subir etapa {index + 1}</button><button type="button" className="secondary" disabled={index === draft.stages.length - 1} onClick={() => move(index, index + 1)}>Bajar etapa {index + 1}</button><button type="button" className="secondary" disabled={draft.stages.length === 1} onClick={() => { setStageKeys(stageKeys.filter((_, i) => i !== index)); change({ ...draft, stages: draft.stages.filter((_, i) => i !== index) }); }}>Retirar etapa {index + 1}</button></div>
      </section>)}</div>
      <button type="button" className="secondary" disabled={draft.stages.length >= 12} onClick={() => { setStageKeys([...stageKeys, String(nextStageKey.current++)]); change({ ...draft, stages: [...draft.stages, { name: `Etapa ${draft.stages.length + 1}`, budget_ars: "", actions: [], materials: [] }] }); }}>Agregar etapa</button>
      <details><summary>Qué se revisa al guardar</summary><p>Al guardar se comprueba que tu PC y el catálogo no hayan cambiado desde que abriste el borrador. Si cambiaron, te lo decimos y no se guarda nada.</p></details>
      <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Revisé etapas, cantidades y contexto; confirmo guardar sin modificar mi PC</label>
      {!actionsReady && <p>Agregá al menos una acción a cada etapa antes de guardar.</p>}<button disabled={!confirmed || !actionsReady || state.phase === "uncertain"}>{planId ? "Confirmar y guardar los cambios del plan" : "Confirmar y guardar mi plan"}</button>
    </fieldset></form>
    {busy && <button type="button" className="secondary" onClick={() => writer.current?.cancel()}>Cancelar espera de guardado</button>}
    {state.phase === "uncertain" && <><p>Puede que el plan se haya guardado. <Link href="/tower-plans">Revisá tus planes</Link> antes de reenviar. Si cambiás el borrador, el próximo intento puede crear otro plan.</p><button type="button" className="secondary" onClick={() => writer.current?.retry()}>Volver a intentar el mismo guardado</button></>}
  </section>;
}
