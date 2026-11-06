"use client";
import { useId } from "react";
import type { AssemblyState } from "../../lib/towers";

export const opcionesDeArmado: { valor: Exclude<AssemblyState, null>; texto: string }[] = [
  { valor: "assembled", texto: "Sí, ya funciona" },
  { valor: "new", texto: "La estoy armando" },
];

/** Declaración explícita de la persona. Nunca se deduce por tener una PC guardada. */
export default function AssemblyStateSelect({ value, onChange, disabled, id }: { value: AssemblyState; onChange: (value: AssemblyState) => void; disabled?: boolean; id?: string }) {
  const generado = useId(), campo = id ?? `assembly-${generado}`;
  return <div className="grid gap-space-2 font-sans-uj text-tinta">
    <label htmlFor={campo} className="text-cuerpo-fuerte">¿Esta PC ya está armada y funcionando?</label>
    <select id={campo} className="block w-full min-h-12 rounded-sm border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-4 py-space-3 text-cuerpo text-tinta font-sans-uj focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco" value={value ?? ""} disabled={disabled} onChange={event => onChange(event.target.value === "" ? null : event.target.value as Exclude<AssemblyState, null>)}>
      {opcionesDeArmado.map(opcion => <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>)}
      <option value="">Prefiero no decirlo</option>
    </select>
    <span className="text-chico text-tinta-suave">Si ya funciona, no revisamos el espacio físico del gabinete. No lo deducimos de la PC guardada.</span>
  </div>;
}
