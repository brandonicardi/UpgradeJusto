import { describe, expect, it } from "vitest";
import { extractionWarnings } from "../../lib/extraction-presentation";
import type { Extraction } from "../../lib/curation";

describe("advertencias de propuesta, sin alterar la extracción", () => {
  const evidence: Extraction["evidence"] = [
    { field: "cpu", origin: "unknown", excerpt: null, candidate_ids: [] },
    { field: "motherboard", origin: "ambiguous", excerpt: null, candidate_ids: [] },
    { field: "ram", origin: "catalog", excerpt: "Texto sintético", candidate_ids: ["unit-reference"] },
  ];
  it("resume faltantes estructurados en castellano y conserva originales íntegros", () => {
    const warnings = ["cpu: unknown", "motherboard: ambiguous", "gpu: sin selección confirmada (text)", "vendor note: review"];
    const result = extractionWarnings({ evidence, warnings });
    expect(result.summaries[0]).toContain("Procesador, Placa madre");
    expect(result.summaries.join(" ")).not.toMatch(/cpu|unknown|ambiguous/);
    expect(result.summaries[0]).toContain("Tarjeta gráfica");
    expect(result.summaries).toContain("vendor note: review");
    expect(result.originals).toEqual(warnings);
    expect(result.important).toEqual([]);
  });
  it("no pliega silenciosamente peligros conocidos o advertencias no traducidas de seguridad", () => {
    const warnings = ["PSU 12V documentation conflict", "CPU cooler missing", "unsupported voltage condition"];
    const result = extractionWarnings({ evidence, warnings });
    expect(result.important).toContain("PSU 12V documentation conflict");
    expect(result.important).toContain("CPU cooler missing");
    expect(result.important).toContain("unsupported voltage condition");
    expect(result.originals).toEqual(warnings);
  });
  it("mantiene visible literalmente un conflicto de socket no normalizado", () => {
    const warnings = ["Conflicto de socket entre procesador y placa"];
    const result = extractionWarnings({ evidence, warnings });
    expect(result.important).toContain(warnings[0]);
    expect(result.originals).toEqual(warnings);
  });
  it("mantiene mensajes no catalogados y no consume sufijos arbitrarios", () => {
    const warnings = ["mensaje no catalogado", "cpu: unknown; revisar cable"];
    const result = extractionWarnings({ evidence, warnings });
    for (const warning of warnings) expect(result.summaries).toContain(warning);
    expect(result.originals).toEqual(warnings);
  });
});
