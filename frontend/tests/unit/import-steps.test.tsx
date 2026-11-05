import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ImportConfirmStep, ImportStepList } from "../../components/import-steps";
import { confirmGate, consentAfterEdit, currentImportStep, draftSummary } from "../../lib/import-steps";
import { extractionDraft, type TowerExtraction } from "../../lib/tower-extraction";
import { emptyTower, towerKeys } from "../../lib/towers";

function draft() {
  const extraction: TowerExtraction = { proposal: { ...emptyTower(), name: "Mi torre" }, evidence: towerKeys.map(category => ({ category, status: "unknown" as const, absence_excerpt: null, lines: [] })), missing_fields: [], warnings: [], catalog_revision: "rev", requires_confirmation: true };
  const value = extractionDraft(extraction);
  value.category_status.ram = "present"; value.category_status.psu = "absent";
  value.lines = [{ line_id: null, category: "ram", component_id: null, declared_model: "DDR4 de 8 GB", quantity: 2 }, { line_id: null, category: "storage", component_id: "abc", declared_model: null, quantity: null }];
  value.category_status.storage = "present";
  return value;
}
const noop = () => {};
function confirmStep(patch: Partial<Parameters<typeof ImportConfirmStep>[0]> = {}) {
  return renderToStaticMarkup(<ImportConfirmStep draft={draft()} confirmed={false} edited={false} busy={false} blocked={null} onName={noop} onConfirmed={noop} onSubmit={noop} onBack={noop} onDiscard={noop} onAllowRetry={noop} {...patch} />);
}
const saveButton = /<button disabled=""[^>]*>Confirmar y guardar mi torre<\/button>/;

describe("pasos para agregar por lista", () => {
  it("muestra tres pasos y marca solo el actual", () => {
    const html = renderToStaticMarkup(<ImportStepList step={2} />);
    expect(html).toContain("Paso 2 de 3"); expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="step"[^>]*><b[^>]*>2<\/b>Revisá lo que entendimos/);
    for (const label of ["Pegá tu lista", "Revisá lo que entendimos", "Guardala"]) expect(html).toContain(label);
  });
  it("sin propuesta siempre es el paso 1; con propuesta se elige 2 o 3; guardada es 3", () => {
    expect(currentImportStep(false, false, 3)).toBe(1); expect(currentImportStep(true, false, 2)).toBe(2);
    expect(currentImportStep(true, false, 3)).toBe(3); expect(currentImportStep(true, true, 2)).toBe(3);
  });
  it("corregir una línea desmarca la confirmación y recuerda el motivo", () => {
    expect(consentAfterEdit({ confirmed: true, edited: false })).toEqual({ confirmed: false, edited: true });
    expect(consentAfterEdit({ confirmed: false, edited: false })).toEqual({ confirmed: false, edited: false });
    expect(consentAfterEdit({ confirmed: false, edited: true })).toEqual({ confirmed: false, edited: true });
  });
  it("el botón explica qué falta y no se habilita sin confirmar", () => {
    expect(confirmGate({ confirmed: false, edited: false, busy: false, blocked: null })).toEqual({ canSave: false, reason: "Marcá la confirmación para guardar" });
    expect(confirmGate({ confirmed: false, edited: true, busy: false, blocked: null }).reason).toBe("Revisaste cambios: volvé a confirmar");
    expect(confirmGate({ confirmed: true, edited: false, busy: false, blocked: null })).toEqual({ canSave: true, reason: null });
    expect(confirmGate({ confirmed: true, edited: false, busy: true, blocked: null }).canSave).toBe(false);
    const html = confirmStep({ edited: true }); expect(html).toMatch(saveButton); expect(html).toContain("Revisaste cambios: volvé a confirmar");
    expect(confirmStep()).toContain("Marcá la confirmación para guardar");
    expect(confirmStep({ confirmed: true })).not.toMatch(saveButton);
  });
  it("el resumen sale del borrador sin inventar datos", () => {
    const rows = draftSummary(draft()), by = (key: string) => rows.find(row => row.category === key)!.text;
    expect(rows).toHaveLength(9);
    expect(by("ram")).toBe("DDR4 de 8 GB · 2 módulos"); expect(by("psu")).toBe("Dijiste que no la tenés");
    expect(by("storage")).toBe("Pieza elegida del catálogo (falta la cantidad)"); expect(by("cpu")).toBe("No sé: queda sin completar");
    const html = confirmStep(); expect(html).not.toMatch(/%|FPS|\$/); expect(html).toContain("Todavía no se guardó nada");
  });
  it("catálogo cambiado ofrece revisar el catálogo y no habilita el envío", () => {
    const html = confirmStep({ confirmed: true, blocked: "catalog" });
    expect(html).toMatch(saveButton); expect(html).toContain('href="/catalog"'); expect(html).toContain("Revisá el catálogo"); expect(html).not.toContain("autorizar un nuevo envío");
    expect(html).not.toContain("Torre guardada");
  });
  it("resultado incierto ofrece revisar Mis PCs y autorizar otro envío, sin éxito ni botón normal", () => {
    const html = confirmStep({ confirmed: true, blocked: "uncertain" });
    expect(html).toMatch(saveButton); expect(html).toContain('href="/pcs"'); expect(html).toContain("revisá Mis PCs"); expect(html).toContain("autorizar un nuevo envío");
    expect(html).not.toContain("Descartar y volver a pegar"); expect(html).not.toContain("Torre guardada");
  });
  it("no usa jerga interna", () => {
    const html = confirmStep() + renderToStaticMarkup(<ImportStepList step={1} />);
    for (const word of [/snapshot/i, /schema/i, /revisión \d/i, /scope/i, /coverage/i]) expect(html).not.toMatch(word);
  });
});
