"use client";

import type { ComponentProps, ReactNode } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "./button";
import { Verdict } from "./verdict";

export type ChatBubbleProps = {
  autor: "persona" | "asistente";
  /** Ya armado: el asistente recibe Markdown renderizado (ver `components/markdown.tsx`). */
  children: ReactNode;
  /** Estado que devolvió el motor. El asistente explica; este veredicto no lo decide él. */
  veredicto?: string | null;
};

const BURBUJA = "max-w-[85%] rounded-md px-space-4 py-space-3 font-sans-uj text-tinta";
const DE_PERSONA = `${BURBUJA} justify-self-end rounded-br-[4px] bg-pino-suave text-cuerpo`;
const DEL_ASISTENTE = `${BURBUJA} justify-self-start rounded-bl-[4px] border border-solid border-linea bg-papel-alto text-[16px] leading-[26px]`;

export function ChatBubble({ autor, children, veredicto }: ChatBubbleProps) {
  const esAsistente = autor === "asistente";
  return (
    <div className={esAsistente ? DEL_ASISTENTE : DE_PERSONA}>
      {esAsistente && (
        <div className="mb-space-1 flex items-center gap-space-2 text-etiqueta text-tinta-suave">
          <i aria-hidden="true" className="inline-block size-[18px] rounded-full bg-pino" />
          Asistente
        </div>
      )}
      {children}
      {veredicto !== undefined && (
        <div className="mt-space-2">
          <Verdict estado={veredicto} />
        </div>
      )}
    </div>
  );
}

const MAXIMO_DE_SUGERENCIAS = 4;

export type ChatSuggestionsProps = {
  /** Frases cortas en primera persona. Se muestran hasta cuatro. */
  sugerencias: string[];
  onElegir?: (sugerencia: string) => void;
};

export function ChatSuggestions({ sugerencias, onElegir }: ChatSuggestionsProps) {
  const visibles = sugerencias.slice(0, MAXIMO_DE_SUGERENCIAS);
  if (visibles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-space-2 font-sans-uj">
      {visibles.map((frase) => (
        <button
          key={frase}
          type="button"
          onClick={onElegir ? () => onElegir(frase) : undefined}
          className="min-h-9! cursor-pointer! rounded-pill! border-[1.5px]! border-solid! border-linea-fuerte! bg-transparent! px-space-3! py-space-1! text-left text-[14px]! leading-5! font-semibold! text-tinta! enabled:hover:border-tinta! hover:filter-none! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-foco!"
        >
          {frase}
        </button>
      ))}
    </div>
  );
}

export type ChatComposerProps = Omit<ComponentProps<"form">, "className" | "children"> & {
  placeholder?: string;
  disabled?: boolean;
};

export function ChatComposer({ placeholder = "Preguntá lo que quieras sobre tu PC", disabled, ...resto }: ChatComposerProps) {
  return (
    <form
      {...resto}
      className="flex items-center gap-space-2 rounded-pill border-[1.5px] border-solid border-linea-fuerte bg-papel-alto p-space-2 pl-space-4 font-sans-uj focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foco"
    >
      <input
        type="text"
        name="mensaje"
        autoComplete="off"
        aria-label="Mensaje"
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-0! w-auto! min-w-0 flex-1 rounded-none! border-0! bg-transparent! p-0! text-cuerpo! text-tinta! outline-none! placeholder:text-tinta-suave"
      />
      <Button peso="principal" chico type="submit" disabled={disabled} aria-label="Enviar" icono={<SendHorizontal className="size-4" strokeWidth={2.25} />} />
    </form>
  );
}
