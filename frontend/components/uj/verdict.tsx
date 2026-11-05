import { Check, CircleHelp, X } from "lucide-react";

type Presentacion = { palabra: string; Icono: typeof Check; colores: string };

const ENCAJA: Presentacion = { palabra: "Encaja", Icono: Check, colores: "bg-encaja-fondo text-encaja" };
const FALTA_UN_DATO: Presentacion = { palabra: "Falta un dato", Icono: CircleHelp, colores: "bg-revisar-fondo text-revisar" };
const NO_ENCAJA: Presentacion = { palabra: "No encaja", Icono: X, colores: "bg-no-encaja-fondo text-no-encaja" };

// Solo traduce lo que dice el motor. Cualquier otra cosa es «Falta un dato», nunca «Encaja».
function presentacion(estado: string | null | undefined): Presentacion {
  switch (estado) {
    case "compatible":
      return ENCAJA;
    case "incompatible":
      return NO_ENCAJA;
    default:
      return FALTA_UN_DATO;
  }
}

export function Verdict({ estado }: { estado: string | null | undefined }) {
  const { palabra, Icono, colores } = presentacion(estado);
  return (
    <span
      className={`inline-flex items-center gap-space-1 rounded-pill py-[6px] pr-space-3 pl-[10px] font-sans-uj text-etiqueta ${colores}`}
    >
      <Icono aria-hidden="true" className="size-4 flex-none" strokeWidth={2.25} />
      {palabra}
    </span>
  );
}
