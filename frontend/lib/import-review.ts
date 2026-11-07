// Paso «Revisá lo que entendimos» y resumen final de Agregar PC. Sólo ordena lo que ya devolvió la extracción
// y lo que la persona corrigió: no completa, no deduce y no decide compatibilidad.
import { piezas } from "./mi-pc";
import { towerKeys, type TowerCategory } from "./towers";
import type { TowerExtraction, TowerProposalDraft } from "./tower-extraction";

export type Marca = "leida" | "revisar" | "sin_dato";
export type FilaDeRevision = {
  category: TowerCategory; marca: Marca; citas: string[];
  /** Pregunta para la persona, o null si no hay nada que aclarar. */
  pregunta: string | null;
  /** Piezas del catálogo que podrían ser la que nombró; sólo si la extracción dudó. */
  candidatos: string[];
};

export const unidadesPorCategoria: Record<TowerCategory, { max: number; unidad: string; plural: string }> = {
  cpu: { max: 1, unidad: "unidad", plural: "unidades" }, motherboard: { max: 1, unidad: "unidad", plural: "unidades" },
  ram: { max: 16, unidad: "módulo", plural: "módulos" }, gpu: { max: 1, unidad: "unidad", plural: "unidades" },
  psu: { max: 1, unidad: "unidad", plural: "unidades" }, case: { max: 1, unidad: "unidad", plural: "unidades" },
  storage: { max: 16, unidad: "unidad", plural: "unidades" }, cooler: { max: 1, unidad: "unidad", plural: "unidades" },
  fan: { max: 32, unidad: "ventilador", plural: "ventiladores" },
};

const descripcion: Record<TowerCategory, string> = {
  cpu: "El cerebro de la PC", motherboard: "Donde se conecta todo", ram: "Para tener cosas abiertas", gpu: "La que dibuja los juegos", psu: "Le da energía a todo",
  case: "La caja que lo guarda todo", storage: "Donde guardás tus cosas", cooler: "Enfría el procesador", fan: "Mueven el aire de la caja",
};
export const descripcionDeFila = (category: TowerCategory) => descripcion[category];

/** Una fila por pieza, con la marca que corresponde al estado actual del borrador (se actualiza al corregir). */
export function filasDeRevision(preview: Pick<TowerExtraction, "evidence">, draft: TowerProposalDraft): FilaDeRevision[] {
  return towerKeys.map(category => {
    const lineas = draft.lines.filter(line => line.category === category);
    const evidencia = preview.evidence.find(item => item.category === category);
    const citas = [...new Set((evidencia?.lines ?? []).map(line => line.excerpt.trim()).filter(Boolean))];
    if (!lineas.length) return { category, marca: "sin_dato" as const, citas, pregunta: null, candidatos: [] };
    const dudosa = evidencia?.lines.find(line => line.resolution === "needs_review" && line.candidate_ids.length > 0);
    const sinCatalogo = lineas.some(line => !line.component_id);
    const sinCantidad = lineas.some(line => line.quantity === null);
    if (sinCatalogo && dudosa) return { category, marca: "revisar" as const, citas, pregunta: "Encontramos varios componentes que podrían ser. ¿Cuál es la tuya?", candidatos: dudosa.candidate_ids };
    if (sinCatalogo) return { category, marca: "revisar" as const, citas, pregunta: "No la encontramos en nuestro catálogo. La guardamos como la escribiste y no podemos comprobar si encaja.", candidatos: [] };
    if (sinCantidad) return { category, marca: "revisar" as const, citas, pregunta: `No encontramos cuántos ${unidadesPorCategoria[category].plural} son. Indicalo para poder guardar.`, candidatos: [] };
    return { category, marca: "leida" as const, citas, pregunta: null, candidatos: [] };
  });
}

export function conteoDeMarcas(filas: Pick<FilaDeRevision, "marca">[]) {
  return { leidas: filas.filter(fila => fila.marca === "leida").length, revisar: filas.filter(fila => fila.marca === "revisar").length, sinDato: filas.filter(fila => fila.marca === "sin_dato").length };
}

const lista = (nombres: string[]) => nombres.length < 2 ? nombres.join("") : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export type LineaDeResumen = { destacado: string; resto: string };
/** El resumen del paso 3, con lo que va a quedar guardado si la persona confirma. */
export function resumenParaGuardar(filas: Pick<FilaDeRevision, "category" | "marca">[], draft: Pick<TowerProposalDraft, "category_status">): LineaDeResumen[] {
  const nombres = (marca: Marca, absent = false) => filas.filter(fila => fila.marca === marca && (marca !== "sin_dato" || (draft.category_status[fila.category] === "absent") === absent)).map(fila => piezas[fila.category].nombre.toLowerCase());
  const completas = nombres("leida"), medias = nombres("revisar"), sinDato = nombres("sin_dato"), ausentes = nombres("sin_dato", true);
  const sinDatoReal = sinDato;
  const salida: LineaDeResumen[] = [];
  if (completas.length) salida.push({ destacado: plural(completas.length, "componente completo", "componentes completos"), resto: `: ${lista(completas)}.` });
  if (medias.length) salida.push({ destacado: plural(medias.length, "componente a medias", "componentes a medias"), resto: ` (${lista(medias)}). Les falta algún dato, y eso queda como «Falta un dato» hasta que lo completes.` });
  if (sinDatoReal.length) salida.push({ destacado: plural(sinDatoReal.length, "componente sin dato", "componentes sin dato"), resto: ` (${lista(sinDatoReal)}). Lo que falta queda como «Falta un dato» hasta que lo completes.` });
  if (ausentes.length) salida.push({ destacado: plural(ausentes.length, "componente que no tenés", "componentes que no tenés"), resto: ` (${lista(ausentes)}).` });
  if (medias.length || sinDatoReal.length) salida.push({ destacado: "", resto: "Mientras falten datos, algunas sugerencias van a decir «Falta un dato» en vez de «Encaja»." });
  return salida;
}

// Correcciones sobre el borrador. Siempre devuelven un borrador nuevo; nunca tocan lo que guardó el servidor.
// El contexto guardado se conserva tal cual: la BIOS ya no se pide para revisar ni para confirmar.
const otras = (draft: TowerProposalDraft, category: TowerCategory) => draft.lines.filter(line => line.category !== category);

/** Lo que la persona escribe en el campo de una pieza. Vacío = la pieza queda sin dato; no se adivina nada. */
export function escribirPieza(draft: TowerProposalDraft, category: TowerCategory, texto: string, n = 0): TowerProposalDraft {
  const propias = draft.lines.filter(line => line.category === category), objetivo = propias[n];
  if (!texto.trim()) {
    const quedan = propias.filter(line => line !== objetivo).length;
    return { ...draft, category_status: { ...draft.category_status, [category]: quedan ? "present" : "unknown" }, lines: draft.lines.filter(line => line !== objetivo) };
  }
  const category_status = { ...draft.category_status, [category]: "present" as const };
  if (!objetivo) return { ...draft, category_status, lines: [...draft.lines, { line_id: null, category, component_id: null, declared_model: texto, quantity: unidadesPorCategoria[category].max === 1 ? 1 : null }] };
  return { ...draft, category_status, lines: draft.lines.map(line => line === objetivo ? { ...line, component_id: null, declared_model: texto } : line) };
}

/** Elige una de las piezas que la extracción sugirió. `null` la vuelve a dejar como la escribió la persona. */
export function elegirCandidata(draft: TowerProposalDraft, category: TowerCategory, id: string | null, escrita: string, n = 0): TowerProposalDraft {
  const objetivo = draft.lines.filter(line => line.category === category)[n];
  if (!objetivo) return draft;
  const siguiente = id ? { ...objetivo, component_id: id, declared_model: null } : { ...objetivo, component_id: null, declared_model: escrita.trim() || objetivo.declared_model };
  return { ...draft, lines: draft.lines.map(line => line === objetivo ? siguiente : line) };
}

/** La persona tocó una sugerencia del catálogo. Un kit del catálogo cuenta como 1 porque su nombre lo dice. */
export function elegirSugerencia(draft: TowerProposalDraft, category: TowerCategory, parte: { id: string; name: string }, n = 0): TowerProposalDraft {
  const objetivo = draft.lines.filter(line => line.category === category)[n];
  const quantity = unidadesPorCategoria[category].max === 1 || /\(\d+\s*x\s*\d+\s*gb\)/i.test(parte.name) ? 1 : objetivo?.quantity ?? null;
  const elegida = { line_id: objetivo?.line_id ?? null, category, component_id: parte.id, declared_model: null, quantity };
  const lines = objetivo ? draft.lines.map(line => line === objetivo ? elegida : line) : [...draft.lines, elegida];
  return { ...draft, category_status: { ...draft.category_status, [category]: "present" as const }, lines };
}

export function cambiarCantidad(draft: TowerProposalDraft, category: TowerCategory, cantidad: number | null, n = 0): TowerProposalDraft {
  const objetivo = draft.lines.filter(line => line.category === category)[n];
  return objetivo ? { ...draft, lines: draft.lines.map(line => line === objetivo ? { ...line, quantity: cantidad } : line) } : draft;
}

/** «No lo sé» y «No la tengo» son cosas distintas: las dos dejan la pieza sin líneas. */
export function marcarSinPieza(draft: TowerProposalDraft, category: TowerCategory, estado: "unknown" | "absent"): TowerProposalDraft {
  return { ...draft, category_status: { ...draft.category_status, [category]: estado }, lines: otras(draft, category) };
}

export const textoDeEjemplo = "Hola! Te paso lo que tiene la compu:\nProcesador AMD Ryzen 5 5600\nPlaca madre B450M\n16gb de ram (2x8)\nPlaca de video GTX 1650 4GB\nFuente 550w\nDisco SSD Kingston 500gb\nGabinete Sentey";
