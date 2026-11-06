"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { Notice, PriceTag, Verdict } from "../../components/uj";
import { IconoDeCategoria } from "../../components/uj/part-card";
import TowerPlanEditor from "../../components/tower-plan-editor";
import TowerPlanDeactivation from "../../components/tower-plan-deactivation";
import { createPreviewMetadataLoader, type MetadataSnapshot } from "../../lib/preview-metadata";
import { budgetBarPercent, checkRows, proposalOffer } from "../../lib/conviene-presentation";
import { categoryNames, joinLabels, moneyText, swapSides, unknownChecks } from "../../lib/conviene-view";
import { boughtOn, doneCount, finishedParts, objectiveWords, planMetadataQueries, priceRangeText, spentAmount, spentText, stageKicker } from "../../lib/mi-plan-view";
import { planDraftFromRead, planStageStates, positiveRevision, setStageProgress, towerPlanRequest, type TowerPlanDraft, type TowerPlanPage, type TowerPlanRead } from "../../lib/tower-plans";
import { physicalSpaceNote, towerEssentialNote, towerRuleLabels } from "../../lib/tower-compatibility";
import { towerRequest, type Tower } from "../../lib/towers";
import { remoteCatalog, type TowerCatalogPage } from "../../lib/tower-catalog";
import "./mi-plan.css";

const sinDatos: MetadataSnapshot = { status: "active", entries: new Map() };

export default function MiPlan({ initialId }: { initialId?: string }) {
  const [list, setList] = useState<TowerPlanPage | null>(null), [plan, setPlan] = useState<TowerPlanRead | null>(null);
  const [progress, setProgress] = useState<{ plan: TowerPlanRead; value: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [metadata, setMetadata] = useState<{ plan: TowerPlanRead; snapshot: MetadataSnapshot } | null>(null);
  const [edit, setEdit] = useState<{ draft: TowerPlanDraft; pc: Tower; key: number } | null>(null), [deleting, setDeleting] = useState(false), nextEdit = useRef(0), lock = useRef(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setBusy(true); setError("");
      try {
        const page = await (await towerPlanRequest("?page=1&page_size=20", "GET", undefined, controller.signal)).json() as TowerPlanPage;
        if (controller.signal.aborted) return;
        setList(page);
        const id = initialId ?? page.items[0]?.id;
        const detail = id ? await (await towerPlanRequest(`/${id}`, "GET", undefined, controller.signal)).json() as TowerPlanRead : null;
        if (controller.signal.aborted) return;
        setPlan(detail);
        setProgress(null); setEdit(null); setDeleting(false);
      } catch { if (!controller.signal.aborted) setError("No pudimos cargar tus planes. Probá de nuevo en un momento."); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
  }, [initialId, reload]);

  // Los nombres de las piezas salen del catálogo; sin ellos se dice «Por confirmar».
  useEffect(() => {
    if (!plan) return;
    const loader = createPreviewMetadataLoader();
    const off = loader.subscribe(snapshot => setMetadata({ plan, snapshot }));
    loader.load(planMetadataQueries(plan));
    return () => { off(); loader.dispose(); };
  }, [plan]);
  const names = metadata?.plan === plan && metadata ? metadata.snapshot : sinDatos;

  const marks = plan && progress?.plan === plan ? progress.value : plan?.progress;
  const states = useMemo(() => plan ? planStageStates(plan, marks) : [], [plan, marks]);

  async function mark(stageKey: string, done: boolean) {
    if (!plan || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { setProgress({ plan, value: await setStageProgress(plan.id, stageKey, done) }); }
    catch { setError("No pudimos confirmar el cambio. Revisá el plan antes de volver a intentar; no se repitió el envío."); }
    finally { lock.current = false; setBusy(false); }
  }

  async function choose(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { const next = await (await towerPlanRequest(`/${id}`)).json() as TowerPlanRead; setPlan(next); setProgress(null); setEdit(null); setDeleting(false); }
    catch { setError("No pudimos abrir ese plan. Probá de nuevo en un momento."); }
    finally { lock.current = false; setBusy(false); }
  }

  async function prepareEdit(extraStage = false) {
    if (!plan?.pc_id || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const pc = await (await towerRequest(`/${plan.pc_id}`)).json() as Tower;
      const catalog = await remoteCatalog<TowerCatalogPage>("?page=1&page_size=1");
      const draft = planDraftFromRead(plan, pc, catalog.dataset_version);
      if (extraStage) draft.stages.push({ name: `Etapa ${draft.stages.length + 1}`, budget_ars: draft.budget_ars, actions: [], materials: [] });
      setEdit({ draft, pc, key: ++nextEdit.current });
      requestAnimationFrame(() => document.getElementById("borrador-plan")?.scrollIntoView({ block: "start" }));
    } catch { setError("No pudimos preparar el cambio del plan. Probá de nuevo en un momento."); }
    finally { lock.current = false; setBusy(false); }
  }

  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || !positiveRevision(plan.revision) || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await towerPlanRequest(`/${plan.id}`, "DELETE", JSON.stringify({ expected_plan_revision: plan.revision })); setDeleting(false); setReload(value => value + 1); }
    catch { setError("No pudimos dar de baja el plan. Revisá tus planes antes de volver a intentar; no se repitió el envío."); }
    finally { lock.current = false; setBusy(false); }
  }

  if (!plan) {
    return <div className="mp">
      <section className="mp-head"><h1>Tu plan, paso a paso</h1><p>Comprá de a una pieza, cuando puedas. Cada etapa la revisamos con tu PC tal como quedaría después de las anteriores.</p></section>
      {busy && <div className="mp-status" role="status" aria-busy="true"><strong>Buscando tus planes…</strong></div>}
      {!busy && error && <div className="mp-status" role="alert"><Notice tono="no" titulo="No pudimos cargar tus planes">{error}</Notice><div className="mp-row"><Link className="mp-btn mp-btn-secundario" href="/account">Ingresar a mi cuenta</Link></div></div>}
      {!busy && !error && <div className="mp-status"><Notice tono="info" titulo="Todavía no tenés ningún plan">Elegí qué querés mejorar y sumá el cambio que más te convenga: va a aparecer acá, etapa por etapa.</Notice><div className="mp-row"><Link className="mp-btn mp-btn-principal" href="/">Ver qué me conviene</Link></div></div>}
    </div>;
  }

  const snapshot = plan.snapshot, comprado = doneCount(states), spent = spentText(plan, states), total = moneyText(snapshot.cost.total_ars);
  const percent = budgetBarPercent(spentAmount(plan, states), snapshot.cost.total_ars);
  const parts = finishedParts(plan, names), range = priceRangeText(plan), pending = snapshot.stages.length - comprado;

  return <div className="mp">
    <section className="mp-head">
      <span className="mp-eyebrow">{snapshot.base_configuration.name} · {objectiveWords[snapshot.objective]}</span>
      <h1>Tu plan, paso a paso</h1>
      <p>Comprá de a una pieza, cuando puedas. Cada etapa la revisamos con tu PC tal como quedaría después de las anteriores.</p>
      {!initialId && list && list.items.length > 1 && <select aria-label="Elegir otro plan" value={plan.id} onChange={event => void choose(event.target.value)}>{list.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
    </section>
    {error && <div className="mp-status" role="alert"><Notice tono="no" titulo="Algo no salió como esperábamos">{error}</Notice></div>}

    <section className="mp-money" aria-label="Plata del plan">
      <div className="mp-m total"><span className="mp-m-label">Todo el plan</span><span className="mp-m-value">{total ?? "Sin total"}</span><small>{total ? (range ?? "Con los precios que guardamos") : "Falta el precio de alguna etapa"}</small></div>
      <div className="mp-m"><span className="mp-m-label">Ya compraste</span><span className="mp-m-value">{comprado === 0 ? "Nada todavía" : spent ?? `${comprado} ${comprado === 1 ? "etapa" : "etapas"}`}</span>{percent !== null && <div className="mp-prog" aria-hidden="true"><i style={{ width: `${percent}%` }} /></div>}<small>{comprado} de {snapshot.stages.length} {snapshot.stages.length === 1 ? "etapa" : "etapas"}</small></div>
      <div className="mp-m"><span className="mp-m-label">Te falta</span><span className="mp-m-value">{pending === 0 ? "Nada" : `${pending} ${pending === 1 ? "etapa" : "etapas"}`}</span><small>Los precios cambian: revisalos antes de comprar.</small></div>
    </section>

    <div className="mp-body">
      <section aria-label="Etapas">
        <ol className="mp-stages">{snapshot.stages.map((stage, index) => {
          const state = states[index] ?? "pendiente", key = plan.stage_keys?.[index], first = stage.actions[0], category = first?.category;
          const offer = proposalOffer(stage), faltan = unknownChecks({ evaluation: stage.evaluation } as never), swap = swapSides({ actions: stage.actions as TowerPlanDraft["stages"][number]["actions"], versions: { catalog: snapshot.versions.catalog } }, index === 0 ? snapshot.base_configuration : snapshot.stages[index - 1].evaluated_configuration, names);
          const day = boughtOn(marks, key), price = moneyText(stage.cost.total_ars), spaceNote = towerEssentialNote(stage.evaluation)?.includes(physicalSpaceNote) ? physicalSpaceNote : null;
          const sinEvaluar = stage.evaluation.rule_results.filter(rule => rule.state === "not_applicable").map(rule => towerRuleLabels[rule.rule_id] ?? "Otra comprobación");
          return <li key={key ?? stage.position} className={state === "hecha" ? "mp-stage is-done" : state === "actual" ? "mp-stage is-now" : "mp-stage"} aria-current={state === "actual" ? "step" : undefined}>
            <span className="mp-dot" aria-hidden="true">{state === "hecha" ? <Check className="mp-icon" /> : stage.position}</span>
            <article className="mp-sc">
              <div className="mp-sc-head">
                <div><div className="mp-sc-kicker">{stageKicker(stage.position, category, state)}</div><h2>{stage.name}</h2></div>
                {state === "hecha"
                  ? <span className="mp-bought"><Check className="mp-icon" aria-hidden="true" />{day ? `Comprado el ${day}` : "Comprado"}{key && <><span aria-hidden="true">·</span><button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" disabled={busy} aria-label={`Deshacer: ${stage.name}`} onClick={() => void mark(key, false)}>Deshacer</button></>}</span>
                  : <Verdict estado={stage.evaluation.verdict} />}
              </div>
              {state === "hecha"
                ? <div className="mp-acc">{swap.nueva}{price ? ` · ${price}` : ""}</div>
                : <>
                  <div className="mp-swap">
                    <div className="mp-swap-side"><div className="mp-swap-label">Sale</div><div className="mp-part-name">{swap.actual}</div></div>
                    <ArrowRight className="mp-icon" aria-label="se cambia por" />
                    <div className="mp-swap-side is-new"><div className="mp-swap-label">Entra</div><div className="mp-part-name">{swap.nueva}</div></div>
                  </div>
                  {stage.evaluation.verdict === "compatible" && <div className="mp-acc ok"><Check className="mp-icon" aria-hidden="true" /><span>{`${index === 0 ? "Encaja con tu PC actual." : "Con lo que cambia en las etapas anteriores, todo sigue encajando."}${spaceNote ? ` ${spaceNote}` : ""}`}</span></div>}
                  {stage.evaluation.verdict !== "compatible" && <Notice tono={stage.evaluation.verdict === "incompatible" ? "no" : "revisar"} titulo={stage.evaluation.verdict === "incompatible" ? "Este cambio no encaja" : "Falta un dato para estar seguros"}>{stage.evaluation.verdict === "incompatible" ? `No pasó: ${joinLabels(checkRows({ evaluation: stage.evaluation } as never).filter(row => row.estado === "incompatible").map(row => row.label)) || "alguna comprobación"}.` : faltan.length ? `No pudimos confirmar: ${joinLabels(faltan)}. Completá esos datos en Mi PC.` : "Todavía no pudimos comprobar si encaja con tu PC."}</Notice>}
                  {sinEvaluar.length > 0 && <p className="mp-acc">No evaluado: {sinEvaluar.join(", ")}. No es un dato que falte.</p>}
                  <div className="mp-sc-foot">
                    <PriceTag monto={stage.cost.total_ars} moneda="ARS" condicion={offer?.condition} fecha={offer?.date} tienda={offer?.store} enlace={offer?.url} />
                    <div className="mp-row">
                      {state === "actual" && <button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" disabled={busy || !plan.pc_id} onClick={() => void prepareEdit()}>Cambiar pieza</button>}
                      {state === "actual" && key && <button type="button" className="mp-btn mp-btn-principal" disabled={busy} aria-label={`Ya la compré: ${stage.name}`} onClick={() => void mark(key, true)}>Ya la compré</button>}
                      {state !== "actual" && stage.evaluation.verdict === "requiere_verificacion" && <Link className="mp-btn mp-btn-secundario mp-btn-chico" href="/pcs">Completar el dato</Link>}
                    </div>
                  </div>
                </>}
            </article>
          </li>;
        })}</ol>
        <button type="button" className="mp-add" disabled={busy || !plan.pc_id} onClick={() => void prepareEdit(true)}><Plus className="mp-icon" aria-hidden="true" />Agregar otra etapa</button>
      </section>

      <aside className="mp-side">
        <div className="mp-card">
          <h2>Compartí tu plan</h2>
          <p>Mandáselo a alguien para que te dé una mano o te lo regale.</p>
          <ul className="mp-rules">
            <li><Check className="mp-icon" aria-hidden="true" />Quien lo abra puede verlo, pero no cambiarlo.</li>
            <li><Check className="mp-icon" aria-hidden="true" />No mostramos tu correo ni tus otras PCs.</li>
            <li><Check className="mp-icon" aria-hidden="true" />Lo apagás y el enlace deja de funcionar al instante.</li>
          </ul>
          <Link className="mp-btn mp-btn-secundario mp-btn-chico" href={`/tower-plans/${plan.id}/shares`}>Crear o apagar enlaces</Link>
        </div>
        {parts.length > 0 && <div className="mp-card">
          <h2>Tu PC al terminar</h2>
          <div className="mp-end">{parts.map(part => {
            const unknown = part.name === "Por confirmar" || part.name === "Sin pieza de este tipo";
            return <div key={part.category} className={unknown ? "mp-slot is-unknown" : "mp-slot"}><span className="mp-slot-icon"><IconoDeCategoria categoria={categoryNames[part.category]} tamano="size-[18px]" /></span><span style={{ minWidth: 0 }}><span className="mp-slot-kind">{part.label}</span><div className="mp-slot-name">{part.name === "Por confirmar" ? "Falta un dato" : part.name}</div></span></div>;
          })}</div>
          <p>El resto de tus piezas sigue igual.</p>
        </div>}
        <Notice tono="info" titulo="Tu PC guardada no cambia sola">Marcar una etapa como comprada no modifica tu PC guardada. Si querés actualizarla, hacelo desde Mi PC.</Notice>
      </aside>
    </div>

    {edit && <section id="borrador-plan" className="mp-draft" aria-labelledby="mp-borrador"><h2 id="mp-borrador">Cambiar tu plan</h2><Notice tono="info" titulo="Todavía no se guardó nada">Revisá las etapas, sumá lo que falte y confirmá. Guardar crea una nueva versión del plan y no toca tu PC guardada.</Notice><TowerPlanEditor key={edit.key} seed={edit.draft} pc={edit.pc} planId={plan.id} revision={plan.revision} onSaved={saved => { setPlan(saved); setEdit(null); setProgress(null); }} /></section>}

    <div className="mp-danger">
      {!deleting ? <button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" disabled={busy} onClick={() => setDeleting(true)}>Dar de baja este plan</button> : <TowerPlanDeactivation busy={busy} onCancel={() => setDeleting(false)} onConfirm={event => void remove(event)} />}
    </div>

    <div className="mp-foot">
      <span>Los precios son de tiendas argentinas y muestran la fecha en que los vimos. Verificá stock antes de comprar.</span>
      <span><Link href="/">Volver a lo que te conviene</Link></span>
    </div>
  </div>;
}
