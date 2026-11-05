import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonPeso = "principal" | "secundario" | "quieto" | "peligro";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  peso: ButtonPeso;
  chico?: boolean;
  /** Si el botón está deshabilitado, este texto reemplaza a la acción y explica qué falta. */
  motivo?: string;
  /** Va a la derecha, después del texto. */
  icono?: ReactNode;
};

// El `button` de globals.css vive en `@layer base`, así que las utilidades de Tailwind le ganan
// sin necesitar `!`.
const BASE =
  "inline-flex items-center justify-center gap-space-2 rounded-pill border-[1.5px] border-solid no-underline cursor-pointer font-sans-uj transition-colors " +
  "hover:filter-none disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-papel-hundido disabled:text-tinta-suave disabled:border-transparent " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

const PESOS: Record<ButtonPeso, string> = {
  principal: "bg-pino text-sobre-pino border-transparent enabled:hover:bg-pino-hover enabled:hover:border-transparent",
  secundario: "bg-papel-alto text-tinta border-linea-fuerte enabled:hover:border-tinta",
  peligro: "bg-no-encaja text-papel border-transparent enabled:hover:border-transparent enabled:hover:opacity-90",
  quieto:
    "bg-transparent text-pino border-transparent underline underline-offset-4 enabled:hover:border-transparent",
};

const NORMAL = "min-h-12 py-space-3 text-cuerpo-fuerte";
const CHICO = "min-h-10 py-space-2 text-[14px] leading-5 font-semibold";

function relleno(peso: ButtonPeso, chico: boolean) {
  if (peso === "quieto") return "px-space-3";
  return chico ? "px-space-4" : "px-space-5";
}

export function Button({ peso, chico = false, motivo, icono, disabled, type = "button", children, ...resto }: ButtonProps) {
  const texto = disabled && motivo ? motivo : children;
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${BASE} ${PESOS[peso]} ${chico ? CHICO : NORMAL} ${relleno(peso, chico)}`}
      {...resto}
    >
      {texto}
      {icono && (
        <span aria-hidden="true" className="inline-flex flex-none">
          {icono}
        </span>
      )}
    </button>
  );
}
