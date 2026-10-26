import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { hasDocumentedConflict } from "../../lib/catalog-evidence";
import { sharedHtml, sharedStyle, sharedStyleHash } from "../../lib/shared-html";
import { toolNameLabel, toolStatusLabel } from "../../lib/assistant-presentation";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataWarnings } from "../../app/catalog/presentation";
import type { Component } from "../../lib/catalog";
describe("presentación final sin reinterpretar datos", () => {
  it("advierte conflictos en envelope real y flags soportados", () => {
    expect(hasDocumentedConflict({ basic_stock_v1: JSON.stringify({ version: 1, data: {}, conflicts: { capacity_per_module_gb: [8, 16] } }) })).toBe(true);
    expect(hasDocumentedConflict({ basic_stock_v1: JSON.stringify({ version: 1, data: { capacity_conflict: true }, conflicts: {} }) })).toBe(true);
    for (const value of [null, "{", "null", "[]", JSON.stringify({ version: 1, data: {}, conflicts: {} })]) expect(hasDocumentedConflict({ basic_stock_v1: value })).toBe(false);
    const part: Component = { id: "unit", name: "Registro sintético", category: "ram", attributes: { basic_stock_v1: JSON.stringify({ version: 1, data: {}, conflicts: { capacity_per_module_gb: [8, 16] } }) }, prices: [], sources: [], image: null };
    const html = renderToStaticMarkup(createElement(DataWarnings, { component: part }));
    expect(html).toContain("Hay datos contradictorios: revisá el detalle.");
    expect(html.indexOf("Hay datos contradictorios")).toBeLessThan(html.indexOf("<details"));
    expect(html).toContain("capacity_per_module_gb");
  });
  it("traduce estados de herramientas, sin afirmar éxitos desconocidos", () => {
    expect(toolStatusLabel("running")).toBe("En curso"); expect(toolStatusLabel("completed")).toBe("Completado");
    expect(toolStatusLabel("untrusted")).toBe("Estado sin confirmar");
    expect(toolNameLabel("evaluate_pc")).toBe("Comprobar componentes");
    expect(toolNameLabel("untrusted")).toBe("Consulta al servidor");
  });
  it("sólo permite CSS exacto por hash y mantiene pública la proyección cerrada", () => {
    expect(sharedStyleHash).toBe(createHash("sha256").update(sharedStyle).digest("base64"));
    const html = sharedHtml({ title: "Plan sintético", status: "requires_verification", cost: { total_ars: null }, owner_id: "PRIVATE", stages: [{ name: "Memoria", evaluation: { verdict: "compatible", scope: { id: "cu05-basic-stock-1", operating_regime: "stock_no_oc" }, rule_results: [], warnings: ["CPU cooler missing"] } }] });
    expect(html).toContain("Compatible para uso sin overclock"); expect(html).toContain("Refrigeración pendiente");
    expect(html).toContain("Total por confirmar"); expect(html).not.toContain("PRIVATE");
    for (const forbidden of ["<script", "<form", "<button", "<img", "<a "]) expect(html).not.toContain(forbidden);
    expect(sharedHtml({ stages: [{ evaluation: { verdict: "compatible" } }] })).toContain("Compatible según evaluación guardada");
  });
  it("no atribuye alcance básico a legacy y distingue fallos de faltantes públicos", () => {
    const legacy = sharedHtml({ stages: [{ name: "Guardado anterior", evaluation: { verdict: "compatible", rule_results: [] } }] });
    expect(legacy).toContain("Compatible según evaluación guardada");
    expect(legacy).toContain("Evaluación conservada con su alcance original");
    expect(legacy).not.toContain("Comprobación básica de componentes.");
    const html = sharedHtml({ stages: [{ evaluation: { verdict: "incompatible", scope: { id: "cu05-basic-stock-1", operating_regime: "stock_no_oc" }, rule_results: [{ rule_id: "B04", state: "fail" }, { rule_id: "B01", state: "unknown" }] } }] });
    expect(html).toContain("Espacio para la gráfica: No cumple.");
    expect(html).toContain("Procesador y placa: Falta información.");
    expect(html.indexOf("Espacio para la gráfica: No cumple.")).toBeLessThan(html.indexOf("<details"));
    expect(html.indexOf("Procesador y placa: Falta información.")).toBeLessThan(html.indexOf("<details"));
  });
});
