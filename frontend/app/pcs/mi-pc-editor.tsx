"use client";
import { useEffect, useId, useRef, useState } from "react";
import RemoteProductSelector from "../../components/remote-product-selector";
import { Button } from "../../components/uj/button";
import { Field } from "../../components/uj/field";
import { piezas } from "../../lib/mi-pc";
import { towerStatusId } from "../../components/tower-inventory";
import type { CategoryStatus, TowerCategory, TowerLine } from "../../lib/towers";

export type CambioDePieza = { status: CategoryStatus; lines: TowerLine[] };

const limites: Record<TowerCategory, [number, number]> = { cpu: [1, 1], motherboard: [1, 1], ram: [4, 16], gpu: [1, 1], psu: [1, 1], case: [1, 1], storage: [16, 16], cooler: [1, 1], fan: [8, 32] };
const unidad = (category: TowerCategory, plural: boolean) => category === "ram" ? (plural ? "módulos" : "módulo") : category === "fan" ? (plural ? "ventiladores" : "ventilador") : (plural ? "unidades" : "unidad");

const comoAveriguarlo: Partial<Record<TowerCategory, string[]>> = {
  motherboard: ["Mirá la factura o el mensaje de quien te armó la PC.", "Buscá el modelo exacto de la placa en la caja, la factura o la página del fabricante.", "Si no lo encontrás, elegí «Todavía no lo sé»: no lo adivinamos."],
};
const pasosGenerales = ["Mirá la factura o el mensaje de quien te armó la PC.", "En Windows, abrí el Administrador de tareas (Ctrl + Shift + Esc) y entrá a Rendimiento.", "Escribí lo que veas. Si no lo encontrás, elegí «Todavía no lo sé»."];

type Props = { category: TowerCategory; inicial: CambioDePieza; ocupado: boolean; error: string; textoDeGuardar?: string; onGuardar: (cambio: CambioDePieza) => void; onCancelar: () => void };

/** Editor de una sola pieza: se abre dentro de la grilla, como en la maqueta de Mi PC. */
export default function EditorDePieza({ category, inicial, ocupado, error, textoDeGuardar = "Guardar cambios", onGuardar, onCancelar }: Props) {
  const uid = useId(), { nombre, articulo } = piezas[category], esPlaca = category === "motherboard";
  const [status, setStatus] = useState<CategoryStatus>(inicial.status), [lines, setLines] = useState<TowerLine[]>(inicial.lines);
  const [maxLineas] = limites[category];
  const cambiarLinea = (index: number, parche: Partial<TowerLine>) => {
    setLines(lines.map((line, i) => i === index ? { ...line, ...parche } : line));
  };
  const elegirEstado = (siguiente: CategoryStatus) => {
    setStatus(siguiente);
    if (siguiente !== "present") setLines([]);
    else if (!lines.length) setLines([{ line_id: null, category, component_id: null, declared_model: "", quantity: 1 }]);
  };
  const pasos = comoAveriguarlo[category] ?? pasosGenerales;
  // Al abrirse, el foco va al dato que se viene a completar: el estado de la pieza.
  const formulario = useRef<HTMLFormElement | null>(null);
  useEffect(() => { formulario.current?.querySelector<HTMLElement>("select")?.focus(); }, []);
  return <form ref={formulario} className="pcs-editor" aria-labelledby={`${uid}-titulo`} onSubmit={event => { event.preventDefault(); onGuardar({ status, lines }); }}>
    <div className="pcs-editor-head">
      <div><h2 id={`${uid}-titulo`}>{esPlaca ? "Completá tu placa madre" : `Contanos de ${articulo}`}</h2>
        <p>{esPlaca ? "Elegí el modelo exacto de tu placa del catálogo o escribilo. Con el modelo podemos revisar si tu procesador entra en ella." : "Elegí la pieza del catálogo o escribí el modelo. Lo que no sepas, dejalo así: no lo adivinamos."}</p></div>
      <Button peso="quieto" chico onClick={onCancelar}>Cerrar</Button>
    </div>
    <div className="pcs-fields">
      <div className="pcs-field">
        <label htmlFor={towerStatusId(category)}>¿Qué tenés de esto?</label>
        <select id={towerStatusId(category)} value={status} disabled={ocupado} onChange={event => elegirEstado(event.target.value as CategoryStatus)}>
          <option value="unknown">Todavía no lo sé</option><option value="absent">No tengo esta pieza</option><option value="present">Tengo esta pieza</option>
        </select>
        <span className="pcs-help">«No lo sé» no es lo mismo que «No tengo».</span>
      </div>
    </div>
    {status === "present" && lines.map((line, index) => {
      const eleccion = <>
        <div className="pcs-field"><label htmlFor={`${uid}-modo-${index}`}>¿Cómo la querés indicar?</label>
          <select id={`${uid}-modo-${index}`} value={line.declared_model !== null ? "escrito" : "catalogo"} onChange={event => cambiarLinea(index, event.target.value === "escrito" ? { component_id: null, declared_model: "" } : { component_id: null, declared_model: null })}>
            <option value="catalogo">Elegirla del catálogo</option><option value="escrito">Escribir el modelo</option></select></div>
        {line.declared_model !== null
          ? <Field etiqueta="Modelo" maxLength={200} required value={line.declared_model} onChange={event => cambiarLinea(index, { declared_model: event.target.value })} ayuda="Si la escribís vos, no podemos comprobar si encaja: queda con «Falta un dato»." />
          : <RemoteProductSelector category={category} value={line.component_id} onChange={id => cambiarLinea(index, { component_id: id, declared_model: null })} />}
      </>;
      return <fieldset key={index} className="pcs-line" disabled={ocupado}><legend>{lines.length > 1 ? `${nombre} ${index + 1}` : nombre}</legend>
        {/* Una pieza ya elegida no se vuelve a buscar: el selector queda a un clic, para cambiarla. */}
        {line.component_id ? <details className="pcs-howto"><summary>Cambiar por otra pieza</summary><div className="pcs-line-choice">{eleccion}</div></details> : eleccion}
      {limites[category][1] > 1 && <Field etiqueta={`Cantidad de ${unidad(category, true)}`} type="number" min={1} max={limites[category][1]} step={1} required value={Number.isNaN(line.quantity) ? "" : line.quantity} onChange={event => cambiarLinea(index, { quantity: event.target.valueAsNumber })} ayuda={category === "ram" ? "Contá los módulos (los palitos), no los GB." : undefined} />}
      {lines.length > 1 && <Button peso="quieto" chico onClick={() => setLines(lines.filter((_, i) => i !== index))}>Quitar esta línea</Button>}
      </fieldset>;
    })}
    {status === "present" && lines.length < maxLineas && <div><Button peso="secundario" chico onClick={() => setLines([...lines, { line_id: null, category, component_id: null, declared_model: null, quantity: 1 }])}>Agregar otra línea de {nombre.toLowerCase()}</Button></div>}
    <details className="pcs-howto"><summary>¿Cómo lo averiguo sin abrir la PC?</summary><ol>{pasos.map(paso => <li key={paso}>{paso}</li>)}</ol></details>
    {error && <p role="alert" className="pcs-error">{error}</p>}
    <div className="pcs-editor-foot">
      <span className="pcs-help">Si elegís «No lo sé», lo dejamos pendiente: no adivinamos ni lo damos por bueno.</span>
      <div className="pcs-editor-actions"><Button peso="secundario" chico onClick={onCancelar}>Cancelar</Button><Button peso="principal" type="submit" disabled={ocupado}>{textoDeGuardar}</Button></div>
    </div>
  </form>;
}
