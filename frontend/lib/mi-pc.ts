// Presentación de Mi PC: traduce lo que devuelve la API a palabras para personas.
// Nada de esto decide compatibilidad ni inventa datos: si la API no lo dice, no se muestra.
import type { CategoryStatus, TowerCategory, TowerLine } from "./towers";
import type { TowerEvaluation } from "./tower-compatibility";

export const piezas: Record<TowerCategory, { nombre: string; paraQue: string; articulo: string }> = {
  cpu: { nombre: "Procesador", paraQue: "El cerebro: hace todas las cuentas.", articulo: "tu procesador" },
  motherboard: { nombre: "Placa madre", paraQue: "Donde se conecta todo lo demás.", articulo: "tu placa madre" },
  ram: { nombre: "Memoria", paraQue: "Lo que tu PC puede tener abierto a la vez.", articulo: "tu memoria" },
  gpu: { nombre: "Placa de video", paraQue: "Dibuja la imagen. Clave para jugar.", articulo: "tu placa de video" },
  psu: { nombre: "Fuente", paraQue: "Le da energía a todo.", articulo: "tu fuente" },
  case: { nombre: "Gabinete", paraQue: "La caja donde va todo.", articulo: "tu gabinete" },
  storage: { nombre: "Almacenamiento", paraQue: "Donde se guardan tus archivos y juegos.", articulo: "tu almacenamiento" },
  cooler: { nombre: "Cooler", paraQue: "Mantiene fresco el procesador.", articulo: "tu cooler" },
  fan: { nombre: "Ventiladores", paraQue: "Mueven el aire dentro de la caja.", articulo: "tus ventiladores" },
};

/** Piezas que definen si la PC está completa. El cooler y los ventiladores son opcionales. */
export const piezasEsenciales = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage"] as const;
export type PiezaEsencial = (typeof piezasEsenciales)[number];
export const piezasOpcionales = ["cooler", "fan"] as const;

type Datos = Record<string, unknown>;
const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : null);
const numero = (valor: unknown) => (typeof valor === "number" && Number.isFinite(valor) ? valor : null);
const cm = (mm: number) => `${(mm / 10).toLocaleString("es-AR", { maximumFractionDigits: 1 })} cm`;

/** Los datos técnicos viajan como texto JSON dentro de los atributos de la pieza; si no se pueden leer, no hay detalle. */
export function datosTecnicos(attributes: Record<string, unknown> | null | undefined): Datos {
  return { ...datosDeReferencia(attributes), ...datosDeFabricante(attributes) };
}

function datosDeFabricante(attributes: Record<string, unknown> | null | undefined): Datos {
  const crudo = attributes?.tower_stock_v1;
  try {
    const leido = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
    const datos = (leido as { data?: unknown } | null)?.data;
    return datos && typeof datos === "object" ? (datos as Datos) : {};
  } catch { return {}; }
}

/** Datos generales por familia de hardware; el dato del fabricante, si existe, siempre manda. */
export function datosDeReferencia(attributes: Record<string, unknown> | null | undefined): Datos {
  const crudo = attributes?.reference_facts;
  try {
    const leido = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
    return leido && typeof leido === "object" ? (leido as Datos) : {};
  } catch { return {}; }
}

/** El catálogo publica datos técnicos solo cuando trae `tower_stock_v1` con contenido. */
export function tieneDatosTecnicos(attributes: Record<string, unknown> | null | undefined): boolean {
  return Object.keys(datosTecnicos(attributes)).length > 0;
}

/** Una línea corta con lo que el catálogo sabe de la pieza. Sin dato, no inventa: devuelve null. */
export function detalleDePieza(category: TowerCategory, attributes: Record<string, unknown> | null | undefined, cantidad = 1): string | null {
  const d = datosTecnicos(attributes), partes: string[] = [];
  const agregar = (parte: string | null | false) => { if (parte) partes.push(parte); };
  if (category === "cpu") { agregar(texto(d.socket) && `zócalo ${texto(d.socket)}`); agregar(texto(d.memory_type) && `memoria ${texto(d.memory_type)}`); }
  if (category === "motherboard") { agregar(texto(d.socket) && `zócalo ${texto(d.socket)}`); agregar(texto(d.form_factor) && `formato ${texto(d.form_factor)}`); agregar(numero(d.slots) !== null && `${numero(d.slots)} lugares de memoria`); }
  if (category === "ram") { agregar(texto(d.memory_type)); agregar(numero(d.capacity_gb) !== null && `${numero(d.capacity_gb)} GB por módulo`); agregar(cantidad > 1 && `${cantidad} módulos`); }
  if (category === "gpu") { agregar(numero(d.length_mm) !== null && `${cm(numero(d.length_mm)!)} de largo`); agregar(numero(d.recommended_psu_w) !== null && `pide fuente de ${numero(d.recommended_psu_w)} W`); }
  if (category === "psu") { agregar(numero(d.continuous_power_w) !== null && `${numero(d.continuous_power_w)} W`); agregar(texto(d.form_factor) && `formato ${texto(d.form_factor)}`); }
  if (category === "case") agregar(numero(d.gpu_limit_mm) !== null && `Placas de video de hasta ${cm(numero(d.gpu_limit_mm)!)}`);
  if (category === "storage") { agregar(texto(d.storage_interface)); agregar(texto(d.storage_form) && `formato ${texto(d.storage_form)}`); agregar(cantidad > 1 && `${cantidad} unidades`); }
  if (category === "fan" && cantidad > 1) agregar(`${cantidad} ventiladores`);
  if (!partes.length) return null;
  const frase = partes.join(" · ");
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

export type EstadoDatosTecnicos = "con_datos" | "sin_datos" | "error" | "cargando";
export type EstadoDeTarjeta = "completa" | "revisar" | "sin_datos" | "cargando" | "vacia";
/**
 * `revisar` = la pieza está cargada pero no la identificamos en el catálogo.
 * `sin_datos` = está identificada, pero el catálogo no publica sus datos técnicos.
 * `vacia` = sin cargar. La BIOS no participa: no se pide ni bloquea.
 * Sin `datos` (contador de piezas) solo interesa la identificación.
 */
export function estadoDeTarjeta(status: CategoryStatus, lines: Pick<TowerLine, "component_id">[], datos?: EstadoDatosTecnicos[]): EstadoDeTarjeta {
  if (status !== "present" || !lines.length) return "vacia";
  if (lines.some(line => !line.component_id)) return "revisar";
  if (datos?.some(estado => estado === "sin_datos" || estado === "error")) return "sin_datos";
  if (datos?.some(estado => estado === "cargando")) return "cargando";
  return "completa";
}

/** Lo que impide dar la pieza por completa, en palabras para personas. */
export function faltaDeLaTarjeta(lines: Pick<TowerLine, "component_id">[], datos?: EstadoDatosTecnicos[]): string | null {
  if (lines.some(line => !line.component_id)) return "Modelo escrito por vos, sin verificar";
  if (datos?.some(estado => estado === "error")) return "No pudimos leer los datos técnicos";
  if (datos?.some(estado => estado === "sin_datos")) return "El catálogo todavía no tiene los datos técnicos de esta pieza";
  if (datos?.some(estado => estado === "cargando")) return "Revisando los datos del catálogo…";
  return null;
}

export type Carga = { cargadas: number; total: number; porConfirmar: number; porConfirmarTexto: string; etiqueta: string; opcionales: string; puntos: ("ok" | "q" | "e")[] };
/** Completitud de las siete piezas esenciales; refrigeración y ventiladores quedan aparte. */
export function cargaDeLaPc(pc: { category_status: Record<TowerCategory, CategoryStatus>; lines: TowerLine[] }): Carga {
  const puntos = piezasEsenciales.map(category => {
    const estado = estadoDeTarjeta(pc.category_status[category], pc.lines.filter(line => line.category === category));
    return estado === "completa" ? "ok" as const : estado === "revisar" ? "q" as const : "e" as const;
  });
  const total = piezasEsenciales.length, cargadas = puntos.filter(punto => punto !== "e").length, porConfirmar = puntos.filter(punto => punto === "q").length;
  const porConfirmarTexto = porConfirmar ? `${porConfirmar} ${porConfirmar === 1 ? "pieza" : "piezas"} por confirmar` : "Sin piezas por confirmar";
  return { cargadas, total, porConfirmar, porConfirmarTexto, etiqueta: `${cargadas} de ${total} piezas esenciales cargadas, ${porConfirmarTexto.toLowerCase()}`, opcionales: "Refrigeración y ventiladores: opcionales", puntos };
}

export const parDeEncaje: Record<string, string> = {
  T01: "Procesador y placa madre",
  T02: "Memoria y placa madre",
  T03: "Placa de video y placa madre",
  T04: "Placa de video y gabinete",
  T05: "Fuente y placa de video",
  T06: "Conexiones de la fuente",
  T07: "Placa madre, fuente y gabinete",
  T08: "Lugar para los discos",
  T09: "Refrigeración del procesador",
  T10: "Ventiladores",
  T11: "Identificación y presencia",
  T12: "Recursos compartidos y potencia",
};
export type EstadoDeEncaje = "compatible" | "incompatible" | "requiere_verificacion" | "no_evaluado";
export type FilaDeEncaje = { id: string; texto: string; estado: EstadoDeEncaje; motivo: string | null };

const campos = (valores: readonly unknown[] | null | undefined) => (valores ?? []).map(String);
const alguno = (lista: string[], ...sufijos: string[]) => lista.some(campo => sufijos.some(sufijo => campo === sufijo || campo.endsWith(`.${sufijo}`) || campo.startsWith(sufijo)));

/** Traduce los faltantes que emitió el servidor a una causa corta, sin agregar datos. */
export function causaDeFaltante(regla: string, faltantes: readonly unknown[] | null | undefined): string | null {
  const lista = campos(faltantes);
  if (!lista.length) return null;
  if (regla === "T01") return alguno(lista, "cpu_support", "socket") ? "faltan datos de compatibilidad del procesador con la placa" : "faltan datos técnicos del procesador o la placa";
  if (regla === "T02") {
    const placa = alguno(lista, "memory_type", "ram_slots", "max_total_gb", "max_module_gb", "module_type", "admitted_buffered");
    const memoria = alguno(lista, "ram.");
    return placa && memoria ? "faltan socket/memoria de la placa y datos de la memoria" : placa ? "faltan socket/memoria de la placa" : memoria ? "faltan datos de la memoria" : "faltan datos técnicos de la memoria o la placa";
  }
  if (regla === "T03") return "faltan datos de la conexión de la placa de video";
  if (regla === "T04") return "faltan medidas de la GPU y del gabinete";
  if (regla === "T05") return "faltan datos de potencia de la fuente y la placa de video";
  if (regla === "T06") return "faltan datos de los conectores de energía";
  if (regla === "T07") return "faltan formatos de la placa, la fuente y el gabinete";
  if (regla === "T08") {
    const placa = alguno(lista, "motherboard.tower_ports", "tower_ports");
    const discos = alguno(lista, "storage_interface", "storage_form", "storage_bays", "storage_power");
    return placa && discos ? "faltan los puertos de la placa y los datos de los discos" : placa ? "faltan los puertos de la placa para los discos" : discos ? "faltan datos de los discos" : "faltan datos técnicos del almacenamiento";
  }
  if (regla === "T11") {
    if (alguno(lista, "case.presence")) return "no se identificó el gabinete";
    if (alguno(lista, "gpu.absence_requires_documented_integrated_display_path")) return "no se identificó una salida de video";
    if (alguno(lista, "identified_versioned_component")) return "no se pudo identificar una pieza en el catálogo";
    if (alguno(lista, "presence")) return "falta identificar una pieza";
    return "faltan piezas identificadas";
  }
  return "faltan datos técnicos";
}

function motivoNoEvaluado(condiciones: readonly unknown[] | null | undefined): string {
  const textos = campos(condiciones);
  return textos.find(texto => /Espacio físico no evaluado|ya está armada/i.test(texto)) ?? "El servidor no evaluó esta comprobación.";
}

/** Una fila por comprobación que devolvió el motor, con su estado tal cual y la causa del faltante. */
export function filasDeEncaje(evaluacion: Pick<TowerEvaluation, "rule_results">): FilaDeEncaje[] {
  return evaluacion.rule_results.flatMap(regla => {
    const texto = parDeEncaje[regla.rule_id];
    if (!texto) return [];
    const estado: EstadoDeEncaje = regla.state === "pass" ? "compatible" : regla.state === "fail" ? "incompatible" : regla.state === "not_applicable" ? "no_evaluado" : "requiere_verificacion";
    const motivo = regla.state === "not_applicable" ? motivoNoEvaluado(regla.conditions) : regla.state === "unknown" ? causaDeFaltante(regla.rule_id, regla.missing_fields) : null;
    return [{ id: regla.rule_id, texto, estado, motivo }];
  });
}

export function fraseDeEncaje(evaluacion: Pick<TowerEvaluation, "verdict" | "rule_results"> | TowerEvaluation["verdict"]): string {
  if (typeof evaluacion === "string") return fraseDeVeredicto(evaluacion);
  if (evaluacion.verdict === "incompatible") return fraseDeVeredicto("incompatible");
  if (evaluacion.verdict === "compatible") return fraseDeVeredicto("compatible");
  const evaluadas = evaluacion.rule_results.filter(regla => regla.state !== "not_applicable");
  if (evaluadas.length && evaluadas.every(regla => regla.state === "unknown")) return "Faltan datos técnicos del catálogo. No pudimos comprobar si todo encaja.";
  return "Todavía faltan datos para estar seguros. Revisá las comprobaciones marcadas.";
}
function fraseDeVeredicto(veredicto: TowerEvaluation["verdict"]): string {
  if (veredicto === "compatible") return "Lo que tenés hoy encaja.";
  if (veredicto === "incompatible") return "Hay piezas que no encajan entre sí. Revisá las marcadas arriba.";
  return "Todavía faltan datos para estar seguros. Revisá las comprobaciones marcadas.";
}
