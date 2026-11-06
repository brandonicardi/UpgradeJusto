"use client";
import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Verdict } from "../../components/uj/verdict";
import { filasDeEncaje, fraseDeEncaje } from "../../lib/mi-pc";
import { towerCompatibilityRequest, towerEssentialNote, type TowerEvaluation } from "../../lib/tower-compatibility";
import type { Tower } from "../../lib/towers";

/** «¿Encaja todo entre sí?»: muestra lo que devuelve el motor del servidor para la PC guardada. Consultar no la modifica. */
export default function EncajeDeLaPc({ pc }: { pc: Tower }) {
  const [resultado, setResultado] = useState<{ clave: string; evaluacion: TowerEvaluation | null; fallo: boolean } | null>(null), [intento, setIntento] = useState(0);
  const clave = `${pc.id}:${pc.revision}:${intento}`;
  useEffect(() => {
    const controller = new AbortController();
    towerCompatibilityRequest(pc, "evaluate", undefined, controller.signal)
      .then(evaluacion => { if (!controller.signal.aborted) setResultado({ clave, evaluacion, fallo: false }); })
      .catch(() => { if (!controller.signal.aborted) setResultado({ clave, evaluacion: null, fallo: true }); });
    return () => controller.abort();
    // La comprobación depende de la PC guardada (id y versión), no de cada cambio de pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  const actual = resultado?.clave === clave ? resultado : null;
  const evaluacion = actual?.evaluacion ?? null;
  const nota = evaluacion ? towerEssentialNote(evaluacion) : null;
  return <div className="pcs-card" aria-busy={!actual}>
    <h2>¿Encaja todo entre sí?</h2>
    {!actual && <p role="status">Revisando tus piezas…</p>}
    {actual?.fallo && <><p role="alert">No pudimos revisar si todo encaja. Probá de nuevo en un rato.</p><button type="button" className="pcs-quiet" onClick={() => setIntento(intento + 1)}>Volver a revisar</button></>}
    {evaluacion && <>
      <ul className="pcs-status-list">{filasDeEncaje(evaluacion).map(fila => <li key={fila.id}>
        <span className="pcs-status-label"><span>{fila.texto}</span>{fila.motivo && <small className="pcs-status-why">{fila.motivo}</small>}</span>
        {fila.estado === "no_evaluado" ? <span className="pcs-verdict-neutral"><CircleHelp aria-hidden="true" className="size-4 flex-none" strokeWidth={2.25} />No evaluado</span> : <Verdict estado={fila.estado} />}
      </li>)}</ul>
      <p className="pcs-encaje-frase">{fraseDeEncaje(evaluacion)}</p>
      {nota && <p className="pcs-encaje-note">{nota}</p>}
    </>}
  </div>;
}
