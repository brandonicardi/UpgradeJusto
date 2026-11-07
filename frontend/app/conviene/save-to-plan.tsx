"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Verdict } from "../../components/uj";
import { createTowerPlanWriter, type PlanWriteState, type TowerPlanDraft, type TowerPlanRead } from "../../lib/tower-plans";
import { saveStateText, thermalMaterial, thermalQuestion, touchesThermal } from "../../lib/conviene-view";

export type SaveRow = { name: string; price: string | null; verdict: "compatible" | "incompatible" | "requiere_verificacion" };

/** «Sumar a tu plan»: el clic en guardar es la confirmación. Guarda el plan, no toca la PC. */
export default function SaveToPlan({ seed, rows, onSaved, onCancel }: { seed: TowerPlanDraft; rows: SaveRow[]; onSaved: (plan: TowerPlanRead) => void; onCancel: () => void }) {
  const [thermal, setThermal] = useState(false), [state, setState] = useState<PlanWriteState>({ phase: "idle", message: "" });
  const writer = useRef<ReturnType<typeof createTowerPlanWriter> | null>(null), callback = useRef(onSaved);
  useEffect(() => { callback.current = onSaved; }, [onSaved]);
  useEffect(() => { writer.current = createTowerPlanWriter({ onState: setState, onSaved: plan => callback.current(plan) }); return () => { writer.current?.dispose(); writer.current = null; }; }, []);
  const askThermal = touchesThermal(seed.stages.flatMap(stage => stage.actions)), busy = state.phase === "saving";
  const draft: TowerPlanDraft = { ...seed, stages: seed.stages.map(stage => ({ ...stage, materials: askThermal && thermal ? [{ ...thermalMaterial }] : [] })) };
  const text = saveStateText(state.phase);
  return <div className="cv-save" aria-label="Sumar a tu plan">
    <h3>Sumar a tu plan</h3>
    <ul className="cv-save-rows">{rows.map((row, index) => <li key={index}><span className="cv-save-name">{row.name}</span><span className="cv-save-price">{row.price ?? "Sin precio"}</span><Verdict estado={row.verdict} /></li>)}</ul>
    {askThermal && <label className="cv-save-check"><input type="checkbox" checked={thermal} disabled={busy} onChange={event => { setThermal(event.target.checked); writer.current?.changed(); }} /><span><strong>Sí, tengo pasta térmica</strong><small>{thermalQuestion}</small></span></label>}
    <p className="cv-tech">Tu PC guardada no cambia.</p>
    {text && <p role={state.phase === "error" || state.phase === "uncertain" ? "alert" : "status"} className={state.phase === "error" || state.phase === "uncertain" ? "cv-save-msg is-bad" : "cv-save-msg"}>{text}</p>}
    {state.phase === "uncertain" && <p className="cv-tech"><Link href="/tower-plans">Revisar mis planes</Link></p>}
    <div className="cv-row">
      {state.phase === "uncertain"
        ? <button type="button" className="cv-btn cv-btn-principal" onClick={() => writer.current?.retry()}>Volver a intentar</button>
        : <button type="button" className="cv-btn cv-btn-principal" disabled={busy || state.phase === "saved"} onClick={() => void writer.current?.save(draft)}>{busy ? "Guardando…" : "Guardar en mi plan"}</button>}
      {busy ? <button type="button" className="cv-btn cv-btn-quieto" onClick={() => writer.current?.cancel()}>Dejar de esperar</button> : <button type="button" className="cv-btn cv-btn-quieto" onClick={onCancel}>Cancelar</button>}
    </div>
  </div>;
}
