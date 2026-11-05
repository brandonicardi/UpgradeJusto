/** `400000` → `$ 400.000`. Trabaja sobre el texto del entero, sin convertir a número. */
export function formatearMonto(entero: string, moneda?: string | null) {
  const simbolo = moneda ? ({ ARS: "$", USD: "US$" } as Record<string, string>)[moneda.trim().toUpperCase()] : "$";
  const prefijo = simbolo ?? moneda?.trim() ?? "$";
  return `${prefijo} ${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export type Diferencia = {
  /** Entero como texto, con signo: «10100» sobra, «-40000» falta. La resuelve la API. */
  monto: string;
  moneda: string;
};

/** Lee la diferencia sin hacer cuentas: solo mira el signo del texto. `null` = no se sabe. */
export function leerDiferencia(diferencia: Diferencia | null | undefined) {
  const partes = /^(-?)(\d+)$/.exec(diferencia?.monto.trim() ?? "");
  if (!partes || !diferencia?.moneda.trim()) return null;
  const absoluto = partes[2].replace(/^0+(?=\d)/, "");
  const sinMonto = absoluto === "0";
  return {
    tipo: sinMonto ? ("justo" as const) : partes[1] ? ("falta" as const) : ("sobra" as const),
    texto: formatearMonto(absoluto, diferencia.moneda),
  };
}
