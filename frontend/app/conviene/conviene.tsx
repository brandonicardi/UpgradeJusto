"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { Notice, PriceTag, Verdict } from "../../components/uj";
import { IconoDeCategoria } from "../../components/uj/part-card";
import { formatearMonto } from "../../components/uj/monto";
import SaveToPlan from "./save-to-plan";
import { createPreviewMetadataLoader, type MetadataSnapshot } from "../../lib/preview-metadata";
import { budgetBarPercent, cheapestFirst, checkRows, closestOverBudget, discardReason, groupProposals, proposalOffer } from "../../lib/conviene-presentation";
import { altLabel, benefitLine, coolerNote, needsCoolerCheck, budgetState, categoryNames, chooseMain, convieneDraft, introLine, joinLabels, maxDiscardedShown, metadataQueriesFor, moneyText, pcAfterChange, planDraftFor, planLead, proposalCategory, swapSides, unknownChecks, whyReasons, workloadNote } from "../../lib/conviene-view";
import { goalByKey, type GoalKey } from "../../lib/home-goals";
import { proposalTitle } from "../../lib/recommendation-card-presentation";
import { towerEssentialNote } from "../../lib/tower-compatibility";
import { createTowerRecommendations, recommendationAdvice, type RecommendationAdvice, type RecommendationState, type TowerRecommendationItem } from "../../lib/tower-recommendations";
import type { TowerPlanDraft, TowerPlanRead } from "../../lib/tower-plans";
import { towerRequest, type Tower, type TowerPage } from "../../lib/towers";

type PcState = { phase: "loading" } | { phase: "none" } | { phase: "error"; message: string } | { phase: "ready"; pc: Tower };
const sinDatos: MetadataSnapshot = { status: "active", entries: new Map() };

/** Sin propuestas, el motivo es el que devuelve la API. Si no trae ninguno, se dice que no hubo datos suficientes. */
function noProposalsReason(result: { limitations: string[]; missing_fields: string[] }): string {
  if (result.missing_fields.some(field => field.startsWith("benefit:"))) return "No pudimos identificar el componente que querés cambiar. Revisá en Mi PC que el modelo esté bien escrito.";
  if (result.missing_fields.length) return "Faltan datos de tu PC para buscar propuestas. Completalos en Mi PC y volvemos a buscar.";
  return "No encontramos un cambio que mejore tu PC con estos criterios.";
}

function Prices({ item }: { item: TowerRecommendationItem }) {
  const offer = proposalOffer(item);
  return <PriceTag monto={item.cost.total_ars} moneda="ARS" condicion={offer?.condition} fecha={offer?.date} tienda={offer?.store} enlace={offer?.url} />;
}

export default function Conviene({ goalKey, budget, pcId }: { goalKey: GoalKey | null; budget: string | null; pcId: string | null }) {
  const goal = goalByKey(goalKey);
  const [pcState, setPcState] = useState<PcState>({ phase: "loading" });
  const [rec, setRec] = useState<RecommendationState>({ phase: "idle", message: "", result: null });
  const [metadata, setMetadata] = useState<{ result: unknown; snapshot: MetadataSnapshot } | null>(null);
  const [chosenKey, setChosenKey] = useState<string | null>(null), [sort, setSort] = useState<"recomendadas" | "baratas">("recomendadas");
  const [seed, setSeed] = useState<{ draft: TowerPlanDraft; key: number; item: TowerRecommendationItem } | null>(null), [saved, setSaved] = useState<TowerPlanRead | null>(null), nextSeed = useRef(0);
  const draft = useMemo(() => goal && budget ? convieneDraft(goal.objective, budget) : null, [goal, budget]);

  // Una sola consulta por pedido: se pide la PC guardada y después las propuestas del servidor.
  useEffect(() => {
    if (!draft) return;
    let live = true;
    const recommendations = createTowerRecommendations({ onState: state => { if (live) setRec(state); } });
    (async () => {
      setPcState({ phase: "loading" }); setRec({ phase: "working", message: "", result: null }); setChosenKey(null); setSeed(null); setSaved(null);
      try {
        const page = await (await towerRequest("?page=1&page_size=50")).json() as TowerPage;
        if (!live) return;
        const pc = page.items.find(item => item.id === pcId) ?? page.items[0];
        if (!pc) { setPcState({ phase: "none" }); setRec({ phase: "idle", message: "", result: null }); return; }
        setPcState({ phase: "ready", pc });
        await recommendations.run(pc, draft);
      } catch (error) {
        if (live) { setPcState({ phase: "error", message: error instanceof Error ? error.message : "No pudimos cargar tu PC." }); setRec({ phase: "idle", message: "", result: null }); }
      }
    })();
    return () => { live = false; recommendations.dispose(); };
  }, [draft, pcId]);

  const pc = pcState.phase === "ready" ? pcState.pc : null, result = rec.result;
  // Los nombres de las piezas salen del catálogo; sin ellos se dice «Por confirmar».
  useEffect(() => {
    if (!result) return;
    const loader = createPreviewMetadataLoader();
    const unsubscribe = loader.subscribe(snapshot => setMetadata({ result, snapshot }));
    loader.load(metadataQueriesFor(result.items, pc));
    return () => { unsubscribe(); loader.dispose(); };
  }, [result, pc]);
  const names = metadata?.result === result && metadata ? metadata.snapshot : sinDatos;
  // La IA local elige entre lo ya verificado, después de mostrar la página. Sin ella, queda el orden del servidor.
  const [advised, setAdvised] = useState<{ result: unknown; answer: RecommendationAdvice } | null>(null);
  const advice = advised?.result === result ? advised.answer : null;
  useEffect(() => {
    if (!result || !pc || !draft) return;
    const controller = new AbortController();
    void recommendationAdvice(pc, draft, controller.signal).then(answer => {
      if (controller.signal.aborted || !answer?.key) return;
      setAdvised({ result, answer });
      setChosenKey(previous => previous ?? answer.key);
    });
    return () => controller.abort();
  }, [result, pc, draft]);

  const groups = useMemo(() => groupProposals(result?.items ?? []), [result]);
  const closest = useMemo(() => closestOverBudget(result?.items ?? []), [result]);
  const { main, others } = chooseMain([...(groups.principal ? [groups.principal] : []), ...groups.alternativas], chosenKey);
  const shownAlts = sort === "baratas" ? cheapestFirst(others) : others;
  const cheapest = others.length > 1 ? cheapestFirst(others).find(item => item.cost.total_ars !== null)?.key ?? null : null;

  useEffect(() => { if (seed) { const box = document.getElementById("borrador"); box?.scrollIntoView({ block: "start" }); box?.focus({ preventScroll: true }); } }, [seed]);
  function addToPlan(item: TowerRecommendationItem) { if (!pc || !draft) return; setSaved(null); setSeed({ key: ++nextSeed.current, item, draft: planDraftFor(pc, item, draft) }); }

  if (!goal || !budget || !draft) {
    return <div className="cv"><section className="cv-intro" style={{ paddingTop: "var(--space-7)" }}><h1>Contanos qué querés mejorar</h1><p>Para buscarte el cambio que más te conviene necesitamos saber qué querés que tu PC haga mejor y cuánto querés gastar.</p><div className="cv-row" style={{ marginTop: "var(--space-5)" }}><Link className="cv-btn cv-btn-principal" href="/">Elegir qué mejorar</Link></div></section></div>;
  }

  const working = pcState.phase === "loading" || rec.phase === "working", failed = pcState.phase === "error" || rec.phase === "error";
  const note = workloadNote(draft);
  const category = main ? proposalCategory(main) : null, swap = main ? swapSides(main, pc, names) : null;
  const firstCandidate = main?.actions[0]?.candidates[0]?.component_id ?? null;
  const mini = main ? pcAfterChange(main, names) : [], percent = main && result ? budgetBarPercent(main.cost.total_ars, result.budget_ars) : null;
  const unknown = main ? unknownChecks(main) : [];

  return <div className="cv">
    <div className="cv-asked" aria-label="Lo que pediste">
      <span className="cv-asked-pill"><span>Para</span>{goal.text}</span>
      <span className="cv-asked-pill"><span>Hasta</span>{formatearMonto(budget)}</span>
      {pc && <span className="cv-asked-pill"><span>En</span>{pc.name}</span>}
      <Link className="cv-btn cv-btn-quieto cv-btn-chico" href="/">Cambiar</Link>
    </div>

    <section className="cv-intro">
      <h1>{main ? "Esto es lo que más te conviene" : working ? "Estamos buscando lo que más te conviene" : "Por ahora no tenemos un cambio para sugerirte"}</h1>
      <p>{introLine(goal.text)}</p>
      {note && <div className="cv-aviso"><Notice tono="info" titulo="Cómo medimos la mejora">{note}</Notice></div>}
    </section>

    {working && <div className="cv-status" role="status" aria-busy="true"><strong>Buscando propuestas para tu PC…</strong><span>Revisamos cada cambio con los datos de tu PC guardada. Puede tardar unos segundos.</span></div>}

    {!working && failed && <div className="cv-status" role="alert"><Notice tono="no" titulo="No pudimos buscar propuestas">{pcState.phase === "error" ? pcState.message : rec.message || "Probá de nuevo en un momento. No se guardó nada."}</Notice><div className="cv-row"><Link className="cv-btn cv-btn-secundario" href="/pcs">Ir a Mi PC</Link><Link className="cv-btn cv-btn-quieto" href="/">Volver al inicio</Link></div></div>}

    {!working && !failed && pcState.phase === "none" && <div className="cv-status"><Notice tono="info" titulo="Todavía no cargaste tu PC">Para decirte qué te conviene necesitamos saber qué componentes tiene. Cargala y volvé: la comparamos con lo que pediste.</Notice><div className="cv-row"><Link className="cv-btn cv-btn-principal" href="/pcs">Cargar mi PC</Link></div></div>}

    {!working && !failed && pc && !main && result && result.items.length === 0 && <div className="cv-status"><Notice tono="info" titulo="No hubo propuestas para tu PC">{noProposalsReason(result)}</Notice><div className="cv-row"><Link className="cv-btn cv-btn-principal" href="/">Cambiar lo que pediste</Link><Link className="cv-btn cv-btn-secundario" href="/pcs">Completar mi PC</Link></div></div>}
    {!working && !failed && pc && !main && !closest && result && result.items.length > 0 && <div className="cv-status"><Notice tono="no" titulo="Todas las propuestas se descartaron">Ninguna encaja con tu PC tal como está. Abajo te contamos el motivo de cada una.</Notice><div className="cv-row"><Link className="cv-btn cv-btn-principal" href="/">Cambiar lo que pediste</Link><Link className="cv-btn cv-btn-secundario" href="/pcs">Completar mi PC</Link></div></div>}

    {main && swap && <section className="cv-main" aria-label="Sugerencia principal">
      <article className="cv-upgrade">
        <div className="cv-upgrade-head">
          <div><div className="cv-kind">{main === groups.principal || main.key === advice?.key ? "Lo que más te conviene" : "La que elegiste"}</div><h2 className="cv-upgrade-title">{proposalTitle(main.actions)}</h2></div>
          <Verdict estado={main.evaluation.verdict} />
        </div>
        <div className="cv-swap">
          <div className="cv-swap-side"><div className="cv-swap-label">Hoy tenés</div><div className="cv-part-name">{swap.actual}</div></div>
          <ArrowRight className="cv-icon" aria-label="se cambia por" />
          <div className="cv-swap-side is-new"><div className="cv-swap-label">Pasás a</div><div className="cv-part-name">{swap.nueva}</div></div>
        </div>
        <ul className="cv-why">{main.key === advice?.key && advice.reason && <li><Check className="cv-icon" aria-hidden="true" /><span>{advice.reason} <span className="cv-tech">Lo eligió la IA local entre opciones que ya encajan.</span></span></li>}{whyReasons(main).map(text => <li key={text}><Check className="cv-icon" aria-hidden="true" /><span>{text}</span></li>)}</ul>
        {needsCoolerCheck(main.actions) && <p className="cv-tech">{coolerNote}</p>}
        {unknown.length > 0 && <Notice tono="revisar" titulo="Falta un dato para estar seguros">{`No pudimos confirmar: ${joinLabels(unknown)}. Completá esos datos en Mi PC y lo volvemos a revisar.`}</Notice>}
        {checkRows(main).length > 0 && <details className="cv-more">
          <summary>{main.evaluation.verdict === "compatible" ? "Qué revisamos para decir que encaja" : "Qué revisamos"}</summary>
          <ul className="cv-checks">{checkRows(main).map(row => <li key={row.id}><span>{row.label}</span>{row.estado === "no_evaluado" ? <span className="cv-no-eval">No evaluado</span> : <Verdict estado={row.estado} />}</li>)}</ul>
          <p className="cv-tech">{towerEssentialNote(main.evaluation) ?? "Revisamos lo que aplica a este cambio con los datos de tu PC guardada."}</p>
        </details>}
        <div className="cv-foot-card">
          <div className="cv-price"><Prices item={main} /></div>
          <div className="cv-row">
            {firstCandidate && <Link className="cv-btn cv-btn-secundario cv-btn-chico" href={`/catalog/${encodeURIComponent(firstCandidate)}`}>Ver el componente</Link>}
            <button type="button" className="cv-btn cv-btn-principal" onClick={() => addToPlan(main)}>Sumar a mi plan</button>
          </div>
        </div>
      </article>

      <aside className="cv-side">
        <div className="cv-side-card">
          <h2>Tu presupuesto</h2>
          <div className="cv-bar-box">
            {percent !== null && <div className="cv-bar" role="img" aria-label={`Este cambio usa ${moneyText(main.cost.total_ars) ?? "un importe sin confirmar"} de ${moneyText(result?.budget_ars) ?? "tu presupuesto"}`}><i style={{ width: `${percent}%` }} />{budgetState(main) === "dentro" && percent < 100 && <b style={{ width: `${100 - percent}%` }} />}</div>}
            <div className="cv-bar-legend"><span>Usás <strong>{moneyText(main.cost.total_ars) ?? "Sin precio"}</strong></span><span>Tu tope <strong>{moneyText(result?.budget_ars) ?? formatearMonto(budget)}</strong></span></div>
          </div>
        </div>
        {mini.length > 0 && <div className="cv-side-card">
          <h2>Tu PC con este cambio</h2>
          <div className="cv-mini">{mini.slice(0, 4).map(row => <div key={row.category} className={row.isNew ? "cv-slot is-new" : "cv-slot"}>
            <span className="cv-slot-icon"><IconoDeCategoria categoria={row.label} tamano="size-[18px]" /></span>
            <span style={{ minWidth: 0 }}><span className="cv-slot-kind">{row.label}</span><div className="cv-slot-name">{row.name}</div></span>
            {row.isNew && <span className="cv-new-tag">Nueva</span>}
          </div>)}</div>
          <Link className="cv-btn cv-btn-quieto cv-btn-chico" href="/pcs">{`Ver los ${main.evaluation.evaluated_configuration.lines.length} componentes`}</Link>
        </div>}
        <Notice tono="info" titulo="Esto es una simulación">Tu PC guardada no cambia hasta que vos lo decidas.</Notice>
      </aside>
    </section>}

    {main && others.length > 0 && <section className="cv-sec" aria-labelledby="cv-alts">
      <div className="cv-sec-head">
        <div><h2 id="cv-alts">Otras opciones</h2><p>Por si querés gastar menos o estirarte un poco.</p></div>
        {others.length > 1 && <div className="cv-sort" role="group" aria-label="Ordenar">
          <button type="button" aria-pressed={sort === "recomendadas"} onClick={() => setSort("recomendadas")}>Recomendadas</button>
          <button type="button" aria-pressed={sort === "baratas"} onClick={() => setSort("baratas")}>Más baratas primero</button>
        </div>}
      </div>
      <div className="cv-alts">{shownAlts.map(item => {
        const nueva = swapSides(item, pc, names).nueva, faltan = unknownChecks(item);
        return <article key={item.key} className="cv-alt">
          <div className="cv-alt-top"><div><div className="cv-alt-label">{altLabel(proposalCategory(item), cheapest, item.key)}</div><h3>{nueva}</h3></div><Verdict estado={item.evaluation.verdict} /></div>
          {item.evaluation.verdict === "compatible"
            ? <p>{benefitLine(item)}{budgetState(item) === "fuera" && <> <span className="cv-over">Se pasa de tu presupuesto.</span></>}</p>
            : <Notice tono="revisar" titulo="Falta un dato para estar seguros">{faltan.length ? `No pudimos confirmar: ${joinLabels(faltan)}.` : "Todavía no pudimos comprobar si encaja con tu PC."}</Notice>}
          <div className="cv-price"><Prices item={item} /></div>
          {item.evaluation.verdict === "compatible"
            ? <button type="button" className="cv-btn cv-btn-secundario cv-btn-chico" onClick={() => { setChosenKey(item.key); document.getElementById("contenido")?.scrollIntoView(); }}>Elegir esta</button>
            : <Link className="cv-btn cv-btn-secundario cv-btn-chico" href="/pcs">Completar el dato</Link>}
        </article>;
      })}</div>
    </section>}

    {!working && !failed && !main && closest && <div className="cv-status"><Notice tono="info" titulo="Con este presupuesto no llega">{`La mejora real más cercana es ${swapSides(closest, pc, names).nueva}, por ${formatearMonto((closest.cost.total_ars ?? "").split(".")[0])}. ${benefitLine(closest)}`}</Notice><div className="cv-row"><Link className="cv-btn cv-btn-principal" href="/">Cambiar lo que pediste</Link></div></div>}

    {groups.descartadas.length > 0 && <details className="cv-ruled" open={!main}>
      <summary><X className="cv-icon" aria-hidden="true" style={{ width: 20, height: 20 }} />{groups.descartadas.length === 1 ? "Descartamos 1 opción" : `Descartamos ${groups.descartadas.length} opciones`}</summary>
      <ul>{groups.descartadas.slice(0, maxDiscardedShown).map(item => <li key={item.key}><Verdict estado={item.evaluation.verdict} /><span><strong>{swapSides(item, pc, names).nueva}</strong> — {discardReason(item)}</span></li>)}</ul>
      {groups.descartadas.length > maxDiscardedShown && <p className="cv-tech">{`Y ${groups.descartadas.length - maxDiscardedShown} más que tampoco sirven.`}</p>}
    </details>}

    {main && <section className="cv-sec" aria-label="Qué sigue"><div className="cv-next">
      <div className="cv-next-card cv-plan">
        <h2>Así quedaría tu plan</h2>
        <p>{planLead(category)}</p>
        <ol className="cv-steps"><li className="cv-step is-now">
          <span className="cv-step-dot">1</span>
          <div className="cv-step-body"><div className="cv-step-title">{category ? `${categoryNames[category]} nueva` : "Cambio propuesto"}</div><div className="cv-step-meta">{moneyText(main.cost.total_ars) ?? "Sin precio"} · {main.evaluation.verdict === "compatible" ? "encaja con tu PC actual" : "falta un dato para confirmar que encaja"}</div></div>
        </li></ol>
        <button type="button" className="cv-btn" onClick={() => addToPlan(main)}>Sumar a mi plan</button>
      </div>
      <div className="cv-next-card cv-ask">
        <h2>¿Te quedó alguna duda?</h2>
        <p>Preguntale al asistente. Usa los datos de tu PC y te contesta en criollo.</p>
        <Link className="cv-btn cv-btn-principal" href="/chat">Hablar con el asistente</Link>
      </div>
    </div></section>}

    {seed && !saved && <section id="borrador" tabIndex={-1} className="cv-draft" aria-labelledby="cv-borrador">
      <h2 id="cv-borrador" className="sr-only">Sumar a tu plan</h2>
      {pc && <SaveToPlan key={seed.key} seed={seed.draft} rows={[{ name: seed.item.actions.map(action => swapSides({ actions: [action], versions: seed.item.versions }, pc, names).nueva).join(" + "), price: moneyText(seed.item.cost.total_ars), verdict: seed.item.evaluation.verdict }]} onSaved={setSaved} onCancel={() => setSeed(null)} />}
    </section>}
    {saved && <section id="borrador" tabIndex={-1} className="cv-draft" aria-label="Plan guardado">
      <Notice tono="encaja" titulo="Guardamos tu plan">Podés verlo etapa por etapa. Tu PC guardada sigue igual.</Notice>
      <div className="cv-row"><Link className="cv-btn cv-btn-principal" href={`/tower-plans/${saved.id}`}>Abrir mi plan</Link></div>
    </section>}

    <div className="cv-foot">
      <span>Los precios son de tiendas argentinas y muestran la fecha en que los vimos. Verificá stock antes de comprar.</span>
      <span><Link href="/">Volver al inicio</Link></span>
    </div>
  </div>;
}
