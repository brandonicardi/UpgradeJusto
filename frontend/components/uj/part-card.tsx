import { Box, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Monitor, Package, PlugZap, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PriceTag, type PriceTagProps } from "./price-tag";
import { Verdict } from "./verdict";

const ICONOS: Record<string, LucideIcon> = {
  procesador: Cpu,
  "placa madre": CircuitBoard,
  memoria: MemoryStick,
  "placa de video": Monitor,
  fuente: PlugZap,
  gabinete: Box,
  almacenamiento: HardDrive,
  cooler: Fan,
  ventiladores: Wind,
};

function IconoDeCategoria({ categoria }: { categoria: string }) {
  const clave = categoria.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  const Icono = Object.hasOwn(ICONOS, clave) ? ICONOS[clave] : Package;
  return <Icono aria-hidden="true" className="size-[30px]" strokeWidth={1.5} />;
}

export type PartCardProps = {
  categoria: string;
  beneficio: string;
  modelo: string;
  /** Foto real de la pieza. Sin foto se muestra el ícono de la categoría. */
  foto?: string | null;
  precio?: Omit<PriceTagProps, "compacto">;
  /** Estado que devuelve el motor. Si no viene, la tarjeta no muestra veredicto. */
  veredicto?: string | null;
  href?: string;
};

const FOCO_DE_LA_TARJETA =
  "has-[[data-cubre]:focus-visible]:outline-2 has-[[data-cubre]:focus-visible]:outline-offset-2 has-[[data-cubre]:focus-visible]:outline-foco";

export function PartCard({ categoria, beneficio, modelo, foto, precio, veredicto, href }: PartCardProps) {
  return (
    <article
      className={`relative grid max-w-[560px] grid-cols-[64px_minmax(0,1fr)] items-center gap-space-4 rounded-md border border-solid border-linea bg-papel-alto p-space-4 font-sans-uj text-tinta shadow-sombra-1 min-[600px]:grid-cols-[64px_minmax(0,1fr)_auto] ${FOCO_DE_LA_TARJETA}`}
    >
      <div className="col-start-2 row-start-1 min-w-0">
        <div className="text-etiqueta text-tinta-suave">{categoria}</div>
        <div className="mt-[2px] text-cuerpo-fuerte">
          {href ? (
            <a
              href={href}
              data-cubre=""
              className="text-tinta! no-underline outline-none after:absolute after:inset-0 after:content-['']"
            >
              {beneficio}
            </a>
          ) : (
            beneficio
          )}
        </div>
        <div className="text-chico text-tinta-suave">{modelo}</div>
      </div>
      <div className="col-start-1 row-start-1 grid size-16 place-items-center overflow-hidden rounded-sm bg-papel-hundido text-tinta-suave">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={modelo} className="size-full object-contain" />
        ) : (
          <IconoDeCategoria categoria={categoria} />
        )}
      </div>
      <div className="col-start-2 row-start-2 grid justify-items-start gap-space-2 min-[600px]:col-start-3 min-[600px]:row-start-1 min-[600px]:justify-items-end min-[600px]:text-right">
        <PriceTag {...precio} compacto />
        {veredicto !== undefined && <Verdict estado={veredicto} />}
      </div>
    </article>
  );
}
