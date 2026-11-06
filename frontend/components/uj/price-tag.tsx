export type PriceTagProps = {
  monto?: number | string | null;
  moneda?: string | null;
  condicion?: string | null;
  fecha?: string | null;
  tienda?: string | null;
  enlace?: string | null;
  /** Versión más chica para usar dentro de una tarjeta. */
  compacto?: boolean;
  /** Sin enlace para una tarjeta que ya es un enlace completo. */
  catalogo?: boolean;
};

const SIMBOLOS: Record<string, string> = { ARS: "$", USD: "US$" };
const formato = new Intl.NumberFormat("es-AR");

function texto(valor: string | null | undefined): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}

// Un monto que no es un número mayor que cero no es un precio: nunca se muestra como `$ 0`.
function montoValido(monto: PriceTagProps["monto"]): number | null {
  if (monto === null || monto === undefined) return null;
  const numero = typeof monto === "number" ? monto : Number(monto.trim().replace(",", "."));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function fechaLegible(fecha: string | null): string | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(fecha ?? "");
  if (!partes) return null;
  const [, anio, mes, dia] = partes;
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return null;
  return `${dia}/${mes}/${anio}`;
}

function enlaceSeguro(enlace: string | null): string | null {
  return enlace && /^https?:\/\//i.test(enlace) ? enlace : null;
}

export function PriceTag({ monto, moneda, condicion, fecha, tienda, enlace, compacto = false, catalogo = false }: PriceTagProps) {
  const cantidad = montoValido(monto);
  const codigo = texto(moneda);
  const dia = fechaLegible(texto(fecha));
  const lugar = texto(tienda);
  const metaClase = "text-chico text-tinta-suave";

  if (cantidad === null || !codigo || !dia || !lugar) {
    return (
      <div className="grid gap-[2px] font-sans-uj">
        <span className="text-[20px] leading-6 font-bold text-tinta-suave">Sin precio</span>
        <span className={metaClase}>{catalogo ? "No lo vimos en los últimos días" : "No tenemos un precio reciente de esta pieza."}</span>
      </div>
    );
  }

  const simbolo = SIMBOLOS[codigo.toUpperCase()];
  const url = enlaceSeguro(texto(enlace));
  const motivo = texto(condicion);
  return (
    <div className="grid gap-[2px] font-sans-uj">
      <span
        className={`font-bold tabular-nums text-tinta ${compacto ? "text-[20px] leading-6" : "text-precio"}`}
      >
        <small className="mr-[4px] text-[16px] font-semibold text-tinta-suave">{codigo}</small>
        {simbolo ? `${simbolo} ` : ""}
        {typeof monto === "string" && /^\d+\.\d{2}$/.test(monto) ? monto.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (monto.endsWith(".00") ? "" : `,${monto.split(".")[1]}`) : formato.format(cantidad)}
      </span>
      <span className={metaClase}>
        {catalogo ? `${dia.slice(0, 5)} · ` : motivo ? `${motivo} · visto el ${dia} en ` : `Visto el ${dia} en `}
        {url && !catalogo ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 text-pino underline underline-offset-4"
          >
            {lugar}
          </a>
        ) : (
          lugar
        )}
      </span>
    </div>
  );
}
