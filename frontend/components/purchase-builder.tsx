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
import { purchaseAdd, purchaseInput, purchasePlan, type PurchaseLine } from "../lib/purchase-draft";
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

const PANEL = "grid min-w-0 content-start gap-space-4 rounded-lg border border-solid border-linea bg-papel-alto p-space-5 min-[641px]:p-space-6";
const PASO = "text-etiqueta text-tinta-suave";
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
  return <section className="purchase-workbench stack" aria-label="Armado desde cero"><header className="grid min-w-0 max-w-[760px] gap-space-2">
      <h1 className="m-0 font-display text-titular-l tracking-[-0.02em] min-[641px]:text-titular-xl">Armá tu PC pieza por pieza</h1>
      <p className="m-0 text-cuerpo-l text-tinta-suave">Contanos para qué la querés y cuánto querés gastar. Después elegí las piezas que pensás comprar. Elegir no guarda nada ni revisa si encajan: eso viene después de guardar.</p>
    </header>
    <fieldset disabled={busy || !!saved} className="m-0 grid min-w-0 gap-space-5 border-0 p-0 min-[1001px]:grid-cols-2">
      <legend className="sr-only">Para qué la querés y cuánto querés gastar</legend>
      <div className={PANEL}>
        <span className={PASO}>Paso 1</span>
        <GoalPicker pregunta="¿Para qué la vas a usar?" nombre="Objetivo del armado" opciones={BUILD_OBJECTIVES} valor={criteria.objective} onCambio={valor => { if (isBuildObjective(valor)) changeCriteria(withObjective(criteria, valor)); }} />
        {criteria.objective === "productivity" && <label className="grid gap-space-2 text-cuerpo-fuerte">Trabajo del armado<select className={SELECCION} value={criteria.workload ?? ""} onChange={event => changeCriteria(withWorkload(criteria, event.target.value))}><option value="">Sin trabajo especificado</option><option value="blender-cpu">Blender · CPU</option></select></label>}
      </div>
      <div className={PANEL}>
        <span className={PASO}>Paso 2</span>
        <h2 className="m-0 font-display text-titular-m">¿Hasta cuánto querés gastar?</h2>
        <Field etiqueta="Presupuesto ARS del armado" ayuda="Es opcional. Usá punto para los centavos, por ejemplo 1234.56. Si lo dejás vacío, no comparamos contra ningún tope." inputMode="decimal" value={criteria.budget_ars} onChange={event => changeCriteria(withBudget(criteria, event.target.value))} placeholder="Sin presupuesto" />
        <label className="grid gap-space-2 text-cuerpo-fuerte">Condición del armado<select className={SELECCION} value={criteria.price_condition} onChange={event => changeCriteria({ ...criteria, price_condition: event.target.value === "list" ? "list" : "cash" })}><option value="cash">Contado</option><option value="list">Lista (no cuotas)</option></select></label>
      </div>
    </fieldset>
    {error && <p role="alert">{error}</p>}<div className="purchase-layout"><section aria-label="Compras seleccionadas" className="purchase-inventory"><div className="grid gap-space-1 py-space-4"><h2 className="m-0 font-display text-titular-m">Tu armado manual, por comprar</h2><p className="m-0 text-chico text-tinta-suave">Nueve categorías para elegir a mano. Son piezas que pensás comprar, no las de una PC que ya tenés.</p></div>{towerKeys.map(category => <section key={category} id={`purchase-${category}`} className="purchase-category"><header>{!lines.some(line => line.part.category === category) && <span className="unselected-photo"><HardwareArt category={category} /></span>}<div><h3>{towerCategories[category]}</h3><p>{lines.some(line => line.part.category === category) ? "Compra seleccionada" : "Todavía sin elegir"}</p></div></header>{lines.map((line, index) => line.part.category !== category ? null : <div key={`${line.part.id}-${index}`} className="purchase-part row"><TowerProductPhoto part={line.part} /><div><p>{line.part.name}</p><small>Cantidad explícita: {line.quantity} {category === "ram" ? "módulos" : "unidades"}</small><PurchaseLineQuote line={line} condition={criteria.price_condition} /></div>{!saved && <button type="button" className="text-button" disabled={busy} onClick={() => changeLines(lines.filter((_, i) => i !== index))}>Quitar compra {index + 1}</button>}</div>)}{!saved && <details><summary>Elegir {towerCategories[category]} del catálogo</summary><PurchaseSelector category={category} condition={criteria.price_condition} disabled={busy || uncertain} onAdd={(line, mode) => changeLines(purchaseAdd(lines, line, mode))} /></details>}</section>)}</section>
    <aside className="purchase-summary stack" aria-label="Resumen de compras"><p className="m-0 justify-self-start rounded-pill bg-pino-suave px-space-3 py-space-1 text-etiqueta text-pino">Armado manual · por comprar</p><p className="purchase-objective">{criteria.objective === "gaming" ? "Para jugar" : criteria.objective === "productivity" ? "Para trabajar" : "Para uso general"}</p><PurchaseCostSummary lines={lines} condition={criteria.price_condition} budget={criteria.budget_ars} /><p className="compact-help">Sólo compras elegidas. Envío, financiación y mano de obra excluidos.</p><details><summary>Cómo guardar y comprobar</summary><p>Guardá tu propuesta para comprobarla. No se compra, publica ni modifica otra PC automáticamente. Los precios y el stock deben verificarse antes de comprar.</p></details>
      {!saved ? <form aria-label="Guardar armado propuesto" onSubmit={save} className="stack-sm"><fieldset disabled={busy || uncertain} className="stack-sm"><label>Nombre del armado propuesto<input maxLength={60} value={name} onChange={event => { setName(event.target.value); setConfirmed(false); }} /></label><label className="share-consent"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo guardar una configuración por comprar, no una PC que ya poseo</label><button disabled={!confirmed || !lines.length}>Guardar configuración propuesta</button></fieldset></form> : <><p role="status">Configuración propuesta guardada. No se realizó una compra ni se acreditó compatibilidad.</p><button type="button" disabled={busy} onClick={() => { void preparePlan(); }}>Planificar compras seleccionadas</button><p>El servidor cotiza de nuevo al guardar el plan; revisá diferencias con el subtotal local.</p></>}<Link href="/pcs">Mis PCs y configuraciones guardadas</Link><Link href="/catalog">Explorar fichas del catálogo</Link></aside></div>
    {saved && <><section className="surface"><h2>Comprobar la configuración propuesta guardada</h2><TowerCompatibility pc={saved} disabled={busy} /></section><TowerRecommendations pc={saved} disabled={busy} initialDraft={criteria} /></>}
    {seed && !plan && saved && <TowerPlanEditor key={`${saved.id}-${preparation}`} seed={seed} pc={saved} onSaved={setPlan} />}{plan && <><TowerPlanView plan={plan} /><Link href={`/tower-plans/${plan.id}`}>Abrir plan guardado e historial</Link></>}
  </section>;
}
