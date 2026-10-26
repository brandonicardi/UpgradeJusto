import type { Category } from "./catalog";
import { simulationInput, type Evaluation, type JsonValue, type Simulation } from "./compatibility";
import { pcError } from "./pcs";

export type Objective = "general" | "gaming" | "productivity";
export type Replacement = Omit<Simulation, "expected_pc_revision">;
export type Alternative = { key: string; replacements: Replacement[] };
export type PreviewInput = { expected_pc_revision: number; objective: Objective; budget_ars: string; alternatives: Alternative[] };
export type DraftReplacement = { category: Category; candidates: { component_id: string; quantity: string }[]; bios: string };
export type DraftAlternative = { key: string; replacements: DraftReplacement[] };
export type Preview = {
  pc_id: string; pc_revision: string | number; objective: Objective; budget_ars: string; currency: "ARS"; limitations: JsonValue;
  items: {
    key: string; replacements: JsonValue; evaluation: Evaluation;
    cost: { total_ars: string | null; known_subtotal_ars: string; within_budget: boolean | null;
      lines: { component_id: string; quantity: number; unit_amount: string; currency: string; date: string; source: string }[]; missing_fields: JsonValue };
    benefit: { status: "supported" | "unknown" | "not_an_improvement"; evidence: JsonValue };
    status: "recommended" | "requires_verification" | "rejected"; missing_fields: JsonValue;
  }[];
};

export function previewInput(revision: number, objective: Objective, budget: string, alternatives: DraftAlternative[]): PreviewInput {
  // Validate syntax only; never calculate prices, budgets, compatibility or benefit here.
  if (!Number.isInteger(revision) || revision < 1) throw new Error("Recargá la revisión de la PC.");
  if (!["general", "gaming", "productivity"].includes(objective)) throw new Error("Elegí un objetivo válido.");
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(budget) || !/[1-9]/.test(budget)) throw new Error("Presupuesto ARS positivo, hasta 999999999999.99 y dos decimales, sin exponente.");
  if (!alternatives.length || alternatives.length > 20) throw new Error("Indicá entre 1 y 20 alternativas.");
  const keys = alternatives.map(item => item.key);
  if (keys.some(key => !/^[A-Za-z0-9_-]{1,40}$/.test(key)) || new Set(keys).size !== keys.length) throw new Error("Claves únicas: 1 a 40 letras ASCII, números, guion o guion bajo.");
  return { expected_pc_revision: revision, objective, budget_ars: budget, alternatives: alternatives.map(item => {
    if (!item.replacements.length || item.replacements.length > 6 || new Set(item.replacements.map(group => group.category)).size !== item.replacements.length) throw new Error("Cada alternativa requiere 1 a 6 categorías distintas; dependencias explícitas.");
    return { key: item.key, replacements: item.replacements.map(group => {
      if (!["cpu", "motherboard", "ram", "gpu", "psu", "case"].includes(group.category)) throw new Error("Categoría inválida.");
      const form = new FormData();
      group.candidates.forEach(candidate => { form.append("candidate", candidate.component_id); form.append("quantity", candidate.quantity); });
      form.set("candidate_bios", group.bios);
      const input = simulationInput(revision, group.category, form);
      return { category: input.category, candidates: input.candidates, ...(input.candidate_context ? { candidate_context: input.candidate_context } : {}) };
    }) };
  }) };
}

export function recommendationError(status: number) {
  if (status === 409) return "La PC cambió. Recargá el detalle antes de solicitar otra preview; no se guardó ningún cambio.";
  if (status === 422) return "Revisá objetivo, presupuesto ARS, alternativas, referencias, cantidades y BIOS.";
  return pcError(status);
}

export function costTotalLabel(total: string | null): string {
  return total === null ? "Desconocido (null), no es cero" : total;
}

export async function recommendationRequest(id: string, body: PreviewInput): Promise<Preview> {
  const options: RequestInit = { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(15000) };
  const csrf = await fetch("/api/auth/csrf", options);
  if (!csrf.ok) throw new Error(recommendationError(csrf.status));
  const token = await csrf.json();
  if (typeof token.csrf_token !== "string") throw new Error(recommendationError(503));
  const response = await fetch(`/api/pcs/${id}/recommendations/preview`, {
    ...options, signal: AbortSignal.timeout(15000), method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(recommendationError(response.status));
  return response.json();
}
