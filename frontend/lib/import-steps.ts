import { towerCategories, towerKeys, type TowerCategory } from "./towers";
import type { ExtractionState, TowerProposalDraft } from "./tower-extraction";

export type ImportStep = 1 | 2 | 3;
export const importSteps: { n: ImportStep; label: string }[] = [
  { n: 1, label: "Pegá tu lista" },
  { n: 2, label: "Revisá lo que entendimos" },
  { n: 3, label: "Guardala" },
];

/** Paso visible: sin propuesta siempre es el 1; con una guardada, el 3. */
export function currentImportStep(hasProposal: boolean, saved: boolean, reviewing: ImportStep): ImportStep {
  if (saved) return 3;
  if (!hasProposal) return 1;
  return reviewing === 3 ? 3 : 2;
}

/** Corregir cualquier línea desmarca la confirmación; si estaba marcada, se recuerda para explicarlo. */
export function consentAfterEdit(current: { confirmed: boolean; edited: boolean }): { confirmed: boolean; edited: boolean } {
  return { confirmed: false, edited: current.edited || current.confirmed };
}

export type ConfirmGate = { canSave: boolean; reason: string | null };
/** Última explicación de por qué no se puede guardar. El controlador sigue siendo la última barrera. */
export function confirmGate(input: { confirmed: boolean; edited: boolean; busy: boolean; blocked: ExtractionState["blocked"] }): ConfirmGate {
  if (input.blocked === "catalog") return { canSave: false, reason: "El catálogo cambió, así que no se puede guardar esta propuesta tal cual." };
  if (input.blocked === "uncertain") return { canSave: false, reason: "No sabemos si el guardado anterior se completó. Revisá Mis PCs antes de enviar de nuevo." };
  if (input.busy) return { canSave: false, reason: "Esperá un momento: hay un envío en curso." };
  if (!input.confirmed) return { canSave: false, reason: input.edited ? "Revisaste cambios: volvé a confirmar" : "Marcá la confirmación para guardar" };
  return { canSave: true, reason: null };
}

export type DraftSummaryRow = { category: TowerCategory; label: string; text: string };
/** Resumen de lo que se va a guardar, solo con lo que hay en el borrador. */
export function draftSummary(draft: TowerProposalDraft): DraftSummaryRow[] {
  return towerKeys.map(category => {
    const label = towerCategories[category], status = draft.category_status[category];
    const lines = draft.lines.filter(line => line.category === category);
    if (status === "absent") return { category, label, text: "Dijiste que no la tenés" };
    if (status === "unknown" && lines.length === 0) return { category, label, text: "No sé: queda sin completar" };
    if (lines.length === 0) return { category, label, text: "La tenés, pero falta indicar cuál" };
    const [one, many] = category === "ram" ? ["módulo", "módulos"] : ["unidad", "unidades"];
    const text = lines.map(line => {
      const model = line.declared_model?.trim() || (line.component_id ? "Pieza elegida del catálogo" : "Modelo sin indicar");
      return line.quantity === null ? `${model} (falta la cantidad)` : `${model} · ${line.quantity} ${line.quantity === 1 ? one : many}`;
    }).join("; ");
    return { category, label, text };
  });
}

/** Guard puro de la pantalla histórica: no se guarda sin propuesta, confirmación explícita ni bloqueo. */
export function canSaveLegacyProposal(input: { locked: boolean; hasPreview: boolean; confirmed: boolean; blocked: boolean }): boolean {
  return !input.locked && input.hasPreview && input.confirmed && !input.blocked;
}
