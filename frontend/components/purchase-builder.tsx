"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RemoteProductSelector from "./remote-product-selector";
import { TowerProductPhoto } from "./tower-product-summary";
import { parseCatalogTowerComponent, parseCatalogTowerPage } from "../lib/catalog-tower-consumer";
import { bestOffer, isSingleUnitCategory, quantityLimit } from "../lib/catalog-offers";
import { remoteCatalog } from "../lib/tower-catalog";
import { towerCategories, towerKeys, towerRequest, type Tower, type TowerCategory } from "../lib/towers";
import { formatRetailARS } from "../lib/retail-presentation";
import { purchaseAdd, purchaseInput, purchasePlan, purchaseSubtotal, type PurchaseLine } from "../lib/purchase-draft";
import PurchaseCostSummary from "./purchase-cost-summary";
import type { RecommendationDraft } from "../lib/tower-recommendations";
import type { TowerPlanDraft, TowerPlanRead } from "../lib/tower-plans";
import TowerCompatibility from "../app/pcs/tower-compatibility";
import TowerRecommendations from "../app/pcs/tower-recommendations";
import TowerPlanEditor from "./tower-plan-editor";
import TowerPlanView from "./tower-plan-view";
import HardwareArt from "./hardware-art";
import { Field } from "./uj/field";
import { GoalPicker } from "./uj/goal-picker";
import { BUILD_OBJECTIVES, emptyBuildCriteria, isBuildObjective, withBudget, withObjective, withWorkload } from "../lib/build-criteria";
import { Notice } from "./uj/notice";
import { firstBuildReason, firstBuildRequest, loadFirstBuild, proposalBudget, type FirstBuildGoal } from "../lib/first-build";
import "./purchase-builder.css";

const SELECCION = "block w-full min-h-12 rounded-sm border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-4 py-space-3 text-cuerpo text-tinta font-sans-uj focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

function PurchaseSelector({ category, condition, disabled, current, onAdd, onRemove }: { category: TowerCategory; condition: "cash" | "list"; disabled: boolean; current: PurchaseLine | null; onAdd: (line: PurchaseLine, mode: "replace_category" | "add_line") => void; onRemove: () => void }) {
  const [error, setError] = useState(""), [qtyText, setQtyText] = useState<{ id: string; text: string } | null>(null);
  const active = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => { generation.current++; active.current?.abort(); }, []);
  // Elegir es un clic: se busca la ficha completa y el componente entra al armado con cantidad 1 y su mejor oferta vigente.
  async function choose(value: string) {
    active.current?.abort(); const ticket = ++generation.current, abort = new AbortController(); active.current = abort;
    setError(""); setQtyText(null); if (!value) return;
    try { const result = parseCatalogTowerComponent(await remoteCatalog<unknown>(`/${encodeURIComponent(value)}`, abort.signal)); if (result.category !== category) throw new Error(); if (ticket === generation.current && !abort.signal.aborted) onAdd({ part: result, quantity: 1, offer: bestOffer(result, condition) }, "replace_category"); }
    catch { if (ticket === generation.current && !abort.signal.aborted) setError("No se pudo confirmar el componente. No se agregó nada."); }
  }
  function remove() { generation.current++; active.current?.abort(); setError(""); setQtyText(null); onRemove(); }
  const max = quantityLimit(category), shown = current && qtyText?.id === current.part.id ? qtyText.text : String(current?.quantity ?? 1);
  function changeQuantity(text: string) {
    if (!current) return;
    setQtyText({ id: current.part.id, text });
    if (/^[1-9]\d?$/.test(text) && Number(text) <= max) onAdd({ ...current, quantity: Number(text) }, "replace_category");
  }
  return <fieldset disabled={disabled} className="stack-sm"><RemoteProductSelector category={category} value={current?.part.id ?? null} onChange={value => { void choose(value); }} onClear={remove} />
    {current && !isSingleUnitCategory(category) && <label className="build-quantity">Cantidad<input type="number" inputMode="numeric" min={1} max={max} step={1} value={shown} onChange={event => changeQuantity(event.target.value)} />{category === "ram" && <small>Módulos iguales</small>}</label>}
    {error && <p role="alert">{error}</p>}</fieldset>;
}

export default function PurchaseBuilder() {
  const [lines, setLines] = useState<PurchaseLine[]>([]), [name, setName] = useState(""), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState("");
  const [criteria, setCriteria] = useState<RecommendationDraft>(emptyBuildCriteria);
  const [saved, setSaved] = useState<Tower | null>(null), [seed, setSeed] = useState<TowerPlanDraft | null>(null), [plan, setPlan] = useState<TowerPlanRead | null>(null);
  const [preparation, setPreparation] = useState(0);
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // Viene de Inicio con objetivo y presupuesto: arranca con una PC completa que ya encaja, editable.
  const [auto, setAuto] = useState<{ state: "working" | "ready" | "none" | "error"; notices: string[] } | null>(null);
  const [edited, setEdited] = useState(false), [opened, setOpened] = useState<TowerCategory | null>(null);
  const proposing = useRef<AbortController | null>(null), lastAsked = useRef("");
  async function propose(goal: FirstBuildGoal, keepOnFailure: boolean) {
    proposing.current?.abort();
    const controller = new AbortController(); proposing.current = controller;
    lastAsked.current = JSON.stringify(goal);
    setAuto({ state: "working", notices: [] });
    try {
      const { proposal, lines: proposed } = await loadFirstBuild(goal, controller.signal);
      if (controller.signal.aborted) return;
      const found = proposal.status === "proposed";
      if (found || !keepOnFailure) { setLines(proposed); setEdited(false); setConfirmed(false); }
      setAuto({ state: found ? "ready" : "none", notices: proposal.notices });
    } catch { if (!controller.signal.aborted) setAuto({ state: "error", notices: [] }); }
  }
  useEffect(() => () => proposing.current?.abort(), []);
  useEffect(() => {
    const wanted = firstBuildRequest(window.location.search);
    if (!wanted) return;
    void Promise.resolve().then(() => {
      setAuto({ state: "working", notices: [] });
      setCriteria(current => withBudget(withObjective(current, wanted.objective), wanted.budget));
    });
  }, []);
  // La propuesta sigue a los datos de arriba. Si la persona ya tocó componentes, no se pisa: decide con el botón.
  const budget = proposalBudget(criteria.budget_ars), following = auto !== null && !edited && !saved;
  const goal: FirstBuildGoal | null = budget ? { objective: criteria.objective, budget, condition: criteria.price_condition } : null;
  useEffect(() => {
    if (!following || !budget) return;
    const next: FirstBuildGoal = { objective: criteria.objective, budget, condition: criteria.price_condition };
    if (JSON.stringify(next) === lastAsked.current) return;
    const timer = setTimeout(() => { void propose(next, false); }, lastAsked.current ? 500 : 0);
    return () => clearTimeout(timer);
  }, [following, budget, criteria.objective, criteria.price_condition]);
  function changeLines(next: PurchaseLine[]) { setLines(next); setEdited(true); setConfirmed(false); setError(""); }
  function changeCriteria(next: RecommendationDraft) { setCriteria(next); setConfirmed(false); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || !confirmed || !lines.length || saved || uncertain) return;
    let input; try { input = purchaseInput(lines, name); } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá la configuración."); return; }
    lock.current = true; setBusy(true); setError("");
    try { const response = await towerRequest("", "POST", input); const result = await response.json() as Tower; if (alive.current) { setSaved(result); setConfirmed(false); } }
    catch { if (alive.current) { setUncertain(true); setError("Guardado no confirmado: pudo crearse la configuración. Revisá Mis PCs antes de volver a guardar. No se reintenta automáticamente."); } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function preparePlan() {
    if (!saved || lock.current) return; lock.current = true; setBusy(true); setError("");
    try { const catalog = parseCatalogTowerPage(await remoteCatalog<unknown>("?page=1&page_size=1")); if (alive.current) { setSeed(purchasePlan(saved, criteria, catalog.dataset_version)); setPreparation(value => value + 1); setPlan(null); } }
    catch { if (alive.current) setError("No se pudo confirmar el catálogo. No se preparó ni guardó un plan."); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const proposed = auto?.state === "ready" && !edited;
  const subtotal = purchaseSubtotal(lines, criteria.price_condition);
  const totalVisible = subtotal.selected_subtotal_ars === null ? (lines.length ? "Subtotal parcial" : "Todavía no hay compras") : formatRetailARS(subtotal.selected_subtotal_ars);
  return <section className="build-screen" aria-label="Armado desde cero">
    <header className="build-hero">
      <h1>Armemos una PC nueva</h1>
      <p>{auto?.state === "ready" ? "Esta es la PC que te proponemos. Nada se guarda hasta que vos lo confirmes." : "Contanos para qué la querés y cuánto querés gastar. Después elegí los componentes que pensás comprar. Elegir no guarda nada. Si los componentes encajan entre sí lo revisamos en el resumen, después de guardar."}</p>
    </header>

    <div className="build-notice">
      {auto?.state === "working" && <Notice tono="info" titulo="Estamos armando tu PC">Buscamos los componentes que mejor rinden con tu presupuesto y revisamos que encajen.</Notice>}
      {auto?.state === "ready" && <Notice tono="encaja" titulo="Te armamos una PC completa que encaja">{firstBuildReason(criteria.objective)} Podés cambiar cualquiera más abajo. Chequeá stock antes de comprar.{auto.notices.length > 0 && <ul>{auto.notices.map(text => <li key={text}>{text}</li>)}</ul>}</Notice>}
      {auto?.state === "none" && <Notice tono="info" titulo="Con este presupuesto no llegamos a una PC completa">Probá con un monto mayor o elegí los componentes a mano.</Notice>}
      {auto?.state === "error" && <Notice tono="revisar" titulo="No pudimos armar la propuesta">Podés elegir los componentes a mano.</Notice>}
    </div>

    <fieldset disabled={busy || !!saved} className="build-ask">
      <legend className="sr-only">Para qué la querés y cuánto querés gastar</legend>
      <div className="build-panel">
        <span className="build-step">Paso 1</span>
        <GoalPicker pregunta="¿Para qué la vas a usar?" nombre="Objetivo del armado" opciones={BUILD_OBJECTIVES} valor={criteria.objective} onCambio={valor => { if (isBuildObjective(valor)) changeCriteria(withObjective(criteria, valor)); }} />
        {criteria.objective === "productivity" && <label className="build-field">Trabajo del armado<select className={SELECCION} value={criteria.workload ?? ""} onChange={event => changeCriteria(withWorkload(criteria, event.target.value))}><option value="">Sin trabajo especificado</option><option value="blender-cpu">Blender · CPU</option></select></label>}
      </div>
      <div className="build-panel">
        <span className="build-step">Paso 2</span>
        <h2>¿Hasta cuánto querés gastar?</h2>
        <Field etiqueta="Presupuesto ARS del armado" ayuda="Es opcional. Usá punto para los centavos, por ejemplo 1234.56. Si lo dejás vacío, no comparamos contra ningún tope." inputMode="decimal" value={criteria.budget_ars} onChange={event => changeCriteria(withBudget(criteria, event.target.value))} placeholder="Sin presupuesto" />
        <label className="build-field">Condición del armado<select className={SELECCION} value={criteria.price_condition} onChange={event => changeCriteria({ ...criteria, price_condition: event.target.value === "list" ? "list" : "cash" })}><option value="cash">Contado</option><option value="list">Lista (no cuotas)</option></select></label>
      </div>
    </fieldset>

    {goal && !following && !saved && auto?.state !== "working" && <div className="build-rebuild"><button type="button" disabled={busy} onClick={() => { void propose(goal, true); }}>{lines.length ? "Volver a armar con estos datos" : "Armar una PC con estos datos"}</button>{lines.length > 0 && <small>Reemplaza los componentes que elegiste.</small>}</div>}

    {error && <p role="alert">{error}</p>}

    <div className="build-result">
      <section aria-label="Compras seleccionadas" className="build-main">
        <div className="build-head">
          {proposed ? <div><h2>Los componentes de tu PC</h2><p>Si querés otro, tocá la X y elegilo de la lista.</p></div> : <div><h2>Tu armado manual, por comprar</h2><p>Nueve categorías para elegir a mano. Son componentes que pensás comprar, no los de una PC que ya tenés.</p></div>}
        </div>
        <div className="build-list">
          {towerKeys.map(category => {
            const elegidas = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.part.category === category);
            const nombre = towerCategories[category].toLowerCase();
            return <article key={category} id={`purchase-${category}`} className={`build-part${elegidas.length ? " is-chosen" : " is-empty"}`}>
              <div className="build-part-top">
                <span className="build-part-photo"><HardwareArt category={category} /></span>
                <div><h3>{towerCategories[category]}</h3>{!elegidas.length && <p>Todavía sin elegir</p>}</div>
              </div>
              {saved && elegidas.map(({ line, index }) => <div key={`${line.part.id}-${index}`} className="build-line">
                <TowerProductPhoto part={line.part} />
                <div><p>{line.part.name}</p>{!isSingleUnitCategory(category) && <small>Cantidad: {line.quantity}</small>}</div>
                <span className="build-price">{line.offer?.amount ? formatRetailARS(line.offer.amount) : "Sin precio por ahora"}</span>
              </div>)}
              {!saved && !elegidas.length && <button type="button" className="build-picker-toggle" aria-expanded={opened === category} onClick={() => setOpened(opened === category ? null : category)}>Elegir {nombre} del catálogo</button>}
              {!saved && (elegidas.length > 0 || opened === category) && <div className="build-picker"><PurchaseSelector category={category} condition={criteria.price_condition} disabled={busy || uncertain} current={elegidas[0]?.line ?? null} onAdd={(line, mode) => changeLines(purchaseAdd(lines, line, mode))} onRemove={() => { setOpened(category); changeLines(lines.filter(item => item.part.category !== category)); }} /></div>}
            </article>;
          })}
        </div>
      </section>

      <aside className="build-sum purchase-summary" aria-label="Resumen de compras">
        <p className="m-0 justify-self-start rounded-pill bg-pino-suave px-space-3 py-space-1 text-etiqueta text-pino">{proposed ? "PC propuesta" : "Armado manual"} · por comprar</p>
        <p className="purchase-objective">{criteria.objective === "gaming" ? "Para jugar" : criteria.objective === "productivity" ? "Para trabajar" : "Para uso general"}</p>
        <div className="build-total">
          <span className="build-total-label">Subtotal de compras seleccionadas</span>
          <strong className="build-total-value">{totalVisible}</strong>
          <small>No es el total del armado.</small>
        </div>
        <PurchaseCostSummary lines={lines} condition={criteria.price_condition} budget={criteria.budget_ars} />
        <p className="build-note">Sólo compras elegidas. Envío, financiación y mano de obra excluidos.</p>
        <details><summary>Cómo guardar y comprobar</summary><p>Guardá tu propuesta para comprobarla. No se compra, publica ni modifica otra PC automáticamente. Los precios y el stock deben verificarse antes de comprar.</p></details>
        {!saved ? <form aria-label="Guardar armado propuesto" onSubmit={save} className="stack-sm"><fieldset disabled={busy || uncertain} className="stack-sm"><label>Nombre del armado propuesto<input maxLength={60} value={name} onChange={event => { setName(event.target.value); setConfirmed(false); }} /></label><label className="share-consent"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo guardar una configuración por comprar, no una PC que ya poseo</label><button disabled={!confirmed || !lines.length}>Guardar configuración propuesta</button></fieldset></form> : <><p role="status">Configuración propuesta guardada. No se realizó una compra ni se acreditó compatibilidad.</p><button type="button" disabled={busy} onClick={() => { void preparePlan(); }}>Planificar compras seleccionadas</button><p>El servidor cotiza de nuevo al guardar el plan; revisá diferencias con el subtotal local.</p></>}
        <Link href="/pcs">Mis PCs y configuraciones guardadas</Link>
        <Link href="/catalog">Explorar fichas del catálogo</Link>
      </aside>
    </div>

    {saved && <><section className="surface"><h2>Comprobar la configuración propuesta guardada</h2><TowerCompatibility pc={saved} disabled={busy} /></section><TowerRecommendations pc={saved} disabled={busy} initialDraft={criteria} /></>}
    {seed && !plan && saved && <TowerPlanEditor key={`${saved.id}-${preparation}`} seed={seed} pc={saved} onSaved={setPlan} />}{plan && <><TowerPlanView plan={plan} /><Link href={`/tower-plans/${plan.id}`}>Abrir plan guardado e historial</Link></>}
  </section>;
}
