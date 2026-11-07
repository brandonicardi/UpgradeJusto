import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SaveToPlan from "../../app/conviene/save-to-plan";
import { chatEligible, pcChoice } from "../../lib/chat-pc-rule";
import { actionPhrase, touchesThermal } from "../../lib/conviene-view";
import type { TowerPlanDraft } from "../../lib/tower-plans";
import type { Tower } from "../../lib/towers";

const pc = (id: string, schema = 2) => ({ id, name: `PC ${id}`, origin_schema: schema, schema_version: schema }) as unknown as Tower;
const draft = (category: string): TowerPlanDraft => ({ name: "Mejora", pc_id: "12345678-1234-1234-1234-123456789abc", expected_pc_revision: 1, expected_catalog_version: "v1", objective: "general", workload: null, budget_ars: "400000.00", price_condition: "cash", stages: [{ name: "Etapa", budget_ars: "400000.00", materials: [], actions: [{ category, action: "replace_category", line_id: null, candidates: [{ component_id: null, declared_model: "Pieza", quantity: 1 }] }] as never }] });
const rows = [{ name: "Ryzen 5 5600", price: "$ 150.000", verdict: "compatible" as const }];

describe("regla de PC en el chat", () => {
  it("con una sola PC se usa sola", () => expect(pcChoice([pc("a")], true, "", false)).toBe("auto"));
  it("con varias PCs el asistente pregunta", () => expect(pcChoice([pc("a"), pc("b")], true, "", false)).toBe("ask"));
  it("sin PCs avisa y se puede chatear igual", () => expect(pcChoice([], true, "", false)).toBe("none"));
  it("no pregunta de nuevo si ya eligió o dijo «de ninguna»", () => {
    expect(pcChoice([pc("a"), pc("b")], true, "a", false)).toBe("settled");
    expect(pcChoice([pc("a"), pc("b")], true, "", true)).toBe("settled");
  });
  it("espera a la lista y descarta formatos viejos", () => {
    expect(pcChoice(undefined, false, "", false)).toBe("loading");
    expect(chatEligible([pc("a"), pc("b", 1)])).toHaveLength(1);
  });
});

describe("Sumar a tu plan", () => {
  it("muestra el componente, el precio, el veredicto, la nota y los botones sin casilla de confirmación", () => {
    const html = renderToStaticMarkup(<SaveToPlan seed={draft("gpu")} rows={rows} onSaved={() => {}} onCancel={() => {}} />);
    for (const text of ["Sumar a tu plan", "Ryzen 5 5600", "$ 150.000", "Tu PC guardada no cambia.", "Guardar en mi plan", "Cancelar"]) expect(html).toContain(text);
    expect(html).not.toContain("pasta térmica");
    expect(html).not.toContain("Revisé");
  });
  it("pregunta por la pasta térmica solo si toca procesador o cooler", () => {
    for (const category of ["cpu", "cooler"]) expect(renderToStaticMarkup(<SaveToPlan seed={draft(category)} rows={rows} onSaved={() => {}} onCancel={() => {}} />)).toContain("¿Tenés pasta térmica? Va entre el procesador y el cooler.");
    for (const category of ["gpu", "ram", "storage", "psu"]) expect(renderToStaticMarkup(<SaveToPlan seed={draft(category)} rows={rows} onSaved={() => {}} onCancel={() => {}} />)).not.toContain("pasta térmica");
    expect(touchesThermal([{ category: "gpu" }, { category: "cpu" }])).toBe(true);
    expect(touchesThermal([{ category: "motherboard" }])).toBe(false);
  });
  it("dice la acción con el nombre de la categoría", () => {
    expect(actionPhrase("gpu", "replace_category")).toBe("Placa de video: se cambia");
    expect(actionPhrase("storage", "add_line")).toBe("Almacenamiento: se suma");
  });
});
