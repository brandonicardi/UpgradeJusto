"use client";
import { useEffect, useRef, useState } from "react";
import type { Tower } from "../../lib/towers";
import { towerCompatibilityRequest, type TowerEvaluation, type TowerSimulation } from "../../lib/tower-compatibility";
import TowerEvaluationView from "./tower-evaluation-view";
import TowerSimulationForm from "./tower-simulation";

export default function TowerCompatibility({ pc, disabled }: { pc: Tower; disabled: boolean }) {
  const controller = useRef<AbortController | null>(null), version = useRef(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [result, setResult] = useState<TowerEvaluation | null>(null), [kind, setKind] = useState<"evaluate" | "simulate">("evaluate"), [dirty, setDirty] = useState(false);
  useEffect(() => () => { version.current++; controller.current?.abort(); }, []);
  async function run(action: "evaluate" | "simulate", input?: TowerSimulation) {
    if (controller.current) return;
    const current = new AbortController(), ticket = ++version.current; controller.current = current; setBusy(true); setError("");
    try {
      const received = await towerCompatibilityRequest(pc, action, input, current.signal);
      if (ticket === version.current && !current.signal.aborted) { setResult(received); setKind(action); setDirty(false); }
    } catch (failure) { if (ticket === version.current && !current.signal.aborted) setError(failure instanceof Error ? failure.message : "No se pudo comprobar la PC. Tu propuesta manual se conserva."); }
    finally { if (ticket === version.current) { controller.current = null; setBusy(false); } }
  }
  return <section aria-label="Comprobación de torre" aria-busy={busy} className="stack">
    <button type="button" className="secondary primary-action" disabled={disabled || busy} onClick={() => run("evaluate")}>Comprobar mi PC</button>
    <p role="status" aria-label="Estado de comprobación de torre">{busy ? "Consultando el motor del servidor…" : "Se comprueba la PC guardada, no un borrador sin guardar. Consultar y simular no modifican tu PC."}</p>
    {busy && <button type="button" onClick={() => { version.current++; controller.current?.abort(); controller.current = null; setBusy(false); setError("Consulta cancelada. La propuesta manual se conserva; no se solicitó guardar la PC."); }}>Cancelar comprobación</button>}
    {error && <p role="alert">{error}</p>}
    <TowerSimulationForm pc={pc} disabled={disabled || busy} onDirty={() => { if (kind === "simulate") setDirty(true); }} onRun={input => { void run("simulate", input); }} />
    {result && <><p>{kind === "simulate" ? "Simulación manual sobre copia acumulada · No guardada" : "Comprobación del snapshot guardado"}</p>{dirty && <p role="status">La propuesta manual cambió: el resultado anterior no describe esos nuevos cambios. Volvé a simular.</p>}<TowerEvaluationView result={result} /></>}
  </section>;
}
