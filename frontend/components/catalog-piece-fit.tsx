"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Check, CircleHelp, X } from "lucide-react";
import { loadCatalogPCs, catalogCategories } from "../lib/catalog-simulation";
import { pieceVerdict, piecePlanDraft, simulatePiece } from "../lib/catalog-piece";
import { towerEssentialNote, type TowerEvaluation } from "../lib/tower-compatibility";
import type { TowerPlanDraft, TowerPlanRead } from "../lib/tower-plans";
import type { Tower } from "../lib/towers";
import type { TowerComponent } from "../lib/tower-catalog";
import PiecePrices from "./catalog-piece-prices";
import PieceChecks from "./catalog-piece-checks";
import TowerPlanEditor from "./tower-plan-editor";
function PieceVerdict({ result }: { result: TowerEvaluation }) {
  const verdict = result.verdict;
  const Icon = verdict === "compatible" ? Check : verdict === "incompatible" ? X : CircleHelp;
  const note = towerEssentialNote(result);
  return <><strong className="piece-verdict" data-verdict={verdict}><Icon size={20} aria-hidden="true" />{pieceVerdict[verdict] ?? "Falta un dato"}</strong>{note && <p className="piece-source" data-essential-note>{note}</p>}</>;
}
export default function PieceFit({ part, catalogVersion }: { part: TowerComponent; catalogVersion: string | null }) {
  const [pcs, setPCs] = useState<Tower[]>([]), [access, setAccess] = useState("loading"), [selected, setSelected] = useState(""), [result, setResult] = useState<TowerEvaluation | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(false), [expanded, setExpanded] = useState(false);
  const [planOpen, setPlanOpen] = useState(false), [objective, setObjective] = useState<"general" | "gaming" | "productivity">("general"), [budget, setBudget] = useState(""), [condition, setCondition] = useState<"cash" | "list">("cash"), [planName, setPlanName] = useState<string | null>(null);
  const [planError, setPlanError] = useState(""), [seed, setSeed] = useState<TowerPlanDraft | null>(null), [savedPlan, setSavedPlan] = useState<TowerPlanRead | null>(null);
  const [seedKey, setSeedKey] = useState(0);
  const uid = useId(), request = useRef<AbortController | null>(null);
  const selectedPC = pcs.find(item => item.id === selected);
  useEffect(() => { const controller = new AbortController(); loadCatalogPCs(controller.signal).then(data => { if (!controller.signal.aborted) { setPCs(data.pcs); setAccess(data.access); } }); return () => { controller.abort(); request.current?.abort(); }; }, []);
  async function simulate(id: string, show = false) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    if (id !== selected) { setSeed(null); setSavedPlan(null); setPlanError(""); setPlanName(null); }
    setSelected(id); setResult(null); setError(false); setExpanded(show);
    const pc = pcs.find(item => item.id === id); if (!pc) { setBusy(false); return; } setBusy(true);
    try { const data = await simulatePiece(pc, part, controller.signal); if (!controller.signal.aborted) setResult(data); }
    catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function prepare() {
    if (!selectedPC || !catalogVersion) return;
    try {
      const name = (planName ?? `Mejora de ${selectedPC.name}`).trim();
      if (!name || name.length > 100 || name.includes("\0")) throw new Error("Poné un nombre para el plan (hasta 100 caracteres).");
      const draft = piecePlanDraft(selectedPC, part, { objective, budget_ars: budget, price_condition: condition, workload: null, thermal_available: false }, catalogVersion);
      setSeed({ ...draft, name }); setSeedKey(value => value + 1); setSavedPlan(null); setPlanError("");
    } catch (failure) { setSeed(null); setPlanError(failure instanceof Error ? failure.message : "No pudimos preparar el borrador."); }
  }
  const canPlan = !!selected && !!catalogVersion;
  return <><aside className="piece-side"><div className="piece-fit"><h2>¿Encaja en tu PC?</h2>
    {access === "loading" && <p>Cargando tus PCs…</p>}{access === "guest" && <p><Link href="/account">Entrá a tu cuenta</Link> para comprobarlo con tu PC.</p>}{access === "error" && <p role="alert">No pudimos cargar tus PCs. Volvé a intentar más tarde.</p>}
    {access === "ready" && (pcs.length ? <><label htmlFor="piece-pc">Elegí tu PC</label><select id="piece-pc" value={selected} onChange={event => void simulate(event.target.value)}><option value="">Elegí una PC</option>{pcs.map(pc => <option key={pc.id} value={pc.id}>{pc.name}</option>)}</select><p className="piece-source">Probamos el reemplazo de esta categoría por una unidad de esta pieza.</p></> : <p><Link href="/pcs">Agregá una PC</Link> para comprobar si encaja.</p>)}
    <div aria-live="polite">{busy && <p>Comprobando tu PC con este cambio…</p>}{error && <p role="alert">No pudimos comprobar tu PC ahora. Probá de nuevo en un rato.</p>}{result && <><PieceVerdict result={result} /><PieceChecks rules={result.rule_results} category={part.category} /></>}</div>
    <PiecePrices part={part} compact />
    {access === "ready" && pcs.length > 0 && <button type="button" className="piece-plan-button piece-primary" disabled={!canPlan} aria-expanded={planOpen} onClick={() => setPlanOpen(true)}>Sumar a mi plan</button>}
    {access === "ready" && pcs.length > 0 && !catalogVersion && <p className="piece-source">No pudimos consultar la versión del catálogo. Recargá la ficha para preparar un plan.</p>}
    {planOpen && canPlan && <div role="group" aria-label="Preparar plan desde esta pieza" className="piece-plan-form">
      <label htmlFor={`${uid}-objective`}>Objetivo del plan</label><select id={`${uid}-objective`} value={objective} onChange={event => setObjective(event.target.value as typeof objective)}><option value="general">Uso general</option><option value="gaming">Juegos</option><option value="productivity">Productividad</option></select>
      <label htmlFor={`${uid}-budget`}>Presupuesto total (ARS)</label><input id={`${uid}-budget`} inputMode="decimal" autoComplete="off" value={budget} onChange={event => setBudget(event.target.value)} />
      <label htmlFor={`${uid}-condition`}>Condición de precio</label><select id={`${uid}-condition`} value={condition} onChange={event => setCondition(event.target.value as typeof condition)}><option value="cash">Contado</option><option value="list">Lista (no cuotas)</option></select>
      <label htmlFor={`${uid}-name`}>Nombre del plan</label><input id={`${uid}-name`} maxLength={100} value={planName ?? `Mejora de ${selectedPC?.name ?? ""}`} onChange={event => setPlanName(event.target.value)} />
      <p className="piece-source">Todavía no se guarda nada: vas a revisar las etapas y confirmar al final.</p>
      {planError && <p role="alert">{planError}</p>}
      <button type="button" onClick={prepare}>Preparar borrador</button><button type="button" onClick={() => { setPlanOpen(false); setSeed(null); setPlanError(""); }}>Cancelar</button>
    </div>}
    {selected && <button type="button" className="secondary" disabled={busy} onClick={() => void simulate(selected, true)}>Ver cómo quedaría mi PC</button>}
    {expanded && result && <section><h3>Tu PC con este cambio</h3><ul>{result.evaluated_configuration.lines.map((line, index) => <li key={index}>{catalogCategories[line.category]}: {line.component_id === part.id ? part.name : line.declared_model ?? "Pieza guardada en tu PC"} · cantidad: {line.quantity}</li>)}</ul></section>}
    <p className="piece-source">Ver cómo quedaría es solo una prueba: tu PC guardada no cambia.</p>
  </div></aside>
  {planOpen && seed && selectedPC && <section className="piece-plan-draft" aria-label="Borrador de plan desde esta pieza">
    <TowerPlanEditor key={seedKey} seed={seed} pc={selectedPC} onSaved={plan => setSavedPlan(plan)} />
    {savedPlan && <p role="status">Plan guardado como versión {savedPlan.revision}. Tu PC no cambió. <Link href={`/tower-plans/${savedPlan.id}`}>Ver mi plan</Link></p>}
  </section>}</>;
}
