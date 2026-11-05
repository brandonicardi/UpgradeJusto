import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";

type Comunes = {
  /** Siempre visible; el placeholder no la reemplaza. */
  etiqueta: ReactNode;
  ayuda?: ReactNode;
  /** Dice cómo arreglarlo, no qué hizo mal la persona. */
  error?: ReactNode;
};

export type FieldProps = Comunes &
  (
    | ({ multilinea?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, keyof Comunes | "className">)
    | ({ multilinea: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof Comunes | "className">)
  );

// Los selectores globales de `input` y `textarea` en globals.css no están en una capa de Tailwind:
// por eso lo que pisan (alto, borde, radio, relleno, fondo, color, ancho, foco) va con `!`.
const CAMPO =
  "block w-full! min-h-12! rounded-sm! border-[1.5px]! border-solid! bg-papel-alto! px-space-4! py-space-3! text-tinta! " +
  "text-cuerpo! font-sans-uj placeholder:text-tinta-suave " +
  "focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-foco!";

export function Field(props: FieldProps) {
  const { etiqueta, ayuda, error, multilinea, id: idPropio, ...resto } = props;
  const base = useId();
  const id = idPropio ?? `campo-${base}`;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const describedby =
    [(resto as { "aria-describedby"?: string })["aria-describedby"], idAyuda, idError].filter(Boolean).join(" ") || undefined;

  const comunes = {
    id,
    "aria-describedby": describedby,
    "aria-invalid": error ? true : undefined,
    className: `${CAMPO} ${error ? "border-no-encaja!" : "border-linea-fuerte!"}`,
  };

  return (
    <div className="grid w-full max-w-[420px] content-start gap-space-2 font-sans-uj text-tinta">
      <label htmlFor={id} className="text-cuerpo-fuerte">
        {etiqueta}
      </label>
      {multilinea ? (
        <textarea rows={5} {...(resto as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...comunes} />
      ) : (
        <input {...(resto as InputHTMLAttributes<HTMLInputElement>)} {...comunes} />
      )}
      {ayuda && (
        <p id={idAyuda} className="m-0 text-chico text-tinta-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="m-0 flex items-center gap-space-1 text-chico text-no-encaja">
          <X aria-hidden="true" className="size-4 flex-none" strokeWidth={2.25} />
          {error}
        </p>
      )}
    </div>
  );
}
