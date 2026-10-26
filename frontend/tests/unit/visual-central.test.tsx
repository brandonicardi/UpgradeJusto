import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import EvaluationSummary, { centralEvaluationLabel } from "../../app/pcs/evaluation-summary";
import { Price } from "../../components/ui";
import { documentedCapacity, categoryIllustrations } from "../../lib/product-visuals";
import type { Evaluation } from "../../lib/compatibility";
import type { Component } from "../../lib/catalog";

const result: Evaluation = {
  verdict: "requiere_verificacion", rules_version: "unit", data_revision: "unit", pc_revision: "1",
  scope: { id: "cu05-basic-stock-1", operating_regime: "stock_no_oc", label: "unit", policy_version: "unit", inventory_version: "unit", inventory_reason: "unit", includes: [], excludes: [], assumptions: [] },
  rule_results: [{ rule_id: "B01", family: "B01", state: "unknown", facts: null, conditions: null, missing_fields: ["context.bios_version"], evidence: null }],
  warnings: ["CPU cooler not documented", "PSU 12V documentation conflict"], missing_fields: ["context.bios_version"], coverage: null, evaluated_configuration: null,
};
describe("entrega visual central, sólo presentación", () => {
  it("conserva el alcance anterior también en la explicación breve", () => {
    const html = renderToStaticMarkup(<EvaluationSummary result={{ ...result, verdict: "compatible", scope: undefined }} />);
    expect(html).toContain("Compatible según evaluación guardada");
    expect(html).toContain("Evaluación conservada con su alcance original");
    expect(html).not.toContain("Comprobación básica de componentes.");
  });
  it("expone conflicto PSU estructurado aunque el motivo no diga conflicto", () => {
    const reason = "F10 declara 62,5 A y F11 declara 54,2 A en 12V; revisar documentación.";
    const html = renderToStaticMarkup(<EvaluationSummary result={{ ...result, verdict: "compatible", warnings: [reason], additional_checks: [{ id: "psu_12v_documentation_conflict", status: "unknown", reason, evidence_refs: [] }] }} />);
    const label = "La documentación de la fuente es contradictoria";
    expect(html).toContain(label);
    expect(html.indexOf(label)).toBeLessThan(html.indexOf("<details"));
    expect(html).toContain("Compatible para uso sin overclock");
    expect(html).toContain(reason);
    const cable = renderToStaticMarkup(<EvaluationSummary result={{ ...result, warnings: ["Cable de 12V pendiente de comprobar"], additional_checks: [] }} />);
    expect(cable).not.toContain(label);
  });
  it("conserva estados y diferencia evaluaciones anteriores", () => {
    expect(centralEvaluationLabel(result)).toBe("Falta información");
    expect(centralEvaluationLabel({ ...result, verdict: "compatible" })).toBe("Compatible para uso sin overclock");
    expect(centralEvaluationLabel({ ...result, verdict: "incompatible" })).toBe("Incompatible");
    expect(centralEvaluationLabel({ ...result, verdict: "compatible", scope: undefined })).toBe("Compatible según evaluación guardada");
  });
  it("expone acciones bloqueantes y riesgos, mantiene evidencia en detalles", () => {
    const html = renderToStaticMarkup(<EvaluationSummary result={result} />);
    expect(html).toContain("Revisá el modelo exacto del procesador");
    expect(html).toContain("Refrigeración pendiente");
    expect(html).toContain("La documentación de la fuente es contradictoria");
    expect(html.indexOf("Refrigeración pendiente")).toBeLessThan(html.indexOf("<details"));
    expect(html).toContain("context.bios_version");
    expect(html).toContain("Cómo se comprobó");
    expect(html).toContain("Fuentes y versiones");
  });
  it("no convierte precio desconocido en cero ni inventa capacidad", () => {
    expect(renderToStaticMarkup(<Price amount={null} />)).toContain("Precio total por confirmar");
    expect(renderToStaticMarkup(<Price amount="766417.98" />)).toContain("766.417,98");
    const part = { category: "ram", attributes: { capacity_gb: "8" } } as unknown as Component;
    expect(documentedCapacity(part, 2)).toBe("16 GB");
    expect(documentedCapacity({ ...part, attributes: { capacity_gb: null } }, 2)).toBeNull();
    expect(Object.values(categoryIllustrations).every(value => value.startsWith("/illustrations/") && value.endsWith(".svg"))).toBe(true);
  });
  it("lee las capacidades curadas publicadas, no nombres ni IDs", () => {
    const part = (category: "ram" | "gpu", attributes: Record<string, string | null>): Component => ({ id: "arbitrary", name: "Nombre sin capacidad", category, attributes, sources: [], prices: [], image: null });
    expect(documentedCapacity(part("ram", { capacity_per_module: "8 GB" }), 2)).toBe("16 GB");
    expect(documentedCapacity(part("ram", { capacity_per_module: "16 GB" }), 2)).toBe("32 GB");
    expect(documentedCapacity(part("gpu", { vram: "8 GB" }), 1)).toBe("8 GB");
    expect(documentedCapacity(part("gpu", { vram: "12 GB" }), 1)).toBe("12 GB");
    expect(documentedCapacity(part("gpu", { vram: "12 GB" }), 2)).toBeNull();
    for (const value of [null, "", "unknown", "8", "8 GiB", "8 GB kit", "0 GB"]) expect(documentedCapacity(part("ram", { capacity_per_module: value }), 2)).toBeNull();
    expect(documentedCapacity(part("ram", { basic_stock_v1: JSON.stringify({ data: { capacity_per_module_gb: 8 } }) }), 2)).toBe("16 GB");
    expect(documentedCapacity(part("ram", { capacity_per_module: "8 GB", basic_stock_v1: JSON.stringify({ data: { capacity_per_module_gb: 16 } }) }), 2)).toBeNull();
    expect(documentedCapacity(part("ram", { capacity_per_module: "8 GB", basic_stock_v1: "{" }), 2)).toBeNull();
    expect(documentedCapacity(part("ram", { capacity_per_module: "8 GB", basic_stock_v1: JSON.stringify({ data: { capacity_per_module_gb: 8, capacity_conflict: true } }) }), 2)).toBeNull();
    expect(documentedCapacity(part("ram", {}), 2)).toBeNull();
  });
  it("compacta aprobaciones pero nunca esconde un bloqueo necesario", () => {
    const passing = { ...result, verdict: "compatible", warnings: [], rule_results: result.rule_results.map(rule => ({ ...rule, state: "pass" })) };
    const html = renderToStaticMarkup(<EvaluationSummary result={passing} collapsePassedChecks />);
    expect(html).toContain("Ver comprobación de mi PC");
    const blocked = renderToStaticMarkup(<EvaluationSummary result={result} collapsePassedChecks />);
    expect(blocked.indexOf("Revisá el modelo exacto del procesador")).toBeLessThan(blocked.indexOf("<details"));
    expect(blocked).toContain("Refrigeración pendiente");
    expect(blocked).toContain("La documentación de la fuente es contradictoria");
  });
});
