"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { categories, type CatalogPage } from "../../lib/catalog";
import { pcRequest, type PC, type PCPage } from "../../lib/pcs";
import { planInput, draftStages, planRequest, planError, type DraftStage, type Plan, type PlanPage } from "../../lib/plans";
import { type Objective } from "../../lib/recommendations";
import { EvidenceValue } from "../pcs/compatibility";
import EvaluationSummary from "../pcs/evaluation-summary";
import ProductVisual from "../../components/product-visual";
import { Price, Badge } from "../../components/ui";
import type { JsonValue } from "../../lib/compatibility";
import Replacements, { emptyReplacement } from "./replacements";
import Shares from "./shares";

const newStage = (): DraftStage => ({ name: "", replacements: [emptyReplacement()] });
const statusLabel = (status: string) => status === "ready" ? "Listo según servidor" : status === "blocked" ? "Borrador bloqueado" : status === "requires_verification" ? "Borrador: requiere verificación" : `Estado desconocido: ${status}`;
const total = (value: JsonValue): string | null => value && typeof value === "object" && !Array.isArray(value) && typeof value.total_ars === "string" ? value.total_ars : null;

export default function Plans({ catalog }: { catalog: CatalogPage | null }) {
  const [list, setList] = useState<PlanPage | null>(null), [pcs, setPCs] = useState<PCPage | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null), [source, setSource] = useState<PC | null>(null);
  const [editing, setEditing] = useState(false), [deleting, setDeleting] = useState(false), [busy, setBusy] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [sourceStatus, setSourceStatus] = useState("");
  const [name, setName] = useState(""), [pcId, setPCId] = useState(""), [budget, setBudget] = useState("");
  const [objective, setObjective] = useState<Objective>("general"), [stages, setStages] = useState<DraftStage[]>([newStage()]);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    async function initial() {
      try {
        const [plansResponse, pcsResponse] = await Promise.all([planRequest("?page=1&page_size=20"), pcRequest("?page=1&page_size=20")]);
        const [plans, ownPCs] = await Promise.all([plansResponse.json(), pcsResponse.json()]);
        if (active) { setList(plans); setPCs(ownPCs); }
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : planError(503)); }
      finally { if (active) setBusy(false); }
    }
    void initial(); return () => { active = false; };
  }, []);
  async function operation(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : planError(503)); }
    finally { setBusy(false); }
  }
  async function load(page = 1) { setList(await (await planRequest(`?page=${page}&page_size=20`)).json()); }
  async function open(id: string) {
    await operation(async () => {
      const plan: Plan = await (await planRequest(`/${id}`)).json();
      setSelected(plan); setEditing(false); setDeleting(false); setSource(null); setSourceStatus("PC actual no comprobada.");
      if (!plan.pc_id) { setSourceStatus("PC fuente eliminada o sin referencia; snapshot conservado sin cambios."); return; }
      try {
        const current: PC = await (await pcRequest(`/${plan.pc_id}`)).json();
        setSourceStatus(String(current.revision) === String(plan.pc_revision) ? "PC actual conserva la revisión fuente; lectura sin recálculo." : "La PC cambió. Este snapshot histórico NO incorpora esos cambios.");
      } catch { setSourceStatus("PC actual no disponible (eliminada, no accesible o servicio caído). Snapshot histórico conservado; estado actual desconocido."); }
    });
  }
  function edit(plan: Plan | null) {
    setSelected(plan); setEditing(true); setDeleting(false); setError(""); setNotice(""); setSource(null); setConfirmed(false);
    setName(plan?.name ?? ""); setPCId(plan?.pc_id ?? ""); setBudget(plan?.budget_ars ?? ""); setObjective(plan?.objective ?? "general"); setStages(plan ? draftStages(plan) : [newStage()]);
  }
  async function loadSource() {
    await operation(async () => { setSource(null); setConfirmed(false); setSource(await (await pcRequest(`/${pcId}`)).json()); });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await operation(async () => {
      if (!source || source.id !== pcId || (selected && !confirmed)) throw new Error("Cargá la PC actual y confirmá explícitamente el recálculo.");
      const input = planInput(name, source, objective, budget, stages);
      const response = await planRequest(selected ? `/${selected.id}` : "", selected ? "PUT" : "POST", selected ? { ...input, revision: selected.revision } : input);
      setSelected(await response.json()); setEditing(false); setSourceStatus("Snapshot calculado y guardado por servidor. PC sin modificar.");
      setNotice("Plan guardado. Un borrador no certifica compatibilidad ni compra segura."); await load(list?.page ?? 1);
    });
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    await operation(async () => { await planRequest(`/${selected.id}`, "DELETE"); setSelected(null); setDeleting(false); setNotice("Plan eliminado. PC sin modificar."); await load(1); });
  }
  return <section aria-busy={busy} className="space-y-4">
    <header className="page-heading"><p className="eyebrow">UN PASO A LA VEZ</p><h1>Mis planes por etapas</h1><p className="muted">Organizá las compras y comprobá cada etapa sobre la configuración anterior.</p></header>
    <p role="status" aria-label="Estado de planes">{busy ? "Consultando planes…" : notice}</p>
    {error && <p role="alert">{error}</p>}
    <p><Link href="/pcs">Gestionar PCs fuente</Link> · <Link href="/account">Gestionar sesión</Link></p>
    <button type="button" disabled={busy} onClick={() => edit(null)}>Nuevo plan</button>
    <button className="secondary" type="button" disabled={busy} onClick={() => operation(async () => { await load(list?.page ?? 1); setPCs(await (await pcRequest("?page=1&page_size=20")).json()); })}>Recargar planes y PCs</button>
    {list && <section aria-label="Lista de planes" className="surface stack"><h2>Tus planes guardados</h2>
      <p>{list.total} planes · Página {list.page}</p>
      {list.items.length ? <ul className="plan-list">{list.items.map(plan => <li key={plan.id}><div className="stack-sm"><button className="text-button" disabled={busy} onClick={() => open(plan.id)}>{plan.name}</button><Badge tone={plan.status === "ready" ? "good" : "warning"}>{statusLabel(plan.status)}</Badge></div><strong><Price amount={plan.total_ars} /></strong></li>)}</ul> : <div className="empty-state"><p className="muted">Todavía no hay planes en esta página. Creá uno a partir de una PC guardada.</p></div>}
      <nav aria-label="Páginas de planes">{list.page > 1 && <button disabled={busy} onClick={() => operation(() => load(list.page - 1))}>Anterior</button>}{list.page * list.page_size < list.total && <button disabled={busy} onClick={() => operation(() => load(list.page + 1))}>Siguiente</button>}</nav>
    </section>}
    {selected && !editing && <section aria-label="Detalle de plan" className="surface stack">
      <div className="row between wrap"><h2>{selected.name}</h2><Badge tone={selected.status === "ready" ? "good" : "warning"}>{statusLabel(selected.status)}</Badge></div>
      <div className="plan-totals"><div><p className="muted">Total histórico del plan</p><p className="result-price"><Price amount={total(selected.cost)} /></p></div><div><p className="muted">Presupuesto · {selected.objective === "general" ? "Uso general" : selected.objective === "gaming" ? "Juegos" : "Productividad"}</p><strong><Price amount={selected.budget_ars} /></strong></div></div>
      <p className="muted">Cada etapa conserva la evaluación guardada. Consultar no recalcula ni modifica la PC.</p>
      <p className="muted">{sourceStatus.replaceAll("snapshot", "plan guardado").replaceAll("Snapshot", "Plan guardado")}</p>
      <details className="accordion"><summary>Costes, beneficio y datos por confirmar</summary><p>Precios históricos; envío, financiación y mano de obra excluidos, no cero. Adquisiciones repetidas se cuentan sin reventa.</p><EvidenceValue value={selected.cost} /><EvidenceValue value={selected.benefit} /><EvidenceValue value={selected.missing_fields} /></details>
      <details className="accordion"><summary>Configuración original y fechas</summary><p>Revisión de plan {selected.revision} · Revisión PC fuente {selected.pc_revision}</p><p>Creado {selected.created_at} · Actualizado {selected.updated_at}.</p><EvidenceValue value={selected.base_snapshot} /></details>
      {selected.stages.map(stage => <section key={stage.position} aria-label={`Resultado etapa ${stage.position}`} className="stage-card stack-sm">
        <p className="eyebrow">ETAPA {stage.position}</p><h3>{stage.name}</h3>
        <ul>{stage.replacements.flatMap(group => group.candidates.map(candidate => <li key={`${group.category}-${candidate.component_id}`} className="component-row"><ProductVisual category={group.category} componentId={candidate.component_id} /><div><small>{categories[group.category]} · {candidate.quantity} {group.category === "ram" ? "módulos" : "unidad"}</small><p>{catalog?.items.find(part => part.id === candidate.component_id)?.name ?? "Nombre de componente no disponible; consultá la configuración guardada"}</p></div></li>))}</ul>
        <div className="plan-totals"><div><p className="muted">Coste de esta etapa</p><strong><Price amount={total(stage.cost)} /></strong></div><div><p className="muted">Coste acumulado</p><strong><Price amount={total(stage.cumulative_cost)} /></strong></div></div>
        <EvaluationSummary result={stage.evaluation} />
        <details><summary>Sustituciones, reglas y evidencia histórica</summary><EvidenceValue value={stage.replacements} /><EvidenceValue value={stage.evaluation.rule_results} /></details>
        <details><summary>Configuración resultante acumulada, PC sin modificar</summary><EvidenceValue value={stage.evaluated_configuration} /></details>
      </section>)}
      <button disabled={busy} onClick={() => edit(selected)}>Preparar recálculo</button><button className="secondary" disabled={busy} onClick={() => open(selected.id)}>Recargar plan sin recalcular</button><button className="text-button" disabled={busy} onClick={() => setDeleting(true)}>Preparar borrado de plan</button>
      {deleting && <form aria-label="Confirmar borrado de plan" onSubmit={remove}><label><input type="checkbox" required disabled={busy} />Confirmo eliminar este plan, no su PC</label><button disabled={busy} type="submit">Eliminar plan definitivamente</button><button disabled={busy} type="button" onClick={() => setDeleting(false)}>Cancelar borrado</button></form>}
      <Shares key={`shares-${selected.id}-${selected.revision}`} planId={selected.id} revision={selected.revision} disabled={busy} />
    </section>}
    {editing && <form aria-label="Editor de plan" onSubmit={save} className="surface plan-editor stack"><fieldset disabled={busy} className="stack"><legend className="form-legend">{selected ? "Recalcular tu plan" : "Diseñá tu plan por etapas"}</legend>
      <label className="block" htmlFor="plan-name">Nombre del plan</label><input id="plan-name" required maxLength={100} value={name} onChange={event => { setName(event.target.value); setConfirmed(false); }} />
      <p>PCs propias: primeras {pcs?.items.length ?? 0} de {pcs?.total ?? "total desconocido"}. Cambiar PC fuente exige cargar su revisión actual.</p>
      <label htmlFor="plan-pc">PC fuente</label><select id="plan-pc" required value={pcId} onChange={event => { setPCId(event.target.value); setSource(null); setConfirmed(false); }}><option value="">Seleccioná PC propia</option>{pcId && !pcs?.items.some(pc => pc.id === pcId) && <option value={pcId}>PC referenciada (servidor verificará disponibilidad)</option>}{pcs?.items.map(pc => <option key={pc.id} value={pc.id}>{pc.name}</option>)}</select>
      <button type="button" disabled={!pcId} onClick={loadSource}>Cargar PC actual para el plan</button><p>{source ? `Revisión PC cargada: ${source.revision}` : "Sin PC actual cargada. No se puede guardar ni recalcular."}</p>
      <label htmlFor="plan-objective">Objetivo del plan</label><select id="plan-objective" value={objective} onChange={event => { setObjective(event.target.value as Objective); setConfirmed(false); }}><option value="general">General</option><option value="gaming">Gaming</option><option value="productivity">Productividad</option></select>
      <label htmlFor="plan-budget">Presupuesto global ARS</label><input id="plan-budget" required inputMode="decimal" maxLength={15} value={budget} onChange={event => { setBudget(event.target.value); setConfirmed(false); }} />
      {!catalog && <p role="alert">Catálogo no disponible: no se permite recalcular ni crear con datos inventados.</p>}
      {catalog && <p>Referencias reales: {catalog.items.length} de {catalog.total} en esta vista. Sin selección de dependencias implícita.</p>}
      {stages.map((stage, si) => <fieldset key={si} className="border rounded p-3 space-y-3"><legend>Etapa {si + 1} · Desde resultado anterior</legend>
        <label htmlFor={`plan-stage-${si}`}>Nombre etapa {si + 1}</label><input id={`plan-stage-${si}`} required maxLength={100} value={stage.name} onChange={event => { setStages(items => items.map((item, index) => index === si ? { ...item, name: event.target.value } : item)); setConfirmed(false); }} />
        <Replacements stage={si} groups={stage.replacements} catalog={catalog} change={groups => { setStages(items => items.map((item, index) => index === si ? { ...item, replacements: groups } : item)); setConfirmed(false); }} />
        {stages.length > 1 && <button type="button" onClick={() => { setStages(items => items.filter((_, index) => index !== si)); setConfirmed(false); }}>Retirar etapa {si + 1}</button>}
      </fieldset>)}
      <button type="button" disabled={stages.length >= 12} onClick={() => { setStages(items => [...items, newStage()]); setConfirmed(false); }}>Añadir etapa acumulada</button>
      {selected && <label className="block"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo reemplazar el plan y recalcular TODAS las etapas desde la PC actual cargada. No modifica la PC.</label>}
      <button type="submit" disabled={!source || !catalog || (!!selected && !confirmed)}>{selected ? "Confirmar recálculo y guardar plan" : "Calcular y guardar borrador"}</button>
      <button type="button" onClick={() => setEditing(false)}>Cancelar edición de plan</button>
      {selected && <button type="button" onClick={() => open(selected.id)}>Descartar cambios y volver al plan</button>}
    </fieldset></form>}
  </section>;
}
