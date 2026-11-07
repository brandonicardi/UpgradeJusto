"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { formatearMonto } from "./monto";

export type AtajoDePresupuesto = { valor: string; texto: string };

export type BudgetSliderProps = {
  /** Mínimo, máximo, paso y valor son enteros guardados como texto: nunca `float`. */
  min: string;
  max: string;
  paso: string;
  moneda: string;
  valor: string;
  atajos: AtajoDePresupuesto[];
  onCambio: (valor: string) => void;
  /** Montos que se admiten al escribirlos. Si no se pasan, se usa el rango del deslizador (min y max). */
  minimoAdmitido?: string;
  maximoAdmitido?: string;
  /**
   * Versión de las pantallas de inicio y de armado: ocupa todo el ancho y la pregunta es el título de la tarjeta.
   * El campo para escribir el monto se muestra en ambas versiones.
   */
  enTarjeta?: boolean;
  /** Qué tipo de título lleva la pregunta en la versión de tarjeta. */
  pregunta?: string;
};

function mensajeDeRango(min: string, max: string) {
  return `Escribí un monto entre ${formatearMonto(min)} y ${formatearMonto(max)}.`;
}

/**
 * Interpreta lo que la persona escribió. Acepta el signo $, espacios y puntos de miles.
 * Un monto vacío, con letras, con decimales o fuera de rango no es válido: devuelve el
 * error y quien llama nunca avisa un valor inválido. La comparación usa enteros exactos.
 */
export function interpretarMonto(texto: string, min: string, max: string): { valor: string } | { error: string } {
  const limpio = texto.replace(/^\s*\$?\s*/, "").trim();
  const esEntero = /^\d+$/.test(limpio) || /^\d{1,3}(\.\d{3})+$/.test(limpio);
  const error = { error: mensajeDeRango(min, max) };
  if (!esEntero) return error;
  const monto = BigInt(limpio.replaceAll(".", ""));
  if (monto < BigInt(min) || monto > BigInt(max)) return error;
  return { valor: monto.toString() };
}

/** Avisa por `onCambio` solo si el monto es válido. Devuelve el mensaje de error, o `null`. */
export function escribirMonto(
  texto: string,
  { min, max, onCambio }: { min: string; max: string; onCambio: (valor: string) => void },
): string | null {
  const resultado = interpretarMonto(texto, min, max);
  if ("error" in resultado) return resultado.error;
  onCambio(resultado.valor);
  return null;
}

function porcentajeRelleno(valor: string, min: string, max: string) {
  const [v, a, b] = [Number(valor), Number(min), Number(max)];
  if (!(b > a)) return 0;
  return Math.min(100, Math.max(0, ((v - a) / (b - a)) * 100));
}

const PISTA =
  "h-2! min-h-0! w-full cursor-pointer appearance-none rounded-pill border-0! p-0! bg-[linear-gradient(to_right,var(--pino)_0_var(--fill),var(--papel-hundido)_var(--fill)_100%)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-foco " +
  "[&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-pino [&::-webkit-slider-thumb]:bg-papel-alto [&::-webkit-slider-thumb]:shadow-sombra-1 " +
  "[&::-moz-range-thumb]:size-[22px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-pino [&::-moz-range-thumb]:bg-papel-alto";

const ATAJO =
  "min-h-10 cursor-pointer rounded-pill border-[1.5px] border-solid border-linea-fuerte bg-transparent px-space-3 py-space-1 font-sans-uj text-chico text-tinta " +
  "aria-pressed:border-pino aria-pressed:bg-pino-suave " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

export function BudgetSlider({ min, max, minimoAdmitido = min, maximoAdmitido = max, paso, moneda, valor, atajos, onCambio, enTarjeta = false, pregunta = "¿Cuánto querés gastar como máximo?" }: BudgetSliderProps) {
  const id = useId();
  const idCampo = `${id}-campo`;
  const idError = `${id}-error`;
  // Mientras la persona escribe, el campo muestra lo escrito aunque todavía no sea válido.
  const [borrador, setBorrador] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function escribir(texto: string) {
    setBorrador(texto);
    setError(escribirMonto(texto, { min: minimoAdmitido, max: maximoAdmitido, onCambio }));
  }

  function terminar() {
    setBorrador(null);
    setError(null);
  }

  function elegir(nuevo: string) {
    terminar();
    onCambio(nuevo);
  }

  const relleno = { "--fill": `${porcentajeRelleno(valor, min, max)}%` } as CSSProperties;

  return (
    <div className={`grid gap-space-3 font-sans-uj text-tinta ${enTarjeta ? "" : "max-w-[480px]"}`}>
      {enTarjeta ? (
        <h2 className="m-0 font-display text-titular-m">
          <label htmlFor={id}>{pregunta}</label>
        </h2>
      ) : (
        <label htmlFor={id} className="text-cuerpo-fuerte">
          {pregunta}
        </label>
      )}
      <div className="font-display text-titular-l" aria-hidden="true">
        {formatearMonto(valor)}
        <small className="ml-space-2 font-sans-uj text-cuerpo-fuerte text-tinta-suave">{moneda}</small>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => elegir(e.target.value)}
        aria-valuetext={`${formatearMonto(valor)} ${moneda}`}
        className={PISTA}
        style={relleno}
      />
      <div className="flex justify-between text-chico text-tinta-suave">
        <span>{formatearMonto(min)}</span>
        <span>{formatearMonto(max)}</span>
      </div>
      <div className="flex flex-wrap gap-space-2">
        {atajos.map((atajo) => (
          <button key={atajo.valor} type="button" aria-pressed={atajo.valor === valor} onClick={() => elegir(atajo.valor)} className={ATAJO}>
            {atajo.texto}
          </button>
        ))}
      </div>
      <div className="grid max-w-[420px] gap-space-1">
        <label htmlFor={idCampo} className="text-chico text-tinta-suave">
          Escribí el monto
        </label>
        <input
          id={idCampo}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={borrador ?? valor}
          onChange={(e) => escribir(e.target.value)}
          onBlur={terminar}
          aria-invalid={error !== null}
          aria-describedby={error ? idError : undefined}
          className="min-h-12 w-full rounded-sm border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-4 font-sans-uj text-cuerpo text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        />
        <p id={idError} aria-live="polite" className="m-0 min-h-5 text-chico text-no-encaja">
          {error}
        </p>
      </div>
    </div>
  );
}
