"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RemoteProductSelector from "./remote-product-selector";
import { TowerProductPhoto } from "./tower-product-summary";
import { parseCatalogTowerComponent, parseCatalogTowerPage } from "../lib/catalog-tower-consumer";
import { catalogBoundOffers } from "../lib/catalog-offers";
import { remoteCatalog, type TowerComponent } from "../lib/tower-catalog";
import { towerCategories, towerKeys, towerRequest, type Tower, type TowerCategory } from "../lib/towers";
import { displayRetailDate, formatRetailARS } from "../lib/retail-presentation";
import { purchaseAdd, purchaseInput, purchasePlan, purchaseSubtotal, type PurchaseLine } from "../lib/purchase-draft";
import PurchaseCostSummary, { PurchaseLineQuote } from "./purchase-cost-summary";
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
import { firstBuildRequest, loadFirstBuild } from "../lib/first-build";
import "./purchase-builder.css";

const SELECCION = "block w-full min-h-12 rounded-sm border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-4 py-space-3 text-cuerpo text-tinta font-sans-uj focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

function PurchaseSelector({ category, condition, disabled, onAdd }: { category: TowerCategory; condition: "cash" | "list"; disabled: boolean; onAdd: (line: PurchaseLine, mode: "replace_category" | "add_line") => void }) {
  const [id, setId] = useState(""), [part, setPart] = useState<TowerComponent | null>(null), [quantity, setQuantity] = useState(""), [offerId, setOfferId] = useState(""), [mode, setMode] = useState<"replace_category" | "add_line">("replace_category"), [error, setError] = useState("");
  const active = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => () => { generation.current++; active.current?.abort(); }, []);
  async function choose(value: string) {
    active.current?.abort(); const ticket = ++generation.current, abort = new AbortController(); active.current = abort;
    setId(value); setPart(null); setQuantity(""); setOfferId(""); setError(""); if (!value) return;
    try { const result = parseCatalogTowerComponent(await remoteCatalog<unknown>(`/${encodeURIComponent(value)}`, abort.signal)); if (result.category !== category) throw new Error(); if (ticket === generation.current && !abort.signal.aborted) setPart(result); }
    catch { if (ticket === generation.current && !abort.signal.aborted) setError("No se pudo confirmar la pieza. No se agregó ninguna compra."); }
  }
  const offers = part ? catalogBoundOffers(part).filter(offer => offer.condition === condition) : [];
  return <fieldset disabled={disabled} className="stack-sm"><RemoteProductSelector category={category} value={id || null} onChange={value => { void choose(value); }} />
    {part && <><label>Cantidad explícita de {towerCategories[category]}<input type="number" min={1} max={category === "fan" ? 32 : category === "ram" || category === "storage" ? 16 : 1} value={quantity} onChange={event => setQuantity(event.target.value)} /></label><label>Cotización para subtotal de {towerCategories[category]}<select value={offers.some(offer => offer.offer_id === offerId) ? offerId : ""} onChange={event => setOfferId(event.target.value)}><option value="">Sin cotización elegida; coste pendiente</option>{offers.map(offer => <option key={offer.offer_id} value={offer.offer_id}>{offer.store} · {formatRetailARS(offer.amount)} · guardado {displayRetailDate(offer.observed_at)}</option>)}</select></label>{["storage", "fan"].includes(category) && <label>Acción de compra<select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="replace_category">Reemplazar selección completa de categoría</option><option value="add_line">Añadir otra línea</option></select></label>}<p>{category === "ram" ? "RAM: cantidad de módulos; reemplaza todo el conjunto. No se deduce capacidad." : "Cantidad de unidades, no capacidad ni rendimiento."}</p><button type="button" onClick={() => { try { if (!/^[1-9]\d*$/.test(quantity)) throw new Error("Indicá una cantidad explícita."); onAdd({ part, quantity: Number(quantity), offer: offers.find(offer => offer.offer_id === offerId) ?? null }, mode); setError(""); } catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá la selección."); } }}>Agregar compra de {towerCategories[category]}</button></>}{error && <p role="alert">{error}</p>}</fieldset>;
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
  useEffect(() => {
    const wanted = firstBuildRequest(window.location.search);
    if (!wanted) return;
    const controller = new AbortController();
    async function start(goal: NonNullable<typeof wanted>) {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setAuto({ state: "working", notices: [] });
      setCriteria(current => withBudget(withObjective(current, goal.objective), goal.budget));
      try {
        const { proposal, lines: proposed } = await loadFirstBuild(goal.objective, goal.budget, controller.signal);
        if (controller.signal.aborted) return;
        setLines(proposed);
        setAuto({ state: proposal.status === "proposed" ? "ready" : "none", notices: proposal.notices });
      } catch { if (!controller.signal.aborted) setAuto({ state: "error", notices: [] }); }
    }
    void start(wanted);
    return () => controller.abort();
  }, []);
  function changeLines(next: PurchaseLine[]) { setLines(next); setConfirmed(false); setError(""); }
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
  const subtotal = purchaseSubtotal(lines, criteria.price_condition);
  const totalVisible = subtotal.selected_subtotal_ars === null ? (lines.length ? "Subtotal parcial" : "Todavía no hay compras") : formatRetailARS(subtotal.selected_subtotal_ars);
  return <section className="build-screen" aria-label="Armado desde cero">
    <header className="build-hero">
      <h1>Armemos una PC nueva</h1>
      <p>{auto?.state === "ready" ? "Esta es la PC que te proponemos. Nada se guarda hasta que vos lo confirmes." : "Contanos para qué la querés y cuánto querés gastar. Después elegí las piezas que pensás comprar. Elegir no guarda nada ni revisa si encajan: eso viene después de guardar."}</p>
    </header>

    {auto?.state === "working" && <div role="status"><Notice tono="info" titulo="Estamos armando tu PC">Buscamos las piezas que mejor rinden con tu presupuesto y revisamos que encajen.</Notice></div>}
    {auto?.state === "ready" && <Notice tono="encaja" titulo="Te armamos una PC completa que encaja">Revisamos que las piezas encajen según datos de referencia. Podés cambiar cualquiera más abajo. Chequeá stock antes de comprar.{auto.notices.length > 0 && <ul>{auto.notices.map(text => <li key={text}>{text}</li>)}</ul>}</Notice>}
    {auto?.state === "none" && <Notice tono="info" titulo="Con este presupuesto no llegamos a una PC completa">Probá con un monto mayor o elegí las piezas a mano.</Notice>}
    {auto?.state === "error" && <Notice tono="revisar" titulo="No pudimos armar la propuesta">Podés elegir las piezas a mano.</Notice>}

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

    {error && <p role="alert">{error}</p>}

    <div className="build-result">
      <section aria-label="Compras seleccionadas" className="build-main">
        <div className="build-head">
          <div><h2>Tu armado manual, por comprar</h2><p>Nueve categorías para elegir a mano. Son piezas que pensás comprar, no las de una PC que ya tenés.</p></div>
        </div>
        <div className="build-list">
          {towerKeys.map(category => {
            const elegidas = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.part.category === category);
            const nombre = towerCategories[category].toLowerCase();
            return <article key={category} id={`purchase-${category}`} className={`build-part${elegidas.length ? " is-chosen" : " is-empty"}`}>
              <div className="build-part-top">
                <span className="build-part-photo"><HardwareArt category={category} /></span>
                <div><h3>{towerCategories[category]}</h3><p>{elegidas.length ? "Compra seleccionada" : "Todavía sin elegir"}</p></div>
              </div>
              {elegidas.map(({ line, index }) => <div key={`${line.part.id}-${index}`} className="build-line">
                <TowerProductPhoto part={line.part} />
                <div><p>{line.part.name}</p><small>Cantidad explícita: {line.quantity} {category === "ram" ? "módulos" : "unidades"}</small><PurchaseLineQuote line={line} condition={criteria.price_condition} /></div>
                <div className="build-line-side">
                  <span className="build-price">{line.offer?.amount ? formatRetailARS(line.offer.amount) : "Precio sin cotizar"}</span>
                  {!saved && <button type="button" className="text-button" disabled={busy} onClick={() => changeLines(lines.filter((_, i) => i !== index))}>Quitar compra {index + 1}</button>}
                </div>
              </div>)}
              {!saved && <details className="build-picker"><summary>{elegidas.length ? `Cambiar ${nombre}` : `Elegir ${nombre} del catálogo`}</summary><PurchaseSelector category={category} condition={criteria.price_condition} disabled={busy || uncertain} onAdd={(line, mode) => changeLines(purchaseAdd(lines, line, mode))} /></details>}
            </article>;
          })}
        </div>
      </section>

      <aside className="build-sum purchase-summary" aria-label="Resumen de compras">
        <p className="m-0 justify-self-start rounded-pill bg-pino-suave px-space-3 py-space-1 text-etiqueta text-pino">Armado manual · por comprar</p>
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
