import { ArrowRight, Check } from "lucide-react";
import { Button } from "./button";
import { leerDiferencia, type Diferencia } from "./monto";
import { PriceTag, type PriceTagProps } from "./price-tag";
import { Verdict } from "./verdict";
import type { ReactNode } from "react";

export type UpgradeCardProps = {
  /** Una acción: «Cambiá la placa de video». */
  titulo: string;
  actual: string;
  nueva: string;
  /** Dos o tres motivos en lenguaje simple. */
  motivos: string[];
  precio?: Omit<PriceTagProps, "compacto">;
  /** Ya resuelta por la API: la tarjeta no calcula. Negativa = falta plata. */
  diferencia?: Diferencia | null;
  /** Estado que devuelve el motor. Sin estado dice «Falta un dato». */
  veredicto?: string | null;
  onSumar?: () => void;
  ariaLabel?: string;
  etiqueta?: string;
  accionPrincipal?: string;
  accionDeshabilitada?: boolean;
  className?: string;
  precioAlternativo?: ReactNode;
  cambio?: ReactNode;
  resumen?: ReactNode;
  children?: ReactNode;
  /** Si no viene, el botón «Ver otras opciones» no se muestra. */
  onVerOpciones?: () => void;
};

function Presupuesto({ diferencia }: { diferencia: UpgradeCardProps["diferencia"] }) {
  const leida = leerDiferencia(diferencia);
  if (!leida) return null;
  const clase = "text-chico text-tinta-suave";
  if (leida.tipo === "sobra") {
    return (
      <span className={clase}>
        Te sobran <span className="rounded-sm bg-lima px-space-1 font-bold text-sobre-lima">{leida.texto}</span> de tu presupuesto
      </span>
    );
  }
  if (leida.tipo === "falta") {
    return (
      <span className={clase}>
        Te faltan <span className="font-bold text-tinta">{leida.texto}</span>
      </span>
    );
  }
  return <span className={clase}>Justo con tu presupuesto</span>;
}

export function UpgradeCard({ titulo, actual, nueva, motivos, precio, diferencia, veredicto, onSumar, onVerOpciones, ariaLabel, etiqueta = "Lo que más te conviene", accionPrincipal = "Sumar a mi plan", accionDeshabilitada = false, className, precioAlternativo, cambio, resumen, children }: UpgradeCardProps) {
  return (
    <article aria-label={ariaLabel} className={`grid min-w-0 w-full ${className ?? "max-w-[620px] shadow-sombra-2"} gap-space-4 rounded-lg bg-papel-alto p-space-5 font-sans-uj text-tinta [overflow-wrap:anywhere]`}>
      <div className="flex flex-wrap items-start justify-between gap-space-3">
        <div className="min-w-0">
          <div className="text-etiqueta text-tinta-suave">{etiqueta}</div>
          <h3 className="m-0 mt-[2px] font-display text-titular-m">{titulo}</h3>
        </div>
        <Verdict estado={veredicto} />
      </div>

      {cambio ?? <div aria-label="Cambio propuesto" className="grid grid-cols-1 items-center gap-space-3 min-[600px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="min-w-0 rounded-md bg-papel px-space-4 py-space-3">
          <div className="text-etiqueta text-tinta-suave">Hoy tenés</div>
          <div className="text-cuerpo-fuerte">{actual}</div>
        </div>
        <ArrowRight aria-hidden="true" className="size-6 justify-self-center text-tinta-suave max-[599px]:rotate-90" />
        <div className="min-w-0 rounded-md bg-pino-suave px-space-4 py-space-3">
          <div className="text-etiqueta text-tinta-suave">Pasás a</div>
          <div className="text-cuerpo-fuerte">{nueva}</div>
        </div>
      </div>}

      {motivos.length > 0 && <ul className="m-0 grid list-none gap-space-2 p-0">
        {motivos.map((motivo) => (
          <li key={motivo} className="flex items-start gap-space-2 text-cuerpo">
            <Check aria-hidden="true" className="mt-[2px] size-5 flex-none text-pino" strokeWidth={2.25} />
            <span>{motivo}</span>
          </li>
        ))}
      </ul>}
      {resumen}

      <div className="flex flex-wrap items-end justify-between gap-space-4 border-t border-solid border-linea pt-space-4">
        <div className="grid min-w-0 gap-space-1">
          {precioAlternativo ?? <PriceTag {...precio} />}
          <Presupuesto diferencia={diferencia} />
        </div>
        <div className="flex flex-wrap gap-space-2">
          {onVerOpciones && (
            <Button peso="secundario" chico onClick={onVerOpciones}>
              Ver otras opciones
            </Button>
          )}
          {onSumar && <Button peso="principal" chico disabled={accionDeshabilitada} onClick={onSumar}>
            {accionPrincipal}
          </Button>}
        </div>
      </div>
      {children}
    </article>
  );
}
