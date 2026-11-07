import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { Notice, Verdict } from "../../components/uj";
import { IconoDeCategoria } from "../../components/uj/part-card";
import type { MetadataSnapshot } from "../../lib/preview-metadata";
import { shortRetailDate } from "../../lib/retail-presentation";
import { budgetBarPercent, checkRows, proposalOffer } from "../../lib/conviene-presentation";
import { actionPrice, categoryNames, joinLabels, moneyText, swapSides, unknownChecks } from "../../lib/conviene-view";
import { coolerNote, needsCoolerCheck } from "../../lib/conviene-view";
import { boughtOn, doneCount, finishedParts, gainNote, gainText, monthsText, pcChanges, plainWords, priceRangeText, stageKicker, stageTitle } from "../../lib/mi-plan-view";
import { physicalSpaceNote, towerEssentialNote } from "../../lib/tower-compatibility";
import type { PlanStageRead, StageState, TowerPlanDraft, TowerPlanRead } from "../../lib/tower-plans";

type Tower = TowerPlanRead["snapshot"]["base_configuration"];
const check = <Check className="mp-icon" aria-hidden="true" />;

/** Una compra puede traer varios componentes, como placa de video y fuente: el precio es de todos juntos. */
function stageSwaps(plan: TowerPlanRead, index: number, names: MetadataSnapshot) {
  const { snapshot } = plan, stage = snapshot.stages[index];
  const before: Tower = index === 0 ? snapshot.base_configuration : snapshot.stages[index - 1].evaluated_configuration;
  const actions = stage.actions as TowerPlanDraft["stages"][number]["actions"];
  return (actions.length ? actions.map(action => [action]) : [[]]).map(group => {
    const swap = swapSides({ actions: group, versions: { catalog: snapshot.versions.catalog } }, before, names);
    return { actual: plainWords(swap.actual), nueva: plainWords(swap.nueva), price: actions.length > 1 && group[0] ? actionPrice(stage.cost, group[0]) ?? "Sin precio" : null };
  });
}
/** Los planes guardados llevan el nombre del primer componente; si la compra trae más, se nombran todos. */
function stageHeading(stage: PlanStageRead) {
  const first = stage.actions[0]?.category;
  if (stage.actions.length < 2 || !first || stage.name !== categoryNames[first]) return stageTitle(stage.name);
  const labels = stage.actions.map(action => categoryNames[action.category]);
  return labels.length === 2 ? `${labels[0]} y ${labels[1].toLowerCase()}` : joinLabels(labels);
}
const evaluationOf = (stage: PlanStageRead) => ({ evaluation: stage.evaluation }) as never;

/** Lo que falta saber de una compra, dicho en una frase. */
export function missingText(stage: PlanStageRead): string {
  if (stage.evaluation.verdict === "incompatible") return `No encaja con tu PC: ${joinLabels(checkRows(evaluationOf(stage)).filter(row => row.estado === "incompatible").map(row => row.label)) || "alguna comprobación"}.`;
  const faltan = unknownChecks(evaluationOf(stage));
  return faltan.length ? `No pudimos confirmar: ${joinLabels(faltan)}.` : "Todavía no pudimos comprobar si encaja con tu PC.";
}

export function EmptyView() {
  return <div className="mp">
    <section className="mp-head"><h1>Todavía no tenés un plan</h1><p>Un plan ordena tus compras para que mejores la PC de a poco, sin gastar todo junto.</p></section>
    <section className="mp-steps" aria-label="Cómo funciona">
      <div className="mp-m"><span className="mp-m-label">1</span><h3>Contanos qué querés</h3><small>Jugar mejor, trabajar más rápido o que abra todo sin esperar.</small></div>
      <div className="mp-m"><span className="mp-m-label">2</span><h3>Elegí lo que te conviene</h3><small>Te mostramos qué cambiar primero y cuánto sale.</small></div>
      <div className="mp-m"><span className="mp-m-label">3</span><h3>Comprá a tu ritmo</h3><small>Vas marcando lo que comprás y ves cuánto te falta.</small></div>
    </section>
    <div className="mp-cta"><Link className="mp-btn mp-btn-principal" href="/">Ver qué me conviene</Link></div>
  </div>;
}

export function NextPurchase({ plan, index, names, busy, canChange, onBuy, onOther }: { plan: TowerPlanRead; index: number; names: MetadataSnapshot; busy: boolean; canChange: boolean; onBuy: (key: string) => void; onOther: () => void }) {
  const { snapshot } = plan, stage = snapshot.stages[index], key = plan.stage_keys?.[index], swaps = stageSwaps(plan, index, names);
  const offer = proposalOffer(stage), price = moneyText(stage.cost.total_ars), gain = gainText(stage.benefit);
  const space = towerEssentialNote(stage.evaluation)?.includes(physicalSpaceNote) ? physicalSpaceNote : null;
  const ok = stage.evaluation.verdict === "compatible";
  return <section className="mp-next" aria-label="Tu próxima compra">
    <div className="mp-next-main">
      <div className="mp-row mp-between"><span className="mp-m-label">Tu próxima compra · {index + 1} de {snapshot.stages.length}</span><Verdict estado={stage.evaluation.verdict} /></div>
      <h2>{stageHeading(stage)}</h2>
      {swaps.length > 2 ? <ul className="mp-parts">{swaps.map((swap, part) => <li key={part}><span>{swap.nueva}</span>{swap.price && <b>{swap.price}</b>}</li>)}</ul> : swaps.map((swap, part) => <div key={part} className="mp-swap">
        <div className="mp-swap-side"><span className="mp-swap-label">Hoy tenés</span><b className="mp-part-name">{swap.actual}</b></div>
        <ArrowRight className="mp-icon" role="img" aria-label="se cambia por" />
        <div className="mp-swap-side is-new"><span className="mp-swap-label">Comprás</span><b className="mp-part-name">{swap.nueva}</b>{swap.price && <span className="mp-swap-price">{swap.price}</span>}</div>
      </div>)}
      {gain && <div className="mp-gain"><strong>{gain}</strong><small>{gainNote}</small></div>}
      {ok && space && <small className="mp-note">{space}</small>}
      {needsCoolerCheck(stage.actions) && <small className="mp-note">{coolerNote}</small>}
      {!ok && <Notice tono={stage.evaluation.verdict === "incompatible" ? "no" : "revisar"} titulo={stage.evaluation.verdict === "incompatible" ? "Este cambio no encaja" : "Falta un dato para estar seguros"}>{missingText(stage)}{stage.evaluation.verdict === "incompatible" ? " Elegí otro componente." : " Completá esos datos en Mi PC."}</Notice>}
    </div>
    <div className="mp-next-buy">
      <div className="mp-price">{price ?? "Sin precio"}</div>
      <small>{price && offer ? `${offer.condition} · visto el ${shortRetailDate(offer.date)} en ${offer.store}` : "Todavía no tenemos un precio para este componente."}</small>
      {key && <button type="button" className="mp-btn mp-btn-principal" disabled={busy} aria-label={`Ya la compré: ${stageHeading(stage)}`} onClick={() => onBuy(key)}>Ya la compré</button>}
      {offer?.url && <a className="mp-btn mp-btn-secundario" href={offer.url} target="_blank" rel="noopener noreferrer">Ver en la tienda</a>}
      <button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" disabled={busy || !canChange} onClick={onOther}>Elegir otro componente</button>
    </div>
  </section>;
}

export function MoneyStrip({ plan, states, onRefresh, busy, canRefresh }: { plan: TowerPlanRead; states: readonly StageState[]; onRefresh: () => void; busy: boolean; canRefresh: boolean }) {
  const { snapshot } = plan, done = doneCount(states), count = snapshot.stages.length;
  const total = moneyText(snapshot.cost.total_ars), spent = moneyText(plan.spent_ars), left = moneyText(plan.remaining_ars);
  const percent = budgetBarPercent(plan.spent_ars, snapshot.cost.total_ars);
  return <section className="mp-money" aria-label="Plata del plan">
    <div className="mp-m"><span className="mp-m-label">Todo el plan</span><b className="mp-m-value">{total ?? "Sin total"}</b><small>{total ? priceRangeText(plan) ?? "Con los precios que guardamos" : "Falta el precio de algún componente"}</small></div>
    <div className="mp-m"><span className="mp-m-label">Ya gastaste</span><b className="mp-m-value">{done === 0 ? "Nada todavía" : spent ?? "Falta un precio"}</b>{percent !== null && done > 0 && <div className="mp-prog" aria-hidden="true"><i style={{ width: `${percent}%` }} /></div>}<small>{done} de {count} {count === 1 ? "compra" : "compras"}</small></div>
    <div className="mp-m"><span className="mp-m-label">Te falta</span><b className="mp-m-value">{plan.remaining_ars !== null && plan.remaining_ars !== undefined && Number(plan.remaining_ars) === 0 ? "Nada" : left ?? "Falta un precio"}</b><small>Los precios cambian. <button type="button" className="mp-link" disabled={busy || !canRefresh} onClick={onRefresh}>Actualizar precios</button></small></div>
  </section>;
}

export function PurchaseList({ plan, states, names, marks, busy, canChange, onUndo, onAdd }: { plan: TowerPlanRead; states: readonly StageState[]; names: MetadataSnapshot; marks: Record<string, string> | undefined; busy: boolean; canChange: boolean; onUndo: (key: string) => void; onAdd: () => void }) {
  return <section aria-label="Todas tus compras">
    <h2>Todas tus compras</h2>
    <ol className="mp-list">{plan.snapshot.stages.map((stage, index) => {
      const state = states[index] ?? "pendiente", key = plan.stage_keys?.[index], nueva = stageSwaps(plan, index, names).map(swap => swap.nueva).join(" + "), price = moneyText(stage.cost.total_ars) ?? "Sin precio";
      const day = boughtOn(marks, key), verdict = stage.evaluation.verdict, problem = state !== "hecha" && verdict !== "compatible";
      return <li key={key ?? stage.position} className={state === "hecha" ? "mp-item is-done" : state === "actual" ? "mp-item is-now" : "mp-item"} aria-current={state === "actual" ? "step" : undefined}>
        <span className="mp-dot" aria-hidden="true">{state === "hecha" ? check : stage.position}</span>
        <span className="mp-item-t"><b>{stageHeading(stage)}</b><small>{state === "hecha" ? `${nueva} · ${day ? `comprada el ${day}` : "comprada"}` : state === "actual" ? `${nueva} · es tu próxima compra` : nueva}</small><span className="mp-sr">{stageKicker(stage.position, stage.actions[0]?.category, state)}</span></span>
        <span className="mp-item-r">{price}{state === "hecha" ? key && <button type="button" className="mp-link" disabled={busy} aria-label={`Deshacer: ${stageHeading(stage)}`} onClick={() => onUndo(key)}>Deshacer</button> : problem && <Verdict estado={verdict} />}</span>
        {problem && state !== "actual" && <div className="mp-warn"><small>{missingText(stage)}</small>{verdict === "requiere_verificacion" && <Link className="mp-btn mp-btn-secundario mp-btn-chico" href="/pcs">Completar el dato</Link>}</div>}
      </li>;
    })}</ol>
    <button type="button" className="mp-add" disabled={busy || !canChange} onClick={onAdd}><Plus className="mp-icon" aria-hidden="true" />Agregar otra compra</button>
  </section>;
}

export function SavingsCard({ value, onChange, months, hasRemaining }: { value: string; onChange: (value: string) => void; months: number | null; hasRemaining: boolean }) {
  return <div className="mp-card">
    <h3>¿Cuánto podés apartar?</h3>
    <label className="mp-field">Por mes<input inputMode="numeric" value={value} placeholder="$ 100.000" aria-label="Cuánto podés apartar por mes" onChange={event => onChange(event.target.value)} /></label>
    <p>{monthsText(months, hasRemaining)}</p>
    <small>Es una estimación con los precios de hoy. Queda solo en este navegador.</small>
  </div>;
}

export function EndCard({ plan, names }: { plan: TowerPlanRead; names: MetadataSnapshot }) {
  const parts = finishedParts(plan, names);
  if (!parts.length) return null;
  return <div className="mp-card">
    <h3>Tu PC al terminar</h3>
    <div>{parts.map(part => {
      const unknown = part.name === "Por confirmar" || part.name === "Sin componente de este tipo";
      return <div key={part.category} className={unknown ? "mp-slot is-unknown" : "mp-slot"}><span className="mp-slot-icon"><IconoDeCategoria categoria={categoryNames[part.category]} tamano="size-[18px]" /></span><span className="mp-slot-text"><span className="mp-slot-kind">{part.label}</span><b className="mp-slot-name">{part.name === "Por confirmar" ? "Falta un dato" : part.name}</b></span></div>;
    })}</div>
    <small>El resto de tus componentes sigue igual.</small>
  </div>;
}

export function ShareCard({ planId }: { planId: string }) {
  return <div className="mp-card">
    <h3>Compartí tu plan</h3>
    <small>Quien lo abra solo puede mirarlo. Lo apagás cuando quieras.</small>
    <Link className="mp-btn mp-btn-secundario mp-btn-chico" href={`/tower-plans/${planId}/shares`}>Crear enlace</Link>
  </div>;
}

export type PcOfferState = { phase: "listo" | "cambio" | "hecho" | "error"; index: number };

function Changes({ plan, names, index }: { plan: TowerPlanRead; names: MetadataSnapshot; index: number }) {
  return <div>{pcChanges(plan, names, index).map(change => <div key={change.category} className="mp-line"><span>{change.label}</span><b>{change.text}</b></div>)}</div>;
}

/** Ofrece actualizar Mi PC. Nada se guarda hasta que la persona toca «Sí, actualizar Mi PC». */
export function PcOffer({ offer, plan, names, busy, finished, onConfirm, onDecline }: { offer: PcOfferState; plan: TowerPlanRead; names: MetadataSnapshot; busy: boolean; finished: boolean; onConfirm: () => void; onDecline: () => void }) {
  const stage = plan.snapshot.stages[offer.index], title = stage ? stageTitle(stage.name) : "tu compra", total = moneyText(plan.spent_ars);
  const intro = "Tu PC guardada todavía tiene los componentes viejos. Si la actualizás, las próximas recomendaciones parten de lo que tenés ahora.";
  const status = offer.phase === "cambio" ? <Notice tono="info" titulo="Tu PC cambió desde que armaste el plan">Por eso no la tocamos. Tocá «Actualizar precios» para revisar el plan con tu PC de hoy.</Notice>
    : offer.phase === "hecho" ? <Notice tono="encaja" titulo="Listo, actualizamos Mi PC">Los componentes que compraste ya figuran en tu PC guardada.</Notice>
    : offer.phase === "error" ? <Notice tono="no" titulo="No pudimos actualizar Mi PC">Tu PC sigue igual. Probá de nuevo en un momento.</Notice> : null;
  const actions = offer.phase === "listo" || offer.phase === "error";
  const buttons = actions ? <>
    <button type="button" className="mp-btn mp-btn-principal" disabled={busy} onClick={onConfirm}>Sí, actualizar Mi PC</button>
    <button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" disabled={busy} onClick={onDecline}>Ahora no</button>
  </> : <button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" onClick={onDecline}>Cerrar</button>;
  if (!finished) return <section className="mp-offer" aria-label="Actualizar Mi PC">
    <h3>{`Compraste: ${title}. ¿Actualizamos Mi PC?`}</h3>
    {status ?? <p>{intro}</p>}
    {actions && <Changes plan={plan} names={names} index={offer.index} />}
    <div className="mp-row">{buttons}</div>
  </section>;
  return <section className="mp-next" aria-label="Actualizar Mi PC">
    <div className="mp-next-main">
      <span className="mp-m-label">Último paso</span>
      <h2>¿Actualizamos Mi PC?</h2>
      {status ?? <p className="mp-lead">{intro}</p>}
      {actions && <Changes plan={plan} names={names} index={offer.index} />}
    </div>
    <div className="mp-next-buy">
      <span className="mp-m-label">Gastaste en total</span>
      <div className="mp-price">{total ?? "Sin total"}</div>
      <small>Según los precios guardados en tu plan</small>
      {buttons}
    </div>
  </section>;
}
