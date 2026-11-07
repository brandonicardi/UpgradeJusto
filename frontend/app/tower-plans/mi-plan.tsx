"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Notice } from "../../components/uj";
import TowerPlanEditor from "../../components/tower-plan-editor";
import TowerPlanDeactivation from "../../components/tower-plan-deactivation";
import { createPreviewMetadataLoader, type MetadataSnapshot } from "../../lib/preview-metadata";
import { comparePlans, monthsToFinish, objectiveWords, parseMonthly, planMetadataQueries, priceChangeText, type PriceChange } from "../../lib/mi-plan-view";
import { pcMatchesPlan, updateMyPc } from "../../lib/mi-plan-pc";
import { createTowerPlanWriter, planConflictMessage, planDraftFromRead, planStageStates, positiveRevision, setStageProgress, towerPlanRequest, type PlanWriteState, type TowerPlanDraft, type TowerPlanPage, type TowerPlanRead } from "../../lib/tower-plans";
import { towerRequest, type Tower } from "../../lib/towers";
import { remoteCatalog, type TowerCatalogPage } from "../../lib/tower-catalog";
import { EmptyView, EndCard, MoneyStrip, NextPurchase, PcOffer, PurchaseList, SavingsCard, ShareCard, type PcOfferState } from "./mi-plan-sections";
import "./mi-plan.css";

const sinDatos: MetadataSnapshot = { status: "active", entries: new Map() };
const monthlyKey = "uj:mi-plan:aporte-mensual";
// «Actualizar precios» guarda una versión nueva del plan; lo que cambió se cuenta después de guardar.
type Refresh = { phase: "confirmar" } | { phase: "guardado"; change: PriceChange; pcChanged: boolean } | { phase: "conflicto" } | { phase: "pc-cambio" } | { phase: "incierto" } | { phase: "error" };

export default function MiPlan({ initialId }: { initialId?: string }) {
  const [list, setList] = useState<TowerPlanPage | null>(null), [plan, setPlan] = useState<TowerPlanRead | null>(null);
  const [progress, setProgress] = useState<{ plan: TowerPlanRead; value: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [metadata, setMetadata] = useState<{ plan: TowerPlanRead; snapshot: MetadataSnapshot } | null>(null);
  const [edit, setEdit] = useState<{ draft: TowerPlanDraft; pc: Tower; key: number } | null>(null), [deleting, setDeleting] = useState(false), nextEdit = useRef(0), lock = useRef(false);
  const [reload, setReload] = useState(0), [monthly, setMonthly] = useState(""), [refresh, setRefresh] = useState<Refresh | null>(null), [offer, setOffer] = useState<PcOfferState | null>(null), [offerClosed, setOfferClosed] = useState<string | null>(null), [showAll, setShowAll] = useState(false);
  const planRef = useRef<TowerPlanRead | null>(null), writer = useRef<ReturnType<typeof createTowerPlanWriter> | null>(null);
  useEffect(() => { planRef.current = plan; }, [plan]);
  useEffect(() => () => { writer.current?.dispose(); }, []);
  useEffect(() => { const timer = setTimeout(() => { try { const saved = window.localStorage.getItem(monthlyKey); if (saved) setMonthly(saved); } catch { /* sin almacenamiento: se escribe de nuevo */ } }, 0); return () => clearTimeout(timer); }, []);

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
        setProgress(null); setEdit(null); setDeleting(false); setOffer(null);
      } catch { if (!controller.signal.aborted) setError("No pudimos cargar tus planes. Probá de nuevo en un momento."); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
  }, [initialId, reload]);

  // Los nombres de los componentes salen del catálogo; sin ellos se dice «Por confirmar».
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
  const finished = states.length > 0 && states.every(state => state === "hecha");

  async function offerPcUpdate(target: TowerPlanRead, index: number) {
    if (!target.pc_id) return;
    try {
      const pc = await (await towerRequest(`/${target.pc_id}`)).json() as Tower;
      setOffer({ phase: pcMatchesPlan(target, pc, index) ? "listo" : "cambio", index });
    } catch { setOffer(null); }
  }
  // Plan terminado: se ofrece actualizar Mi PC una vez, salvo que la persona ya lo haya cerrado.
  useEffect(() => { if (!plan || !finished || offer || offerClosed === plan.id) return; const timer = setTimeout(() => void offerPcUpdate(plan, plan.snapshot.stages.length - 1), 0); return () => clearTimeout(timer); }, [plan, finished, offer, offerClosed]);

  async function mark(stageKey: string, done: boolean, index: number) {
    if (!plan || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await setStageProgress(plan.id, stageKey, done);
      // Lo gastado y lo que falta los calcula el servidor: se vuelve a leer el plan.
      const fresh = await (await towerPlanRequest(`/${plan.id}`)).json() as TowerPlanRead;
      setPlan(fresh); setProgress(null);
      if (done) await offerPcUpdate(fresh, index); else setOffer(null);
    } catch { setError("No pudimos confirmar el cambio. Revisá el plan antes de volver a intentar; no se repitió el envío."); }
    finally { lock.current = false; setBusy(false); }
  }

  async function confirmPcUpdate() {
    if (!plan?.pc_id || !offer || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const pc = await (await towerRequest(`/${plan.pc_id}`)).json() as Tower;
      if (!pcMatchesPlan(plan, pc, offer.index)) { setOffer({ phase: "cambio", index: offer.index }); return; }
      await updateMyPc(pc, plan, offer.index);
      setOffer({ phase: "hecho", index: offer.index });
    } catch { setOffer({ phase: "error", index: offer.index }); }
    finally { lock.current = false; setBusy(false); }
  }
  function closeOffer() { if (plan) setOfferClosed(plan.id); setOffer(null); }

  async function choose(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { const next = await (await towerPlanRequest(`/${id}`)).json() as TowerPlanRead; setPlan(next); setProgress(null); setEdit(null); setDeleting(false); setOffer(null); setRefresh(null); }
    catch { setError("No pudimos abrir ese plan. Probá de nuevo en un momento."); }
    finally { lock.current = false; setBusy(false); }
  }

  async function prepareEdit(extraPurchase = false) {
    if (!plan?.pc_id || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const pc = await (await towerRequest(`/${plan.pc_id}`)).json() as Tower;
      const catalog = await remoteCatalog<TowerCatalogPage>("?page=1&page_size=1");
      const draft = planDraftFromRead(plan, pc, catalog.dataset_version);
      if (extraPurchase) draft.stages.push({ name: `Compra ${draft.stages.length + 1}`, budget_ars: draft.budget_ars, actions: [], materials: [] });
      setEdit({ draft, pc, key: ++nextEdit.current });
      requestAnimationFrame(() => document.getElementById("borrador-plan")?.scrollIntoView({ block: "start" }));
    } catch { setError("No pudimos preparar el cambio del plan. Probá de nuevo en un momento."); }
    finally { lock.current = false; setBusy(false); }
  }

  // Actualizar precios recalcula y guarda una versión nueva del plan (tu PC no cambia). Sin vista previa en el servidor,
  // la persona confirma antes y después ve cuánto cambió respecto del plan que tenía abierto.
  async function updatePrices() {
    const current = planRef.current;
    if (!current?.pc_id || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const pc = await (await towerRequest(`/${current.pc_id}`)).json() as Tower;
      // Recalcular repetiría sobre la PC nueva compras que ya tiene: duplicaría o fallaría.
      if (pc.revision !== current.snapshot.pc_revision) { setRefresh({ phase: "pc-cambio" }); return; }
      const catalog = await remoteCatalog<TowerCatalogPage>("?page=1&page_size=1");
      const draft = planDraftFromRead(current, pc, catalog.dataset_version, true);
      writer.current?.dispose();
      writer.current = createTowerPlanWriter({
        onState: (state: PlanWriteState) => {
          if (state.phase === "uncertain") setRefresh({ phase: "incierto" });
          else if (state.phase === "error") { if (state.message === planConflictMessage) { setRefresh({ phase: "conflicto" }); setReload(value => value + 1); } else setRefresh({ phase: "error" }); }
        },
        onSaved: saved => { setRefresh({ phase: "guardado", change: comparePlans(current.snapshot, saved.snapshot), pcChanged: saved.snapshot.pc_revision !== current.snapshot.pc_revision }); setPlan(saved); setProgress(null); setOffer(null); },
      });
      await writer.current.save(draft, current.id, current.revision);
    } catch { setRefresh({ phase: "error" }); }
    finally { lock.current = false; setBusy(false); }
  }

  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || !positiveRevision(plan.revision) || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await towerPlanRequest(`/${plan.id}`, "DELETE", JSON.stringify({ expected_plan_revision: plan.revision })); setDeleting(false); setReload(value => value + 1); }
    catch { setError("No pudimos borrar el plan. Revisá tus planes antes de volver a intentar; no se repitió el envío."); }
    finally { lock.current = false; setBusy(false); }
  }

  function changeMonthly(value: string) { setMonthly(value); try { if (value) window.localStorage.setItem(monthlyKey, value); else window.localStorage.removeItem(monthlyKey); } catch { /* solo se pierde el recuerdo */ } }

  if (!plan) {
    if (busy) return <div className="mp"><section className="mp-head"><h1>Tu plan, paso a paso</h1></section><div className="mp-status" role="status" aria-busy="true"><strong>Buscando tus planes…</strong></div></div>;
    if (error) return <div className="mp"><section className="mp-head"><h1>Tu plan, paso a paso</h1></section><div className="mp-status" role="alert"><Notice tono="no" titulo="No pudimos cargar tus planes">{error}</Notice><div className="mp-row"><Link className="mp-btn mp-btn-secundario" href="/account">Ingresar a mi cuenta</Link></div></div></div>;
    return <EmptyView />;
  }

  const snapshot = plan.snapshot, current = states.findIndex(state => state === "actual"), canChange = Boolean(plan.pc_id);
  const months = monthsToFinish(plan.remaining_ars, parseMonthly(monthly)), hasRemaining = plan.remaining_ars !== null && plan.remaining_ars !== undefined;
  const showBody = !finished || showAll;

  return <div className="mp">
    <section className="mp-head">
      {finished ? <><span className="mp-eyebrow">{snapshot.base_configuration.name} · {objectiveWords[snapshot.objective]}</span><h1>¡Listo, terminaste tu plan!</h1><p>Compraste todo lo que tenías planeado.</p></>
        : <><span className="mp-eyebrow">{snapshot.base_configuration.name} · {objectiveWords[snapshot.objective]}</span><h1>Tu plan, paso a paso</h1><p>Comprá de a un componente, cuando puedas. Ya revisamos que cada compra encaje con las anteriores.</p></>}
      {!initialId && list && list.items.length > 1 && <select aria-label="Elegir otro plan" value={plan.id} onChange={event => void choose(event.target.value)}>{list.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
    </section>
    {error && <div className="mp-status" role="alert"><Notice tono="no" titulo="Algo no salió como esperábamos">{error}</Notice></div>}

    {finished ? (offer && <PcOffer offer={offer} plan={plan} names={names} busy={busy} finished onConfirm={() => void confirmPcUpdate()} onDecline={closeOffer} />)
      : current >= 0 && <NextPurchase plan={plan} index={current} names={names} busy={busy} canChange={canChange} onBuy={key => void mark(key, true, current)} onOther={() => void prepareEdit()} />}
    {!finished && offer && <PcOffer offer={offer} plan={plan} names={names} busy={busy} finished={false} onConfirm={() => void confirmPcUpdate()} onDecline={closeOffer} />}

    {refresh?.phase === "confirmar" && <div className="mp-status"><Notice tono="info" titulo="¿Buscamos los precios de hoy?">Guardamos una versión nueva de tu plan y te contamos si subió o bajó y si algo dejó de encajar. Tu PC guardada no cambia.</Notice><div className="mp-row"><button type="button" className="mp-btn mp-btn-principal" disabled={busy} onClick={() => void updatePrices()}>Buscar precios nuevos</button><button type="button" className="mp-btn mp-btn-quieto mp-btn-chico" disabled={busy} onClick={() => setRefresh(null)}>Ahora no</button></div></div>}
    {refresh?.phase === "guardado" && <div className="mp-status"><Notice tono={refresh.change.stopsFitting.length ? "revisar" : "encaja"} titulo="Actualizamos los precios de tu plan">{priceChangeText(refresh.change)}{refresh.change.stopsFitting.length > 0 && ` Dejó de encajar: ${refresh.change.stopsFitting.join(", ")}.`}{refresh.pcChanged && " Lo calculamos con tu PC de hoy."}</Notice></div>}
    {refresh?.phase === "pc-cambio" && <div className="mp-status"><Notice tono="info" titulo="Tu PC ya no es la de este plan">Cambió desde que armaste el plan, así que no recalculamos nada. Para ver precios de hoy, mirá de nuevo lo que te conviene.</Notice><div className="mp-row"><Link className="mp-btn mp-btn-secundario mp-btn-chico" href="/conviene">Ver lo que te conviene</Link></div></div>}
    {refresh?.phase === "conflicto" && <div className="mp-status"><Notice tono="info" titulo="Algo cambió mientras mirabas">Tu PC, los precios del catálogo o el plan son otros. No se guardó nada y volvimos a cargar todo. Si querés, actualizá los precios de nuevo.</Notice></div>}
    {refresh?.phase === "incierto" && <div className="mp-status" role="alert"><Notice tono="revisar" titulo="No sabemos si se guardó">Puede que el plan ya tenga los precios nuevos. Recargá la página para verlo antes de volver a intentar.</Notice><div className="mp-row"><button type="button" className="mp-btn mp-btn-secundario mp-btn-chico" onClick={() => void writer.current?.retry()}>Volver a intentar</button></div></div>}
    {refresh?.phase === "error" && <div className="mp-status" role="alert"><Notice tono="no" titulo="No pudimos actualizar los precios">Tu plan sigue como estaba. Probá de nuevo en un momento.</Notice></div>}

    {finished && <div className="mp-cta"><button type="button" className="mp-btn mp-btn-secundario mp-btn-chico" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? "Ocultar mis compras" : "Ver todas mis compras"}</button></div>}
    {showBody && <>
      <MoneyStrip plan={plan} states={states} busy={busy} canRefresh={canChange} onRefresh={() => setRefresh({ phase: "confirmar" })} />
      <div className="mp-body">
        <PurchaseList plan={plan} states={states} names={names} marks={marks} busy={busy} canChange={canChange} onUndo={key => void mark(key, false, 0)} onAdd={() => void prepareEdit(true)} />
        <aside className="mp-side">
          <SavingsCard value={monthly} onChange={changeMonthly} months={months} hasRemaining={hasRemaining} />
          <EndCard plan={plan} names={names} />
          <ShareCard planId={plan.id} />
        </aside>
      </div>
    </>}

    {edit && <section id="borrador-plan" className="mp-draft" aria-labelledby="mp-borrador"><h2 id="mp-borrador">Cambiar tu plan</h2><p className="mp-draft-sub">Sumá, sacá o reordená compras. Nada cambia hasta que guardes, y tu PC guardada no se toca.</p><TowerPlanEditor key={edit.key} seed={edit.draft} pc={edit.pc} planId={plan.id} revision={plan.revision} onSaved={saved => { setPlan(saved); setEdit(null); setProgress(null); setOffer(null); }} /></section>}

    {deleting && <div className="mp-danger"><TowerPlanDeactivation busy={busy} onCancel={() => setDeleting(false)} onConfirm={event => void remove(event)} /></div>}

    <div className="mp-foot">
      <span>{finished ? "Nada cambia en tu PC guardada hasta que lo confirmes." : "Precios de tiendas argentinas, con la fecha en que los vimos. Verificá stock antes de comprar."}</span>
      <span className="mp-row">{finished && <Link href="/">Ver qué más te conviene</Link>}{!deleting && <button type="button" className="mp-link" disabled={busy} onClick={() => setDeleting(true)}>Borrar este plan</button>}</span>
    </div>
  </div>;
}
