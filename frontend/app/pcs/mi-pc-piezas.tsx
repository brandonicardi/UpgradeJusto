"use client";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Box, Check, CircleHelp, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Monitor, PlugZap, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Verdict } from "../../components/uj/verdict";
import { remoteCatalog, type TowerComponent } from "../../lib/tower-catalog";
import { detalleDePieza, estadoDeTarjeta, faltaDeLaTarjeta, piezas, tieneDatosTecnicos, type EstadoDatosTecnicos } from "../../lib/mi-pc";
import { type CategoryStatus, type TowerCategory, type TowerLine } from "../../lib/towers";
import { towerStatusId } from "../../components/tower-inventory";

const ICONOS: Record<TowerCategory, LucideIcon> = { cpu: Cpu, motherboard: CircuitBoard, ram: MemoryStick, gpu: Monitor, psu: PlugZap, case: Box, storage: HardDrive, cooler: Fan, fan: Wind };
export type VistaDeLaPc = { category_status: Record<TowerCategory, CategoryStatus>; lines: TowerLine[] };

type Ficha = { parte: TowerComponent | null; fallo: boolean };
// Caché por component_id: una sola consulta por pieza para todas las tarjetas y el detalle.
const fichas = new Map<string, Ficha>();
const enCurso = new Map<string, Promise<void>>();

function pedirFicha(id: string) {
  const hecha = enCurso.get(id);
  if (hecha) return hecha;
  const peticion = remoteCatalog<TowerComponent>(`/${encodeURIComponent(id)}`)
    .then(parte => { fichas.set(id, { parte, fallo: false }); })
    .catch(() => { fichas.set(id, { parte: null, fallo: true }); })
    .finally(() => { enCurso.delete(id); });
  enCurso.set(id, peticion);
  return peticion;
}

/** Pide el detalle de cada pieza sin bloquear la pantalla y vuelve a pintar cuando llega. */
function useFichas(ids: string[]) {
  const clave = ids.join("|"), [, setVersion] = useState(0);
  useEffect(() => {
    let activo = true;
    for (const id of clave ? clave.split("|") : []) {
      if (fichas.has(id)) continue;
      void pedirFicha(id).then(() => { if (activo) setVersion(version => version + 1); });
    }
    return () => { activo = false; };
  }, [clave]);
}

function estadoDeDatos(id: string): EstadoDatosTecnicos {
  const ficha = fichas.get(id);
  if (!ficha) return "cargando";
  if (ficha.fallo || !ficha.parte) return "error";
  return tieneDatosTecnicos(ficha.parte.attributes) ? "con_datos" : "sin_datos";
}

/** Nombre y detalle de una pieza elegida del catálogo. Si el catálogo no responde, lo dice sin inventar otra pieza. */
function PiezaDelCatalogo({ line, category }: { line: TowerLine; category: TowerCategory }) {
  const id = line.component_id!, ficha = fichas.get(id);
  const detalle = ficha?.parte?.id === id ? detalleDePieza(category, ficha.parte.attributes, line.quantity) : null;
  return <><b>{ficha?.parte?.id === id ? ficha.parte.name : ficha?.fallo ? "No pudimos cargar el nombre de esta pieza" : "Buscando la pieza…"}</b>{detalle && <small>{detalle}</small>}</>;
}

function Modelo({ category, lines, falta }: { category: TowerCategory; lines: TowerLine[]; falta: string | null }) {
  return <div className="pcs-part-model">
    {lines.map((line, index) => <div key={line.line_id ?? index} className="pcs-part-line">
      {line.component_id ? <PiezaDelCatalogo line={line} category={category} /> : <><b>{line.declared_model}</b>{line.quantity > 1 && <small>{category === "ram" ? `${line.quantity} módulos` : `${line.quantity} unidades`}</small>}</>}
    </div>)}
    {falta && <small className="pcs-part-missing">{falta}</small>}
  </div>;
}

function TarjetaDePieza({ category, status, lines, onEditar }: { category: TowerCategory; status: CategoryStatus; lines: TowerLine[]; onEditar?: (category: TowerCategory) => void }) {
  const Icono = ICONOS[category], { nombre, paraQue } = piezas[category];
  useFichas(lines.flatMap(line => line.component_id ? [line.component_id] : []));
  const datos = lines.map(line => line.component_id ? estadoDeDatos(line.component_id) : "con_datos" as EstadoDatosTecnicos);
  const estado = estadoDeTarjeta(status, lines, datos), falta = estado === "vacia" ? null : faltaDeLaTarjeta(lines, datos);
  const accion = estado === "completa" ? "Cambiar" : estado === "revisar" ? "Completar" : estado === "sin_datos" ? "Ver por qué" : estado === "cargando" ? "Ver" : "Agregar";
  return <article aria-label={nombre} data-estado={estado} className={`pcs-part${estado === "revisar" ? " is-q" : ""}${estado === "sin_datos" ? " is-sin-datos" : ""}${estado === "vacia" ? " is-empty" : ""}`}>
    <div className="pcs-part-top"><span className="pcs-part-icon"><Icono aria-hidden="true" strokeWidth={1.5} /></span><div><div className="pcs-part-kind">{nombre}</div><div className="pcs-part-what">{paraQue}</div></div></div>
    {estado === "vacia" ? <div className="pcs-part-model"><small>{status === "absent" ? "Dijiste que no la tenés" : "Sin cargar"}</small></div> : <Modelo category={category} lines={lines} falta={falta} />}
    <div className="pcs-part-foot">
      {estado === "completa" ? <span className="pcs-saved"><Check aria-hidden="true" strokeWidth={2.25} />Completo</span>
        : estado === "revisar" ? <Verdict estado="requiere_verificacion" />
          : estado === "sin_datos" ? <span className="pcs-saved pcs-saved-missing"><CircleHelp aria-hidden="true" strokeWidth={2.25} />Sin datos técnicos</span>
            : estado === "cargando" ? <span className="pcs-saved">Revisando datos…</span>
              : <span />}
      {onEditar && <button type="button" className="pcs-quiet" data-focus-target={towerStatusId(category)} aria-label={`${accion} ${nombre.toLowerCase()}`} onClick={() => onEditar(category)}>{accion}</button>}
    </div>
  </article>;
}

/** Las nueve piezas. Si se pasa `editor`, se abre dentro de la grilla, justo debajo de la pieza que se está editando. */
export default function PiezasDeLaPc({ pc, onEditar, editando, editor }: { pc: VistaDeLaPc; onEditar?: (category: TowerCategory) => void; editando: TowerCategory | null; editor: ReactNode }) {
  return <div className="pcs-parts">{(Object.keys(piezas) as TowerCategory[]).map(category => <Fragment key={category}>
    <TarjetaDePieza category={category} status={pc.category_status[category]} lines={pc.lines.filter(line => line.category === category)} onEditar={onEditar} />
    {editando === category && editor}
  </Fragment>)}</div>;
}
