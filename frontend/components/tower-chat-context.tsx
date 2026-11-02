"use client";
import { useEffect, useRef, useState } from "react";
import { towerCategories, towerKeys, type Tower, type TowerPage } from "../lib/towers";
import { createContextRequestEpoch, emptyTurnCriteria, towerTurnContext, turnObjective, type AssistantContext } from "../lib/assistant-context";

export function TowerChatSummary({ pc }: { pc: Tower }) {
  return <section aria-label="Torre seleccionada para este turno"><h4>{pc.name} · revisión {pc.revision}</h4><ul>{towerKeys.map(category => <li key={category}>{towerCategories[category]}: {pc.category_status[category] === "unknown" ? "No sé / por confirmar" : pc.category_status[category] === "absent" ? "No tengo (declarado)" : <>Presente · cantidades explícitas: {pc.lines.filter(line => line.category === category).map(line => line.quantity).join(" + ") || "Por confirmar"}{category === "ram" ? " módulos; capacidad no calculada" : " unidades"}</>}</li>)}</ul></section>;
}
export default function TowerChatContext({ disabled, onChange }: { disabled: boolean; onChange: (context: AssistantContext | undefined, invalid: boolean) => void }) {
  const [list, setList] = useState<TowerPage | null>(null), [page, setPage] = useState(1), [selected, setSelected] = useState<Tower | null>(null), [criteria, setCriteria] = useState(emptyTurnCriteria);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [revisionLoad, setRevisionLoad] = useState(0);
  const [requestedId, setRequestedId] = useState("");
  const selection = useRef<AbortController | null>(null), generation = useRef(0), callback = useRef(onChange);
  const listEpoch = useRef(createContextRequestEpoch());
  useEffect(() => { callback.current = onChange; }, [onChange]);
  useEffect(() => {
    const abort = new AbortController(), ticket = listEpoch.current.current();
    const current = () => !abort.signal.aborted && listEpoch.current.isCurrent(ticket);
    fetch(`/api/towers?page=${page}&page_size=20`, { credentials: "same-origin", cache: "no-store", signal: abort.signal }).then(async response => { if (!response.ok) throw new Error(); return await response.json() as TowerPage; }).then(data => { if (current()) setList(data); }).catch(() => { if (current()) { setList(null); setError("No se pudieron consultar tus torres. Podés enviar sin contexto o recargar la lista."); } }).finally(() => { if (current()) setLoading(false); });
    return () => abort.abort();
  }, [page, revisionLoad]);
  function requestList(nextPage: number, reload = false) {
    listEpoch.current.advance(); setLoading(true); setList(null);
    if (reload) { void choose(""); setRevisionLoad(value => value + 1); }
    else setPage(nextPage);
  }
  useEffect(() => () => { generation.current++; selection.current?.abort(); }, []);
  async function choose(id: string) {
    selection.current?.abort(); const ticket = ++generation.current; setRequestedId(id); setSelected(null); setCriteria(emptyTurnCriteria()); setError(""); callback.current(undefined, !!id);
    if (!id) return;
    const abort = new AbortController(); selection.current = abort;
    try {
      const response = await fetch(`/api/towers/${id}`, { credentials: "same-origin", cache: "no-store", signal: abort.signal });
      if (!response.ok) throw new Error(); const pc = await response.json() as Tower;
      const context = towerTurnContext(pc, emptyTurnCriteria());
      if (ticket !== generation.current || abort.signal.aborted) return;
      setSelected(pc); callback.current(context, false);
    } catch { if (ticket === generation.current && !abort.signal.aborted) { setError("No se pudo confirmar la torre/revisión. Elegí Ninguna o recargá y revisá explícitamente."); callback.current(undefined, true); } }
  }
  function update(next: typeof criteria) {
    setCriteria(next); if (!selected) return;
    try { callback.current(towerTurnContext(selected, next), false); setError(""); }
    catch (failure) { callback.current(undefined, true); setError(failure instanceof Error ? failure.message : "Revisá los criterios del turno."); }
  }
  return <section className="surface stack-sm" aria-label="Contexto de torre por turno"><h3>PC para esta pregunta</h3><p>Solo este turno; selección no guardada en conversación.</p><fieldset disabled={disabled} className="stack-sm"><label htmlFor="chat-tower">Torre propia para este turno</label><select id="chat-tower" value={requestedId} onChange={event => { void choose(event.target.value); }}><option value="">Ninguna</option>{requestedId && !list?.items.some(pc => pc.id === requestedId && pc.origin_schema === 2) && <option value={requestedId}>{selected ? `${selected.name} · revisión ${selected.revision}` : "Selección pendiente de confirmar"}</option>}{list?.items.filter(pc => pc.origin_schema === 2 && pc.schema_version === 2).map(pc => <option key={pc.id} value={pc.id}>{pc.name} · revisión {pc.revision}</option>)}</select><p>Lista propia paginada · página {page}{loading ? " · Consultando…" : ""}. Las configuraciones históricas no se seleccionan aquí.</p><div className="row wrap"><button type="button" className="secondary" disabled={loading || page <= 1} onClick={() => requestList(page - 1)}>Torres anteriores</button><button type="button" className="secondary" disabled={loading || !list || list.page * list.page_size >= list.total} onClick={() => requestList(page + 1)}>Torres siguientes</button><button type="button" className="text-button" onClick={() => requestList(page, true)}>Recargar torres y descartar selección</button></div>
    {selected && <><TowerChatSummary pc={selected} /><label>Objetivo de este turno<select value={criteria.objective ?? ""} onChange={event => update(turnObjective(criteria, event.target.value === "" ? null : event.target.value as NonNullable<AssistantContext["objective"]>))}><option value="">Sin objetivo indicado</option><option value="general">Uso general</option><option value="gaming">Juegos</option><option value="productivity">Productividad</option></select></label><label>Presupuesto ARS de este turno (opcional)<input inputMode="decimal" value={criteria.budget} onChange={event => update({ ...criteria, budget: event.target.value })} /></label><label>Condición de precio de este turno<select value={criteria.price_condition} onChange={event => update({ ...criteria, price_condition: event.target.value as "cash" | "list" })}><option value="cash">Contado</option><option value="list">Lista (no cuotas)</option></select></label>{criteria.objective === "productivity" && <label>Trabajo de este turno<select value={criteria.workload ?? ""} onChange={event => update({ ...criteria, workload: event.target.value === "blender-cpu" ? "blender-cpu" : null })}><option value="">Sin trabajo indicado</option><option value="blender-cpu">Blender · render CPU</option></select></label>}<p>Se envían sólo referencia, revisión y criterios. No se adjuntan notas, modelos ni materiales confirmados. Envío, financiación y mano de obra excluidos del presupuesto.</p></>}
    </fieldset>{error && <p role="alert">{error}</p>}</section>;
}
