import { IconoDeCategoria } from "./part-card";

/** Las nueve categorías y su orden: única fuente para toda la interfaz. */
export const CATEGORIAS_PC = [
  { clave: "cpu", etiqueta: "Procesador" },
  { clave: "motherboard", etiqueta: "Placa madre" },
  { clave: "ram", etiqueta: "Memoria" },
  { clave: "gpu", etiqueta: "Placa de video" },
  { clave: "psu", etiqueta: "Fuente" },
  { clave: "case", etiqueta: "Gabinete" },
  { clave: "storage", etiqueta: "Almacenamiento" },
  { clave: "cooler", etiqueta: "Cooler" },
  { clave: "fan", etiqueta: "Ventiladores" },
] as const;

export type ClaveCategoriaPc = (typeof CATEGORIAS_PC)[number]["clave"];

export type PiezaDeLaPc = {
  nombre: string;
  /** La pieza está, pero falta un dato para poder decir si encaja. */
  enDuda?: boolean;
  /** Qué dato falta, dicho en palabras de uso cotidiano: «la velocidad». */
  falta?: string;
};

export type PcSlotsProps = {
  /** Categoría que no viene = casillero vacío. */
  piezas: Partial<Record<ClaveCategoriaPc, PiezaDeLaPc>>;
  hrefAgregar: (categoria: ClaveCategoriaPc) => string;
};

const CASILLERO =
  "grid h-full min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-space-3 rounded-md p-space-3 font-sans-uj text-tinta";
const CON_FOCO = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
const ICONO = "grid size-10 place-items-center rounded-sm";

export function PcSlots({ piezas, hrefAgregar }: PcSlotsProps) {
  return (
    <ul className="m-0 grid max-w-[720px] list-none grid-cols-1 gap-space-3 p-0 min-[720px]:grid-cols-3">
      {CATEGORIAS_PC.map(({ clave, etiqueta }) => {
        const pieza = piezas[clave];
        const contenido = (icono: string, nombre: string, nombreClase: string) => (
          <>
            <span className={`${ICONO} ${icono}`}>
              <IconoDeCategoria categoria={etiqueta} tamano="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-etiqueta text-tinta-suave">{etiqueta}</span>
              <span className={`block text-[15px] font-semibold leading-5 ${nombreClase}`}>{nombre}</span>
            </span>
          </>
        );

        if (!pieza) {
          return (
            <li key={clave} className="min-w-0">
              <a
                href={hrefAgregar(clave)}
                className={`${CASILLERO} ${CON_FOCO} border-[1.5px] border-dashed border-linea-fuerte bg-transparent no-underline`}
              >
                {contenido("bg-papel-hundido text-tinta-suave", "Agregar", "truncate text-pino")}
              </a>
            </li>
          );
        }

        // Un dato faltante activa «en duda» aunque no venga `enDuda`: desconocido nunca es «cargada».
        const falta = pieza.falta?.trim();
        const enDuda = Boolean(pieza.enDuda) || Boolean(falta);
        const nombre = enDuda ? `${pieza.nombre} · falta ${falta || "un dato"}` : pieza.nombre;
        return (
          <li key={clave} className="min-w-0">
            <div className={`${CASILLERO} border border-solid border-linea bg-papel-alto`}>
              {enDuda
                ? contenido("bg-revisar-fondo text-revisar", nombre, "break-words")
                : contenido("bg-pino-suave text-pino", nombre, "truncate")}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
