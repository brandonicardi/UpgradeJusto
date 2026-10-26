import { previewInput, type DraftReplacement, type Objective, type Replacement } from "./recommendations";
import type { Evaluation, JsonValue } from "./compatibility";
import type { PC } from "./pcs";

export type DraftStage = { name: string; replacements: DraftReplacement[] };
export type PlanInput = { name: string; pc_id: string; expected_pc_revision: number; objective: Objective; budget_ars: string; stages: { name: string; replacements: Replacement[] }[] };
export type PlanSummary = { id: string; name: string; revision: number; status: string; objective: Objective; budget_ars: string; total_ars: string | null; updated_at: string };
export type Plan = Omit<PlanSummary, "total_ars"> & {
  pc_id: string | null; pc_revision: string; currency: "ARS"; base_snapshot: JsonValue;
  stages: { name: string; replacements: Replacement[]; position: number; evaluated_configuration: JsonValue; evaluation: Evaluation; cost: JsonValue; cumulative_cost: JsonValue }[];
  cost: JsonValue; benefit: JsonValue; missing_fields: JsonValue; created_at: string;
};
export type PlanPage = { items: PlanSummary[]; total: number; page: number; page_size: number };

export function planInput(name: string, pc: PC, objective: Objective, budget: string, stages: DraftStage[]): PlanInput {
  const normalize = (value: string) => {
    const result = value.trim();
    if (!result || result.length > 100 || result.includes("\0")) throw new Error("Nombre de plan y etapas: 1 a 100 caracteres, sin NUL.");
    return result;
  };
  if (!stages.length || stages.length > 12) throw new Error("El plan requiere entre 1 y 12 etapas ordenadas.");
  const input = previewInput(pc.revision, objective, budget, stages.map((stage, index) => ({ key: `stage_${index}`, replacements: stage.replacements })));
  return { name: normalize(name), pc_id: pc.id, expected_pc_revision: pc.revision, objective: input.objective, budget_ars: input.budget_ars,
    stages: stages.map((stage, index) => ({ name: normalize(stage.name), replacements: input.alternatives[index].replacements })) };
}

export function draftStages(plan: Plan): DraftStage[] {
  return plan.stages.map(stage => ({ name: stage.name, replacements: stage.replacements.map(group => ({
    category: group.category, candidates: group.candidates.map(item => ({ component_id: item.component_id, quantity: String(item.quantity) })), bios: group.candidate_context?.bios_version ?? "",
  })) }));
}

export function planError(status: number, detail?: string): string {
  if (status === 401) return "Iniciá sesión para consultar tus planes.";
  if (status === 403) return "Solicitud no autorizada. Volvé a solicitar CSRF.";
  if (status === 404) return "Plan o PC no disponible para esta sesión.";
  if (status === 409) return detail === "PC revision conflict" ? "La PC cambió. Recargá la PC actual y revisá el recálculo." : "El plan o la PC cambió. Recargá el detalle y la PC antes de recalcular.";
  if (status === 422) return "Revisá nombres, etapas, presupuesto, referencias y cantidades.";
  return "El servicio de planes no está disponible. No se confirmó ningún guardado.";
}

export async function planRequest(path = "", method = "GET", body?: PlanInput & { revision?: number }): Promise<Response> {
  const headers = new Headers();
  if (method !== "GET") {
    const csrf = await fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!csrf.ok) throw new Error(planError(csrf.status));
    const token = await csrf.json();
    if (typeof token.csrf_token !== "string") throw new Error(planError(503));
    headers.set("X-CSRF-Token", token.csrf_token); headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/plans${path}`, { method, headers, cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(20000), body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) {
    let detail: string | undefined;
    if (response.status === 409) { try { detail = (await response.json()).detail; } catch { /* Generic conflict remains safe. */ } }
    throw new Error(planError(response.status, detail));
  }
  return response;
}
