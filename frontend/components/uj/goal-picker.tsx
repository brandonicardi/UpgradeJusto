"use client";

import { useId } from "react";
import { Check } from "lucide-react";

export type OpcionDeObjetivo = { valor: string; texto: string };

type ComunesGoalPicker = {
  pregunta: string;
  opciones: OpcionDeObjetivo[];
  /** Nombre accesible del grupo si debe ser distinto de la pregunta visible. */
  nombre?: string;
};

export type GoalPickerProps = ComunesGoalPicker &
  (
    | { multiple?: false; valor: string | null; onCambio: (valor: string) => void }
    | { multiple: true; valor: string[]; onCambio: (valor: string[]) => void }
  );

/** Qué queda elegido después de tocar `tocada`. En modo único, volver a tocar la misma la deja. */
export function siguienteSeleccion(actual: string | string[] | null, tocada: string, multiple: boolean) {
  if (!multiple) return tocada;
  const lista = Array.isArray(actual) ? actual : [];
  return lista.includes(tocada) ? lista.filter((v) => v !== tocada) : [...lista, tocada];
}

const OPCION =
  "inline-flex min-h-12 cursor-pointer items-center gap-space-2 rounded-pill border-[1.5px] border-solid border-linea-fuerte bg-papel-alto " +
  "py-space-3 pr-space-5 pl-space-4 text-left font-sans-uj text-cuerpo-fuerte text-tinta " +
  "aria-pressed:border-pino aria-pressed:bg-pino-suave " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

export function GoalPicker(props: GoalPickerProps) {
  const { pregunta, opciones, nombre } = props;
  const idPregunta = useId();
  const elegidas = props.multiple ? props.valor : props.valor === null ? [] : [props.valor];

  function tocar(valor: string) {
    if (props.multiple) props.onCambio(siguienteSeleccion(props.valor, valor, true) as string[]);
    else props.onCambio(valor);
  }

  return (
    <div className="grid gap-space-4 font-sans-uj text-tinta">
      <div id={idPregunta} className="font-display text-titular-m">
        {pregunta}
      </div>
      <div role="group" aria-label={nombre} aria-labelledby={nombre ? undefined : idPregunta} className="m-0 flex flex-wrap gap-space-3 border-0 p-0">
        {opciones.map(({ valor, texto }) => {
          const marcada = elegidas.includes(valor);
          return (
            <button key={valor} type="button" aria-pressed={marcada} onClick={() => tocar(valor)} className={OPCION}>
              <span
                aria-hidden="true"
                className={`grid size-[22px] flex-none place-items-center rounded-pill border-[1.5px] border-solid ${
                  marcada ? "border-pino bg-pino text-sobre-pino" : "border-linea-fuerte text-transparent"
                }`}
              >
                <Check className="size-[14px]" strokeWidth={3} />
              </span>
              {texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}
