"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Tower } from "../lib/towers";
import { createTowerPlanWriter, type PlanWriteState, type TowerPlanDraft, type TowerPlanRead } from "../lib/tower-plans";
import TowerPlanActionEditor from "./tower-plan-action-editor";
import { createPreviewMetadataLoader, type MetadataSnapshot } from "../lib/preview-metadata";
import { actionPhrase, categoryNames, lineName, saveStateText, thermalMaterial, thermalQuestion, touchesThermal } from "../lib/conviene-view";
import { formatearMonto } from "./uj/monto";
import "../app/tower-plans/mi-plan.css";

const sinDatos: MetadataSnapshot = { status: "active", entries: new Map() };
const plainMoney = (value: string) => value.replace(/\.00$/, "");
const moneyPreview = (value: string) => /^[1-9]\d*(\.\d{1,2})?$/.test(value.trim()) ? formatearMonto(value.trim().split(".")[0]) : null;
const stageAsked = (stage: TowerPlanDraft["stages"][number]) => touchesThermal(stage.actions);

export default function TowerPlanEditor({ seed, pc, planId, revision, onSaved }: { seed: TowerPlanDraft; pc: Tower; planId?: string; revision?: number; onSaved: (plan: TowerPlanRead) => void }) {
  const uid = useId(), [draft, setDraft] = useState(() => structuredClone(seed));
  const [stageKeys, setStageKeys] = useState(() => seed.stages.map((_, index) => String(index))), nextStageKey = useRef(seed.stages.length);
  // Compras con el flujo de «sumar un componente» abierto: las vacías arrancan abiertas.
  const [open, setOpen] = useState<string[]>(() => seed.stages.flatMap((item, index) => item.actions.length ? [] : [String(index)]));
  const [state, setState] = useState<PlanWriteState>({ phase: "idle", message: "" });
  const [names, setNames] = useState<MetadataSnapshot>(sinDatos);
  const writer = useRef<ReturnType<typeof createTowerPlanWriter> | null>(null), callback = useRef(onSaved);
  useEffect(() => { callback.current = onSaved; }, [onSaved]);
  useEffect(() => { writer.current = createTowerPlanWriter({ onState: setState, onSaved: plan => callback.current(plan) }); return () => { writer.current?.dispose(); writer.current = null; }; }, []);
  // Los nombres de las piezas salen del catálogo; sin ellos se dice «Componente por confirmar».
  const version = draft.expected_catalog_version;
  const ids = useMemo(() => [...new Set(draft.stages.flatMap(stage => stage.actions.flatMap(action => action.candidates.map(candidate => candidate.component_id).filter((id): id is string => !!id))))].sort().join("|"), [draft.stages]);
  useEffect(() => {
    if (!ids) return;
    const loader = createPreviewMetadataLoader(), off = loader.subscribe(setNames);
    loader.load(ids.split("|").map(id => ({ id, version })));
    return () => { off(); loader.dispose(); };
  }, [ids, version]);
  const busy = state.phase === "saving", locked = busy || state.phase === "saved";
  // Las compras vacías no traban: al guardar se descartan. Alcanza con que una tenga componentes.
  const actionsReady = draft.stages.some(item => item.actions.length > 0);
  const text = saveStateText(state.phase), bad = state.phase === "error" || state.phase === "uncertain";
  function change(next: TowerPlanDraft) { setDraft(next); writer.current?.changed(); }
  function stage(index: number, patch: Partial<TowerPlanDraft["stages"][number]>) { change({ ...draft, stages: draft.stages.map((item, i) => i === index ? { ...item, ...patch } : item) }); }
  function move(index: number, to: number) { const stages = [...draft.stages], [item] = stages.splice(index, 1); stages.splice(to, 0, item); const keys = [...stageKeys], [key] = keys.splice(index, 1); keys.splice(to, 0, key); setStageKeys(keys); change({ ...draft, stages }); }
  function save() {
    // La pasta térmica solo viaja si la compra toca el procesador o el cooler.
    const clean = { ...draft, stages: draft.stages.filter(item => item.actions.length > 0).map(item => ({ ...item, materials: stageAsked(item) && item.materials.length ? [{ ...thermalMaterial }] : [] })) };
    if (actionsReady) void writer.current?.save(clean, planId, revision);
  }
  const preview = moneyPreview(draft.budget_ars);
  return <section className="mp tpe" aria-label="Borrador del plan por compras">
    <form aria-label="Editor de plan de torre" className="tpe-form" onSubmit={event => { event.preventDefault(); save(); }}><fieldset disabled={locked} className="tpe-fieldset">
      <ol className="tpe-stages">{draft.stages.map((item, index) => {
        const key = stageKeys[index], flow = open.includes(key), n = index + 1, many = draft.stages.length > 1;
        const closeFlow = () => setOpen(open.filter(k => k !== key));
        return <li key={key} className="mp-card tpe-card" aria-label={`Compra ${n}`}>
        <div className="mp-row mp-between"><div className="mp-item-t"><h3>Compra {n}</h3>{item.name.trim() && item.name.trim() !== `Compra ${n}` && !/etapa/i.test(item.name) && <small>{item.name}</small>}</div>{many && <div className="mp-row">
          <button type="button" className="mp-btn mp-btn-secundario mp-btn-chico" disabled={index === 0} onClick={() => move(index, index - 1)}>Comprar antes<span className="mp-sr"> la compra {n}</span></button>
          <button type="button" className="mp-btn mp-btn-secundario mp-btn-chico" disabled={index === draft.stages.length - 1} onClick={() => move(index, index + 1)}>Comprar después<span className="mp-sr"> la compra {n}</span></button>
          <button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" onClick={() => { setStageKeys(stageKeys.filter((_, i) => i !== index)); setOpen(open.filter(k => k !== key)); change({ ...draft, stages: draft.stages.filter((_, i) => i !== index) }); }}>Sacar compra<span className="mp-sr"> {n}</span></button>
        </div>}</div>
        {item.actions.length === 0 && <p className="tpe-note">Todavía está vacía.</p>}
        <ul className="tpe-actions">{item.actions.map((action, actionIndex) => {
          const parts = action.candidates.map(candidate => `${lineName({ ...candidate, category: action.category }, version, names) ?? "Componente por confirmar"}${candidate.quantity > 1 ? ` × ${candidate.quantity}` : ""}`).join(" + ");
          const legacy = action.action === "replace_line" || action.action === "remove_line", label = action.action === "remove_line" ? "Se saca el que elegiste" : parts;
          return <li key={actionIndex}><div className="mp-item-t"><small>{legacy ? actionPhrase(action.category, action.action) : categoryNames[action.category]}</small><b>{label}</b>{action.candidate_context?.bios_version && <small>BIOS que indicaste: {action.candidate_context.bios_version}</small>}</div><button type="button" className="mp-link" onClick={() => stage(index, { actions: item.actions.filter((_, i) => i !== actionIndex) })}>Sacar<span className="mp-sr"> {label} de la compra {n}</span></button></li>;
        })}</ul>
        {stageAsked(item) && <label className="tpe-check"><input type="checkbox" checked={item.materials.length > 0} onChange={event => stage(index, { materials: event.target.checked ? [{ ...thermalMaterial }] : [] })} /><span><strong>Sí, tengo pasta térmica</strong><small>{thermalQuestion}</small></span></label>}
        {flow
          ? <TowerPlanActionEditor pc={pc} disabled={locked || item.actions.length >= 36} onAdd={action => { stage(index, { actions: [...item.actions, action] }); closeFlow(); }} onCancel={closeFlow} />
          : <button type="button" className="mp-btn mp-btn-secundario mp-btn-chico tpe-add" disabled={locked || item.actions.length >= 36} onClick={() => setOpen([...open, key])}>+ Sumar un componente</button>}
        <details className="tpe-more"><summary>Ponerle nombre o tope</summary><div className="tpe-fields">
          <label className="mp-field">Nombre de la compra<input required value={item.name} onChange={event => stage(index, { name: event.target.value })} /></label>
          <label className="mp-field">Cuánto querés gastar acá (en pesos)<input required inputMode="decimal" value={plainMoney(item.budget_ars)} onChange={event => stage(index, { budget_ars: event.target.value })} /></label>
        </div></details>
      </li>;
      })}</ol>
      <button type="button" className="mp-btn mp-btn-secundario tpe-add" disabled={draft.stages.length >= 12} onClick={() => { const key = String(nextStageKey.current++); setStageKeys([...stageKeys, key]); setOpen([...open, key]); change({ ...draft, stages: [...draft.stages, { name: `Compra ${draft.stages.length + 1}`, budget_ars: draft.budget_ars, actions: [], materials: [] }] }); }}>Agregar otra compra</button>
      <details className="tpe-more"><summary>Datos del plan</summary><div className="tpe-fields">
        <label className="mp-field">Nombre del plan<input required value={draft.name} onChange={event => change({ ...draft, name: event.target.value })} /></label>
        <label className="mp-field" htmlFor={`${uid}-objective`}>Para qué es el plan</label><select id={`${uid}-objective`} value={draft.objective} onChange={event => change({ ...draft, objective: event.target.value as TowerPlanDraft["objective"], workload: null })}><option value="general">Para que abra todo más rápido</option><option value="gaming">Para jugar mejor</option><option value="productivity">Para trabajar más rápido</option></select>
        {draft.objective === "productivity" && <><label className="mp-field" htmlFor={`${uid}-workload`}>Qué tipo de trabajo</label><select id={`${uid}-workload`} value={draft.workload ?? ""} onChange={event => change({ ...draft, workload: event.target.value === "blender-cpu" ? "blender-cpu" : null })}><option value="">Otro trabajo</option><option value="blender-cpu">Blender (con el procesador)</option></select></>}
        <label className="mp-field">Cuánto querés gastar en total (en pesos)<input required inputMode="decimal" aria-describedby={`${uid}-budget`} value={plainMoney(draft.budget_ars)} onChange={event => change({ ...draft, budget_ars: event.target.value })} /></label>
        <small id={`${uid}-budget`}>{preview ? `Son ${preview}. ` : ""}Escribilo sin puntos ni comas, por ejemplo 400000.</small>
        <label className="mp-field" htmlFor={`${uid}-condition`}>Cómo pagás</label><select id={`${uid}-condition`} value={draft.price_condition} onChange={event => change({ ...draft, price_condition: event.target.value as TowerPlanDraft["price_condition"] })}><option value="cash">Contado</option><option value="list">Precio de lista (sin cuotas)</option></select>
      </div></details>
      {text && <p role={bad ? "alert" : "status"} aria-label="Estado de guardado del plan" className={bad ? "tpe-msg is-bad" : "tpe-msg"}>{text}</p>}
      {!actionsReady && <p className="tpe-note">Sumá un componente para guardar.</p>}
      <div className="mp-row"><button type="submit" className="mp-btn mp-btn-principal" disabled={!actionsReady || state.phase === "uncertain" || locked}>{busy ? "Guardando…" : planId ? "Guardar los cambios del plan" : "Guardar mi plan"}</button>{busy && <button type="button" className="mp-btn mp-btn-quieto" onClick={() => writer.current?.cancel()}>Dejar de esperar</button>}</div>
    </fieldset></form>
    {state.phase === "uncertain" && <div className="tpe-msg"><p>Puede que el plan se haya guardado. <Link href="/tower-plans">Revisá tus planes</Link> antes de reenviar. Si cambiás el borrador, el próximo intento puede crear otro plan.</p><button type="button" className="mp-btn mp-btn-secundario mp-btn-chico" onClick={() => writer.current?.retry()}>Volver a intentar el mismo guardado</button></div>}
  </section>;
}
