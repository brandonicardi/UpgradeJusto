import type { ReactNode } from "react";
import { Check, CircleHelp, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NoticeTono = "encaja" | "revisar" | "no" | "info";

type Presentacion = { Icono: LucideIcon; fondo: string; acento: string };

const TONOS: Record<NoticeTono, Presentacion> = {
  encaja: { Icono: Check, fondo: "bg-encaja-fondo", acento: "text-encaja" },
  revisar: { Icono: CircleHelp, fondo: "bg-revisar-fondo", acento: "text-revisar" },
  no: { Icono: X, fondo: "bg-no-encaja-fondo", acento: "text-no-encaja" },
  info: { Icono: Info, fondo: "bg-papel-hundido", acento: "text-tinta" },
};

export type NoticeProps = {
  tono: NoticeTono;
  /** La conclusión: responde «¿y entonces?». */
  titulo: ReactNode;
  /** El motivo y qué hacer después. */
  children?: ReactNode;
};

export function Notice({ tono, titulo, children }: NoticeProps) {
  const { Icono, fondo, acento } = TONOS[tono];
  return (
    <div
      role={tono === "no" ? "alert" : "status"}
      className={`grid max-w-[560px] grid-cols-[auto_minmax(0,1fr)] gap-space-3 rounded-md px-space-5 py-space-4 font-sans-uj text-tinta ${fondo}`}
    >
      <Icono aria-hidden="true" className={`mt-[2px] size-5 flex-none ${acento}`} strokeWidth={2.25} />
      <div>
        <strong className={`block text-cuerpo-fuerte font-bold ${acento}`}>{titulo}</strong>
        {children && <div className="m-0 mt-[2px] text-cuerpo text-tinta">{children}</div>}
      </div>
    </div>
  );
}
