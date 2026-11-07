import { describe, expect, it } from "vitest";
import { cargaDeLaPc, causaDeFaltante, detalleDePieza, estadoDeTarjeta, faltaDeLaTarjeta, filasDeEncaje, fraseDeEncaje, piezasEsenciales, tieneDatosTecnicos } from "../../lib/mi-pc";
import { emptyTower, type TowerLine } from "../../lib/towers";

const linea = (category: TowerLine["category"], component_id: string | null, declared_model: string | null = null): TowerLine => ({ line_id: null, category, component_id, declared_model, quantity: 1 });
const atributos = (data: unknown) => ({ tower_stock_v1: JSON.stringify({ version: 1, data }) });

describe("detalle de una pieza del catálogo", () => {
  it("usa sólo lo que dice el catálogo y no inventa nada", () => {
    expect(detalleDePieza("cpu", atributos({ socket: "AM4", memory_type: "DDR4" }))).toBe("Zócalo AM4 · memoria DDR4");
    expect(detalleDePieza("ram", atributos({ memory_type: "DDR4", capacity_gb: 16 }), 2)).toBe("DDR4 · 16 GB por módulo · 2 módulos");
    expect(detalleDePieza("case", atributos({ gpu_limit_mm: 400 }))).toBe("Placas de video de hasta 40 cm");
    expect(detalleDePieza("gpu", atributos({ length_mm: 229 }))).toContain("22,9 cm");
    expect(detalleDePieza("psu", atributos({ continuous_power_w: 750, form_factor: "ATX" }))).toBe("750 W · formato ATX");
  });
  it("sin datos técnicos legibles devuelve null en vez de un texto inventado", () => {
    expect(detalleDePieza("cpu", {})).toBeNull();
    expect(detalleDePieza("cpu", { tower_stock_v1: "no es json" })).toBeNull();
    expect(detalleDePieza("cooler", atributos({ socket: "AM4" }))).toBeNull();
    expect(detalleDePieza("cpu", undefined)).toBeNull();
  });
  it("distingue atributos vacíos de datos técnicos publicados", () => {
    expect(tieneDatosTecnicos({})).toBe(false);
    expect(tieneDatosTecnicos({ tower_stock_v1: JSON.stringify({ version: 1, data: {} }) })).toBe(false);
    expect(tieneDatosTecnicos(atributos({ socket: "AM4" }))).toBe(true);
  });
});

describe("estado de cada tarjeta", () => {
  it("completa si la pieza está identificada y el catálogo publica sus datos; la BIOS no participa", () => {
    expect(estadoDeTarjeta("present", [linea("cpu", "cg-1")])).toBe("completa");
    expect(estadoDeTarjeta("present", [linea("motherboard", "cg-2")], ["con_datos"])).toBe("completa");
    expect(faltaDeLaTarjeta([linea("motherboard", "cg-2")], ["con_datos"])).toBeNull();
  });
  it("identificada sin datos técnicos no es «completar»: lo dice y no inventa", () => {
    expect(estadoDeTarjeta("present", [linea("gpu", "cg-3")], ["sin_datos"])).toBe("sin_datos");
    expect(faltaDeLaTarjeta([linea("gpu", "cg-3")], ["sin_datos"])).toBe("El catálogo todavía no tiene los datos técnicos de este componente");
    expect(estadoDeTarjeta("present", [linea("gpu", "cg-3")], ["error"])).toBe("sin_datos");
    expect(faltaDeLaTarjeta([linea("gpu", "cg-3")], ["error"])).toBe("No pudimos leer los datos técnicos");
    expect(estadoDeTarjeta("present", [linea("gpu", "cg-3")], ["cargando"])).toBe("cargando");
  });
  it("un modelo escrito a mano queda para revisar; sin piezas, vacía", () => {
    expect(estadoDeTarjeta("present", [linea("gpu", null, "GTX")])).toBe("revisar");
    expect(faltaDeLaTarjeta([linea("gpu", null, "GTX")])).toBe("Modelo escrito por vos, sin verificar");
    expect(estadoDeTarjeta("unknown", [])).toBe("vacia");
    expect(estadoDeTarjeta("absent", [])).toBe("vacia");
  });
  it("cuenta sólo las siete piezas esenciales y deja aparte refrigeración y ventiladores", () => {
    expect(piezasEsenciales).toEqual(["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage"]);
    const pc = { ...emptyTower(), category_status: { ...emptyTower().category_status, cpu: "present" as const, motherboard: "present" as const, cooler: "present" as const, fan: "present" as const }, lines: [linea("cpu", "cg-1"), linea("motherboard", "cg-2"), linea("cooler", "cg-9"), linea("fan", "cg-10")] };
    const carga = cargaDeLaPc(pc);
    expect(carga.cargadas).toBe(2); expect(carga.total).toBe(7); expect(carga.porConfirmar).toBe(0);
    expect(carga.porConfirmarTexto).toBe("Sin componentes por confirmar"); expect(carga.etiqueta).toBe("2 de 7 componentes esenciales cargados, sin componentes por confirmar");
    expect(carga.opcionales).toBe("Refrigeración y ventiladores: opcionales");
    expect(carga.puntos).toEqual(["ok", "ok", "e", "e", "e", "e", "e"]);
    expect(cargaDeLaPc(emptyTower()).porConfirmarTexto).toBe("Sin componentes por confirmar");
  });
});

describe("¿Encaja todo entre sí?", () => {
  const regla = (rule_id: string, state: "pass" | "fail" | "unknown" | "not_applicable", missing_fields: string[] = [], conditions: string[] = []) => ({ rule_id, family: "x", state, facts: [], evidence: [], conditions, missing_fields });
  it("traduce cada estado del motor sin cambiarlo, incluye T11 y descarta reglas sin nombre para personas", () => {
    const filas = filasDeEncaje({ rule_results: [regla("T01", "pass"), regla("T02", "fail"), regla("T08", "unknown", ["motherboard.tower_ports"]), regla("T11", "unknown", ["case.presence"]), regla("T99", "pass")] });
    expect(filas.map(fila => [fila.texto, fila.estado])).toEqual([["Procesador y placa madre", "compatible"], ["Memoria y placa madre", "incompatible"], ["Lugar para los discos", "requiere_verificacion"], ["Identificación y presencia", "requiere_verificacion"]]);
    expect(filas[2].motivo).toBe("faltan los puertos de la placa para los discos");
    expect(filas[3].motivo).toBe("no se identificó el gabinete");
  });
  it("«No evaluado» conserva la razón del servidor y nunca se muestra como aprobado", () => {
    const fila = filasDeEncaje({ rule_results: [regla("T04", "not_applicable", [], ["Espacio físico no evaluado: faltan medidas. Chequeá que entre en tu gabinete."])] })[0];
    expect(fila.estado).toBe("no_evaluado");
    expect(fila.motivo).toContain("Espacio físico no evaluado");
  });
  it("traduce las causas de los faltantes sin inventar datos", () => {
    expect(causaDeFaltante("T02", ["cpu.memory_type", "motherboard.ram_slots"])).toContain("socket/memoria de la placa");
    expect(causaDeFaltante("T04", ["gpu.length_mm", "case.gpu_limit_mm"])).toBe("faltan medidas de la GPU y del gabinete");
    expect(causaDeFaltante("T11", ["case.presence"])).toBe("no se identificó el gabinete");
    expect(causaDeFaltante("T11", ["1234.identified_versioned_component"])).toContain("no se pudo identificar");
  });
  it("la frase depende del veredicto real y no dice «no encajan» si sólo faltan datos", () => {
    expect(fraseDeEncaje("compatible")).toBe("Lo que tenés hoy encaja.");
    expect(fraseDeEncaje("incompatible")).toContain("no encajan");
    expect(fraseDeEncaje({ verdict: "requiere_verificacion", rule_results: [regla("T01", "unknown"), regla("T04", "not_applicable")] })).toContain("Faltan datos técnicos del catálogo");
    expect(fraseDeEncaje({ verdict: "requiere_verificacion", rule_results: [regla("T01", "pass"), regla("T02", "unknown")] })).not.toContain("no encajan");
    expect(fraseDeEncaje({ verdict: "incompatible", rule_results: [regla("T01", "fail"), regla("T02", "unknown")] })).toContain("no encajan");
  });
});
