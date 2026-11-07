"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cambiarCantidad, descripcionDeFila, elegirCandidata, escribirPieza, marcarSinPieza, unidadesPorCategoria, type FilaDeRevision } from "../../../lib/import-review";
import { piezas } from "../../../lib/mi-pc";
import { remoteCatalog, type TowerComponent } from "../../../lib/tower-catalog";
import type { TowerProposalDraft } from "../../../lib/tower-extraction";

/** Nombres de piezas del catálogo por id. Mientras no llegan, la fila lo dice; nunca inventa otro nombre. */
function useNombres(ids: string[]) {
  const [nombres, setNombres] = useState<Record<string, string>>({}), clave = ids.join("|");
  useEffect(() => {
    const controller = new AbortController();
    ids.forEach(id => {
      remoteCatalog<TowerComponent>(`/${encodeURIComponent(id)}`, controller.signal)
        .then(parte => { if (!controller.signal.aborted && parte.id === id) setNombres(actual => ({ ...actual, [id]: parte.name })); })
        .catch(() => { if (!controller.signal.aborted) setNombres(actual => ({ ...actual, [id]: "Componente del catálogo (no pudimos cargar su nombre)" })); });
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume los ids.
  }, [clave]);
  return nombres;
}

const MARCAS = { leida: "Leída", revisar: "Revisala", sin_dato: "Sin dato" } as const;

export default function FilaDeRevisionView({ fila, draft, onDraft, deshabilitado }: { fila: FilaDeRevision; draft: TowerProposalDraft; onDraft: (siguiente: TowerProposalDraft) => void; deshabilitado: boolean }) {
  const { category, marca, citas, pregunta, candidatos } = fila, { nombre } = piezas[category], { max, plural } = unidadesPorCategoria[category];
  const lineas = draft.lines.filter(line => line.category === category);
  const nombres = useNombres([...lineas.flatMap(line => line.component_id ? [line.component_id] : []), ...candidatos]);
  const estado = draft.category_status[category];
  const etiqueta = (i: number) => lineas.length > 1 ? `${nombre} ${i + 1}` : nombre;
  return <li className={`imp-row${marca === "revisar" ? " is-check" : ""}${marca === "sin_dato" ? " is-none" : ""}`}>
    <div className="imp-row-kind"><b>{nombre}</b><span>{descripcionDeFila(category)}</span></div>
    <div className="imp-row-edit">
      {(lineas.length ? lineas : [null]).map((line, i) => <div key={i} className="imp-line">
        <input className="imp-input" aria-label={etiqueta(i)} placeholder={line ? undefined : "No estaba en tu lista"} disabled={deshabilitado} readOnly={!!line?.component_id && !nombres[line.component_id]} value={line ? line.component_id ? nombres[line.component_id] ?? "Buscando el componente…" : line.declared_model ?? "" : ""} onChange={event => onDraft(escribirPieza(draft, category, event.target.value, i))} />
        {line && (max > 1 || line.quantity === null) && <label className="imp-qty"><span>{max > 1 ? `Cantidad de ${plural}` : "Cantidad"}</span>
          <input className="imp-input" type="number" min={1} max={max} step={1} disabled={deshabilitado} aria-label={`Cantidad de ${plural} · ${etiqueta(i)}`} value={line.quantity ?? ""} onChange={event => onDraft(cambiarCantidad(draft, category, Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber, i))} /></label>}
      </div>)}
      {citas.length > 0 && <span className="imp-quote">De tu texto: <q>{citas.join(" · ")}</q></span>}
      {pregunta && <span className="imp-ask">{pregunta}</span>}
      {candidatos.length > 0 && <select className="imp-input" aria-label={`¿Cuál es tu ${nombre.toLowerCase()}?`} disabled={deshabilitado}
        value={lineas.find(line => line.component_id && candidatos.includes(line.component_id))?.component_id ?? ""}
        onChange={event => onDraft(elegirCandidata(draft, category, event.target.value || null, lineas[0]?.declared_model ?? ""))}>
        <option value="">No lo sé todavía</option>{candidatos.map(id => <option key={id} value={id}>{nombres[id] ?? "Buscando el componente…"}</option>)}
      </select>}
      {!lineas.length && <div className="imp-chips">
        <button type="button" className="imp-chip" aria-pressed={estado === "unknown"} disabled={deshabilitado} onClick={() => onDraft(marcarSinPieza(draft, category, "unknown"))}>No lo sé</button>
        <button type="button" className="imp-chip" aria-pressed={estado === "absent"} disabled={deshabilitado} onClick={() => onDraft(marcarSinPieza(draft, category, "absent"))}>No la tengo</button>
      </div>}
    </div>
    <span className={`imp-tag imp-tag-${marca}`}>{marca === "leida" && <Check aria-hidden="true" strokeWidth={2.25} />}{MARCAS[marca]}</span>
  </li>;
}
