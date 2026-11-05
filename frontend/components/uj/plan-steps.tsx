import { Check } from "lucide-react";
import { PriceTag, type PriceTagProps } from "./price-tag";
import { Verdict } from "./verdict";

export type EstadoDeEtapa = "hecha" | "actual" | "pendiente";

export type EtapaDelPlan = {
  nombre: string;
  /** Costo de la etapa tal como lo devuelve la API. Sin costo dice «Sin precio». */
  costo?: Omit<PriceTagProps, "compacto">;
  estado: EstadoDeEtapa;
  /** Veredicto de la PC con todos los cambios hasta esta etapa. Sin veredicto dice «Falta un dato». */
  veredicto?: string | null;
};

export type PlanStepsProps = {
  /** Ya sumado por la API: la lista no calcula. Sin total no se muestra ninguno. */
  total?: Omit<PriceTagProps, "compacto">;
  etapas: EtapaDelPlan[];
};

const PUNTO: Record<EstadoDeEtapa, string> = {
  hecha: "bg-pino text-sobre-pino",
  actual: "bg-lima text-sobre-lima",
  pendiente: "bg-papel-hundido text-tinta-suave",
};

const PALABRA: Record<EstadoDeEtapa, string> = {
  hecha: "Hecha",
  actual: "Paso actual",
  pendiente: "Pendiente",
};

export function PlanSteps({ total, etapas }: PlanStepsProps) {
  return (
    <div className="grid max-w-[560px] gap-space-4 font-sans-uj text-tinta">
      {total && (
        <div className="grid gap-space-1">
          <div className="text-etiqueta text-tinta-suave">Total del plan</div>
          <PriceTag {...total} />
        </div>
      )}
      <ol className="m-0 grid list-none gap-0 p-0">
        {etapas.map((etapa, i) => (
          <li
            key={`${i}-${etapa.nombre}`}
            aria-current={etapa.estado === "actual" ? "step" : undefined}
            className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-space-4 pb-space-5"
          >
            {i < etapas.length - 1 && (
              <span aria-hidden="true" data-conector="" className="absolute bottom-0 left-[19px] top-10 w-[2px] bg-linea" />
            )}
            <span
              aria-hidden="true"
              className={`grid size-10 place-items-center rounded-pill font-display text-[16px] font-bold leading-none ${PUNTO[etapa.estado]}`}
            >
              {etapa.estado === "hecha" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <div
              className={`grid min-w-0 justify-items-start gap-space-2 ${
                etapa.estado === "actual" ? "-mt-1 rounded-md bg-pino-suave px-space-4 py-space-3" : "pt-space-2"
              }`}
            >
              <div>
                <div className="text-cuerpo-fuerte">{etapa.nombre}</div>
                <div className="text-chico text-tinta-suave">{PALABRA[etapa.estado]}</div>
              </div>
              <PriceTag {...etapa.costo} compacto />
              <Verdict estado={etapa.veredicto} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
