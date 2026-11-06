import { describe, expect, it } from "vitest";
import { cambiarCantidad, conteoDeMarcas, elegirCandidata, escribirPieza, filasDeRevision, marcarSinPieza, resumenParaGuardar } from "../../lib/import-review";
import { extractionDraft, type ExtractionLineEvidence, type TowerExtraction } from "../../lib/tower-extraction";
import { emptyTower, towerKeys, type CategoryStatus, type TowerCategory } from "../../lib/towers";

const evidencia = (category: TowerCategory, status: CategoryStatus, lines: ExtractionLineEvidence[] = []): TowerExtraction["evidence"][number] => ({ category, status, absence_excerpt: null, lines });
const lineaEv = (index: number, resolution: ExtractionLineEvidence["resolution"], excerpt: string, extra: Partial<ExtractionLineEvidence> = {}): ExtractionLineEvidence => ({ proposal_line_index: index, component_id: null, declared_model: null, quantity: 1, quantity_excerpt: null, candidate_ids: [], excerpt, resolution, ...extra });
const extraccion = (() => {
  const proposal = { ...emptyTower(), name: "Torre extraída", lines: [
    { line_id: null, category: "cpu" as const, component_id: "cg-1", declared_model: null, quantity: 1 },
    { line_id: null, category: "motherboard" as const, component_id: null, declared_model: "B450M", quantity: 1 },
    { line_id: null, category: "ram" as const, component_id: null, declared_model: "DDR4 8 GB", quantity: 2 },
  ] };
  Object.assign(proposal.category_status, { cpu: "present", motherboard: "present", ram: "present" });
  const lineas: Partial<Record<TowerCategory, ExtractionLineEvidence[]>> = {
    cpu: [lineaEv(0, "catalog", "Procesador Ryzen")],
    motherboard: [lineaEv(1, "needs_review", "Placa madre B450M", { candidate_ids: ["cg-10", "cg-11"] })],
    ram: [lineaEv(2, "declared", "16gb de ram (2x8)", { quantity: 2 })],
  };
  const evidence = towerKeys.map(category => evidencia(category, lineas[category] ? "present" : "unknown", lineas[category] ?? []));
  return { proposal, missing_fields: [], warnings: [], catalog_revision: "r", requires_confirmation: true, evidence } satisfies TowerExtraction;
})();

describe("revisión de lo que entendimos", () => {
  it("marca cada pieza según lo que realmente se pudo leer", () => {
    const draft = extractionDraft(extraccion), filas = filasDeRevision(extraccion, draft);
    expect(filas.map(fila => fila.marca)).toEqual(["leida", "revisar", "revisar", "sin_dato", "sin_dato", "sin_dato", "sin_dato", "sin_dato", "sin_dato"]);
    expect(filas[1].candidatos).toEqual(["cg-10", "cg-11"]); expect(filas[1].pregunta).toContain("varias piezas");
    expect(filas[2].pregunta).toContain("no podemos comprobar si encaja");
    expect(filas[0].citas).toEqual(["Procesador Ryzen"]);
    expect(conteoDeMarcas(filas)).toEqual({ leidas: 1, revisar: 2, sinDato: 6 });
  });
  it("una cantidad desconocida pide indicarla en vez de suponer 1", () => {
    const draft = cambiarCantidad(extractionDraft(extraccion), "cpu", null);
    const fila = filasDeRevision(extraccion, draft)[0];
    expect(fila.marca).toBe("revisar"); expect(fila.pregunta).toContain("Indicalo");
  });
});

describe("correcciones sobre el borrador", () => {
  const base = () => extractionDraft(extraccion);
  it("escribir una pieza que no estaba la agrega como modelo escrito; vaciarla la deja sin dato", () => {
    const con = escribirPieza(base(), "gpu", "GTX 1650");
    expect(con.category_status.gpu).toBe("present"); expect(con.lines.at(-1)).toMatchObject({ category: "gpu", component_id: null, declared_model: "GTX 1650", quantity: 1 });
    const sin = escribirPieza(con, "gpu", "  ");
    expect(sin.category_status.gpu).toBe("unknown"); expect(sin.lines.some(line => line.category === "gpu")).toBe(false);
  });
  it("una pieza con varias unidades posibles nace sin cantidad: no se adivina", () => {
    expect(escribirPieza(base(), "storage", "SSD 500").lines.at(-1)?.quantity).toBeNull();
  });
  it("corregir el texto de una pieza del catálogo la convierte en modelo escrito", () => {
    const siguiente = escribirPieza(base(), "cpu", "Otro procesador");
    expect(siguiente.lines.find(line => line.category === "cpu")).toMatchObject({ component_id: null, declared_model: "Otro procesador" });
  });
  it("elegir una candidata usa la pieza del catálogo; «No lo sé todavía» conserva lo escrito", () => {
    const elegida = elegirCandidata(base(), "motherboard", "cg-10", "B450M");
    expect(elegida.lines.find(line => line.category === "motherboard")).toMatchObject({ component_id: "cg-10", declared_model: null });
    const vuelta = elegirCandidata(elegida, "motherboard", null, "B450M");
    expect(vuelta.lines.find(line => line.category === "motherboard")).toMatchObject({ component_id: null, declared_model: "B450M" });
  });
  it("cambiar la placa conserva la BIOS guardada; «No lo sé» y «No la tengo» son distintos", () => {
    const conBios = { ...base(), context: { bios_version: "P2.30", notes: null, assembly_state: "assembled" as const } };
    expect(escribirPieza(conBios, "motherboard", "Otra placa").context.bios_version).toBe("P2.30");
    expect(escribirPieza(conBios, "motherboard", "Otra placa").context.assembly_state).toBe("assembled");
    expect(marcarSinPieza(base(), "ram", "absent").category_status.ram).toBe("absent");
    expect(marcarSinPieza(base(), "ram", "unknown").category_status.ram).toBe("unknown");
    expect(marcarSinPieza(base(), "ram", "unknown").lines.some(line => line.category === "ram")).toBe(false);
  });
});

describe("resumen para guardar", () => {
  it("separa completas, a medias y sin dato con los nombres de las piezas", () => {
    const draft = extractionDraft(extraccion), filas = filasDeRevision(extraccion, draft), resumen = resumenParaGuardar(filas, draft);
    expect(resumen[0]).toEqual({ destacado: "1 pieza completa", resto: ": procesador." });
    expect(resumen[1].destacado).toBe("2 piezas a medias"); expect(resumen[1].resto).toContain("placa madre y memoria");
    expect(resumen[2].destacado).toBe("6 piezas sin dato");
    expect(resumen.at(-1)?.resto).toContain("«Falta un dato» en vez de «Encaja»");
  });
  it("lo que se declaró como ausente no se cuenta como «sin dato»", () => {
    const draft = marcarSinPieza(extractionDraft(extraccion), "cooler", "absent"), resumen = resumenParaGuardar(filasDeRevision(extraccion, draft), draft);
    expect(resumen.find(linea => linea.destacado === "1 pieza que no tenés")?.resto).toBe(" (cooler).");
    expect(resumen.find(linea => linea.destacado.endsWith("sin dato"))?.destacado).toBe("5 piezas sin dato");
  });
});
