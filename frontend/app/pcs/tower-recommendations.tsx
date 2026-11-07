"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Tower } from "../../lib/towers";
import { createTowerRecommendations, type RecommendationDraft, type RecommendationState } from "../../lib/tower-recommendations";
import TowerRecommendationView from "./tower-recommendation-view";
import Link from "next/link";
import TowerPlanEditor from "../../components/tower-plan-editor";
import TowerPlanView from "../../components/tower-plan-view";
import type { TowerPlanDraft, TowerPlanRead } from "../../lib/tower-plans";
import { emptyManualPlan } from "../../lib/tower-plans";

export default function TowerRecommendations({ pc, disabled, initialDraft, configuration }: { pc: Tower; disabled: boolean; initialDraft?: RecommendationDraft; configuration?: React.ReactNode }) {
  const uid = useId(), controller = useRef<ReturnType<typeof createTowerRecommendations> | null>(null);
  const [draft, setDraft] = useState<RecommendationDraft>(() => initialDraft ? { ...initialDraft, thermal_available: false } : { objective: "general", budget_ars: "", price_condition: "cash", workload: null, thermal_available: false });
  const [state, setState] = useState<RecommendationState>({ phase: "idle", message: "Elegí un objetivo y presupuesto. Se consulta sólo cuando vos lo pedís.", result: null });
  const [planSeed, setPlanSeed] = useState<{ draft: TowerPlanDraft; key: number } | null>(null), [savedPlan, setSavedPlan] = useState<TowerPlanRead | null>(null), nextPlan = useRef(0);
  const [manualError, setManualError] = useState("");
  useEffect(() => { controller.current = createTowerRecommendations({ onState: setState }); return () => { controller.current?.dispose(); controller.current = null; }; }, []);
  function change(patch: Partial<RecommendationDraft>) { controller.current?.invalidate(); setDraft({ ...draft, ...patch }); }
  return <section aria-label="Mejoras para mi torre" className="tower-recommendations stack" aria-busy={state.phase === "working"}>
    <header className="saved-pc-goal-heading"><h2>Qué querés mejorar</h2></header>
    <form aria-label="Objetivo y presupuesto de torre" className="stack" onSubmit={event => { event.preventDefault(); void controller.current?.run(pc, draft); }}><fieldset disabled={disabled} className="tower-objective-fields">
      <div><label htmlFor={`${uid}-objective`}>Objetivo de mejora</label><select id={`${uid}-objective`} value={draft.objective} onChange={event => change({ objective: event.target.value as RecommendationDraft["objective"], workload: null })}><option value="general">Uso general / capacidad</option><option value="gaming">Juegos</option><option value="productivity">Productividad</option></select></div>
      <label>Presupuesto ARS (punto decimal, sin miles)<input inputMode="decimal" required value={draft.budget_ars} onChange={event => change({ budget_ars: event.target.value })} placeholder="100000.00" /></label>
      <div><label htmlFor={`${uid}-condition`}>Condición de precio</label><select id={`${uid}-condition`} value={draft.price_condition} onChange={event => change({ price_condition: event.target.value as RecommendationDraft["price_condition"] })}><option value="cash">Contado</option><option value="list">Lista (no cuotas)</option></select></div>
      {draft.objective === "productivity" && <div><label htmlFor={`${uid}-workload`}>Trabajo de productividad</label><select id={`${uid}-workload`} value={draft.workload ?? ""} onChange={event => change({ workload: event.target.value === "blender-cpu" ? "blender-cpu" : null })}><option value="">Sin seleccionar: beneficio sin referencia específica</option><option value="blender-cpu">Blender · render CPU</option></select></div>}
    </fieldset>
      <div className="row wrap"><button disabled={disabled || state.phase === "working"}>Buscar propuestas para mi torre</button>{state.phase === "working" && <button type="button" className="secondary" onClick={() => controller.current?.cancel()}>Cancelar búsqueda de propuestas</button>}</div>
    </form>
    {(state.phase === "error" || state.phase === "working") && <p role={state.phase === "error" ? "alert" : "status"} aria-label="Estado de propuestas de torre">{state.message}</p>}
    {configuration}
    {state.phase !== "error" && state.phase !== "working" && <p className="compact-help" role="status" aria-label="Estado de propuestas de torre">{state.message}</p>}
    <details><summary>Materiales y datos a confirmar</summary><label className="tower-material"><input type="checkbox" disabled={disabled} checked={draft.thermal_available} onChange={event => change({ thermal_available: event.target.checked })} />Confirmé que tengo pasta térmica disponible para este cambio</label><p>Un cooler o su embalaje no confirman pasta térmica disponible. Los datos desconocidos pueden impedir recomendar una mejora aunque tenga precio. Consultar no guarda cambios ni reserva componentes.</p></details>
    <details><summary>Otras formas de comparar</summary><p className="compact-help">También podés elegir un cambio en «Comparación manual: simular cambios sin guardar», en la comprobación de tu PC.</p><Link href="/tower-plans">Mis planes de torre e historial</Link></details>
    {state.result && <TowerRecommendationView result={state.result} pc={pc} preparationLabel="Preparar plan" planPreparationDisabled={!!planSeed && !savedPlan} onPreparePlan={item => { setSavedPlan(null); setPlanSeed({ key: ++nextPlan.current, draft: { name: `Mejora de ${pc.name}`, pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: item.versions.catalog, objective: draft.objective, workload: draft.objective === "productivity" ? draft.workload : null, budget_ars: draft.budget_ars, price_condition: draft.price_condition, stages: [{ name: "Primera etapa", budget_ars: draft.budget_ars, actions: structuredClone(item.actions), materials: draft.thermal_available ? [{ kind: "thermal_compound", state: "available_confirmed", confirmed: true }] : [] }] } }); }} />}
    {state.result?.items[0] && <section aria-label="Planificación manual"><p>Podés organizar tus propios cambios aunque no haya una recomendación con precio completo. No confirma compatibilidad ni precios vigentes.</p><button type="button" className="secondary" disabled={disabled || (!!planSeed && !savedPlan)} onClick={() => { try { const seed = emptyManualPlan(pc, draft, state.result!.items[0].versions.catalog); setManualError(""); setSavedPlan(null); setPlanSeed({ key: ++nextPlan.current, draft: seed }); } catch (failure) { setManualError(failure instanceof Error ? failure.message : "Revisá los datos del plan."); } }}>Preparar plan manual vacío (no guardar)</button>{manualError && <p role="alert">{manualError}</p>}</section>}
    {planSeed && !savedPlan && <TowerPlanEditor key={planSeed.key} seed={planSeed.draft} pc={pc} onSaved={setSavedPlan} />}
    {savedPlan && <><TowerPlanView plan={savedPlan} /><Link href={`/tower-plans/${savedPlan.id}`}>Abrir plan guardado e historial</Link></>}
  </section>;
}
