import { Box, Check, CircleHelp, CircuitBoard, Cpu, Fan, HardDrive, Minus, MemoryStick, Monitor, PlugZap, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { towerCategories, towerKeys, type CategoryStatus, type Tower, type TowerCategory } from "../lib/towers";
import { Button } from "./uj/button";
import { RemoteProductName } from "./remote-product-selector";

const ICONOS: Record<TowerCategory, LucideIcon> = { cpu: Cpu, motherboard: CircuitBoard, ram: MemoryStick, gpu: Monitor, psu: PlugZap, case: Box, storage: HardDrive, cooler: Fan, fan: Wind };
const PARA_QUE_SIRVE: Record<TowerCategory, string> = {
  cpu: "El cerebro: hace todas las cuentas.", motherboard: "Donde se conecta todo lo demás.", ram: "Lo que tu PC puede tener abierto a la vez.",
  gpu: "Dibuja la imagen. Clave para jugar.", psu: "Le da energía a todo.", case: "La caja donde va todo.",
  storage: "Donde se guardan tus archivos y juegos.", cooler: "Mantiene fresco el procesador.", fan: "Mueven el aire dentro de la caja.",
};

/** Id del control de estado de cada categoría en el editor de la PC. */
export const towerStatusId = (category: TowerCategory) => `tower-status-${category}`;

/** Lleva el foco al control de estado de la categoría. Devuelve false si el editor todavía no lo muestra. */
export function focusTowerCategory(category: TowerCategory, doc: Pick<Document, "getElementById"> = document): boolean {
  const control = doc.getElementById(towerStatusId(category));
  if (!control) return false;
  control.focus();
  return true;
}

/** La memoria se cuenta en módulos y nunca se suma una capacidad total. */
export function quantityLabel(category: TowerCategory, quantity: number): string {
  if (category === "ram") return `Cantidad explícita: ${quantity} ${quantity === 1 ? "módulo" : "módulos"}; capacidad total no calculada`;
  return `Cantidad explícita: ${quantity} ${quantity === 1 ? "unidad" : "unidades"}`;
}

const ACCION: Record<CategoryStatus, string> = { present: "Cambiar", absent: "Cambiar", unknown: "Completar" };
const TARJETA = "grid min-w-0 content-start gap-space-3 rounded-md p-space-4 font-sans-uj text-tinta [&_h3]:m-0 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:leading-6";
const ESTILO: Record<CategoryStatus, string> = {
  present: "border border-solid border-linea bg-papel-alto",
  absent: "border-[1.5px] border-dashed border-linea-fuerte bg-transparent",
  unknown: "border border-solid border-revisar bg-papel-alto shadow-[0_0_0_1px_var(--revisar)]",
};
const ICONO: Record<CategoryStatus, string> = { present: "bg-pino-suave text-pino", absent: "bg-papel-hundido text-tinta-suave", unknown: "bg-revisar-fondo text-revisar" };

function State({ status }: { status: CategoryStatus }) {
  if (status === "unknown") return <span className="inline-flex min-w-0 items-center gap-space-1 rounded-pill bg-revisar-fondo py-[6px] pr-space-3 pl-[10px] text-etiqueta text-revisar"><CircleHelp aria-hidden="true" className="size-4 flex-none" strokeWidth={2.25} />No sé / por confirmar</span>;
  if (status === "absent") return <span className="inline-flex min-w-0 items-center gap-space-1 text-chico font-semibold text-tinta-suave"><Minus aria-hidden="true" className="size-4 flex-none" strokeWidth={2.25} />No tengo (declarado)</span>;
  return <span className="inline-flex min-w-0 items-center gap-space-1 text-chico font-semibold text-tinta-suave"><Check aria-hidden="true" className="size-4 flex-none text-pino" strokeWidth={2.25} />Presente</span>;
}

export default function TowerInventory({ pc, onEditCategory }: { pc: Tower; onEditCategory?: (category: TowerCategory) => void }) {
  return <div className="grid grid-cols-1 gap-space-3 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">{towerKeys.map(category => {
    const status = pc.category_status[category], lines = pc.lines.filter(line => line.category === category), Icono = ICONOS[category];
    return <article key={category} data-estado={status} aria-label={towerCategories[category]} className={`${TARJETA} ${ESTILO[status]}`}>
      <div className="flex items-center gap-space-3"><span className={`grid size-11 flex-none place-items-center rounded-sm ${ICONO[status]}`}><Icono aria-hidden="true" className="size-6" strokeWidth={1.5} /></span><div className="min-w-0"><h3>{towerCategories[category]}</h3><div className="text-chico text-tinta-suave">{PARA_QUE_SIRVE[category]}</div></div></div>
      {lines.length ? <ul className="m-0 grid list-none gap-space-2 p-0">{lines.map((line, index) => <li key={line.line_id ?? index} className="grid gap-[2px] rounded-sm bg-papel px-space-3 py-space-2">{line.component_id ? <RemoteProductName id={line.component_id} category={category} compact /> : <b className="font-semibold [overflow-wrap:anywhere]">{line.declared_model}</b>}{!line.component_id && <small className="text-chico text-tinta-suave">Modelo escrito por vos, sin verificar</small>}<small className="text-chico text-tinta-suave">{quantityLabel(category, line.quantity)}</small></li>)}</ul>
        : <p className="m-0 text-chico text-tinta-suave">{status === "absent" ? "Dijiste que no tenés esta pieza." : status === "unknown" ? "Todavía no sabemos qué tenés acá." : "Pieza por identificar."}</p>}
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-space-2 gap-y-space-1"><State status={status} />{onEditCategory && <span className="ml-auto flex-none whitespace-nowrap [&>button]:whitespace-nowrap [&>button]:shrink-0"><Button peso="quieto" data-focus-target={towerStatusId(category)} aria-label={`${ACCION[status]} ${towerCategories[category]}`} onClick={() => onEditCategory(category)}>{ACCION[status]}</Button></span>}</div>
    </article>;
  })}</div>;
}
