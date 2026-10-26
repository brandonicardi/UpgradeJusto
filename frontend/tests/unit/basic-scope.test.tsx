import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EvaluationView } from "../../app/pcs/compatibility";
import { evaluationLabel, evaluationWarnings, ruleLabel, type Evaluation } from "../../lib/compatibility";
import { datasetSource } from "../../lib/catalog";

const basic: Evaluation = {
  verdict: "compatible", rules_version: "cu05-basic-stock-engine-1", data_revision: "test", pc_revision: "1",
  scope: { id: "cu05-basic-stock-1", policy_version: "basic-stock-policy-1", inventory_version: "basic-stock-inventory-1", operating_regime: "stock_no_oc", label: "Alcance básico stock", inventory_reason: "Inventario documentado", includes: ["CPU y BIOS"], excludes: ["Geometría avanzada"], assumptions: ["Sin OC"] },
  warnings: ["Advertencia real del servidor"], additional_checks: [{ id: "B08", status: "outside_scope", reason: "Almacenamiento adicional", evidence_refs: [] }, { id: "B09", status: "unknown", reason: "Frontal no verificado", evidence_refs: [] }],
  rule_results: Array.from({ length: 7 }, (_, i) => ({ rule_id: `B0${i + 1}`, family: "Familia", state: i === 0 ? "unknown" : "pass", facts: null, evidence: null, conditions: null, missing_fields: i === 0 ? ["context.bios_version"] : [] })),
  missing_fields: ["context.bios_version"], coverage: { required: ["B01", "B02", "B03", "B04", "B05", "B06", "B07"], pending: ["B01"] }, evaluated_configuration: null,
};
describe("presentación de alcance, nunca decide compatibilidad", () => {
  it("distingue tres veredictos y legacy sin prometer certificación", () => {
    expect(evaluationLabel(basic)).toBe("Compatible en alcance básico stock");
    expect(evaluationLabel({ ...basic, verdict: "incompatible" })).toBe("Incompatible en alcance básico stock");
    expect(evaluationLabel({ ...basic, verdict: "requiere_verificacion" })).toBe("Requiere verificación en alcance básico stock");
    expect(evaluationLabel({ verdict: "compatible" })).toContain("Resultado histórico");
    expect(evaluationLabel({ verdict: "compatible" })).not.toContain("Compatible en alcance básico");
  });
  it("mantiene advertencias, siete checks, unknown, fuentes y exclusiones visibles", () => {
    const html = renderToStaticMarkup(<EvaluationView result={{ ...basic, verdict: "requiere_verificacion" }} />);
    for (const text of ["Advertencia real del servidor", "Geometría avanzada", "Sin OC", "context.bios_version", "unknown", "B08", "B09", "outside_scope"]) expect(html).toContain(text);
    for (let i = 1; i <= 7; i++) expect(html).toContain(`B0${i}`);
    expect(html.indexOf("Advertencia real del servidor")).toBeLessThan(html.indexOf("<details>"));
  });
  it("atribuye solo repositorios conocidos sin inventar revisión", () => {
    expect(datasetSource(`https://raw.githubusercontent.com/buildcores/opendb/${"a".repeat(40)}/CPU/x.json`)).toEqual({ label: "BuildCores OpenDB", license: "CC BY-NC-SA 4.0", revision: "aaaaaaaa" });
    expect(datasetSource("https://raw.githubusercontent.com/docyx/pc-part-dataset/main/data.json")?.license).toBe("MIT");
    expect(datasetSource("https://untrusted.test/buildcores/opendb/data")).toBeNull();
  });
  it("muestra cada advertencia exacta una vez y conserva estados adicionales separados de unknown necesario", () => {
    const warnings = Array.from({ length: 8 }, (_, i) => `Advertencia única ${i + 1}`);
    const result: Evaluation = { ...basic, verdict: "requiere_verificacion", warnings: [...warnings, warnings[0]], additional_checks: warnings.map((reason, i) => ({ id: `EX${i}`, status: i === 0 ? "unknown" : "outside_scope", reason, evidence_refs: [] })) };
    expect(evaluationWarnings(result)).toEqual(warnings);
    const html = renderToStaticMarkup(<EvaluationView result={result} />);
    for (const warning of warnings) expect(html.split(warning)).toHaveLength(2);
    expect(html).toContain("Pendiente adicional (unknown)");
    expect(html).toContain("Fuera de alcance básico (outside_scope)");
    expect(html).toContain("context.bios_version");
    expect(html).toContain("Necesita verificación; no equivale a compatible.");
    expect(html).toContain("Un dato necesario desconocido dentro del alcance impide compatible.");
    expect(html).not.toContain("Desconocidos necesarios dentro del alcance siguen pendientes");
    expect(html).not.toContain("B01 · B01");
    expect(ruleLabel("B01", "B01")).toBe("CPU, socket y BIOS");
    for (let i = 1; i <= 7; i++) expect(ruleLabel(`B0${i}`, `B0${i}`)).not.toBe(`B0${i}`);
  });
});
