import type { Tower, TowerCategory } from "./towers";
import { towerSimulationInput, type TowerAction, type TowerEvaluation } from "./tower-compatibility";
import type { RetailOffer } from "./tower-catalog";
import { pcError } from "./pcs";

export type RecommendationObjective = "general" | "gaming" | "productivity";
export type EvidenceRef = { source_id: string; url: string; locator: string; consulted_on: string };
export type MetricReference = { model: string; score: string; source_url: string; raw_sha256: string; version: string; observed_on: string; workload: string; unit: string; limitations: string | string[]; matched_mpn: string | null; identity_version: string; identity_source_url: string | null; identity_kind: "published_retail_mpn" | "sourced_curated_model"; samples?: number; method_url?: string; raw_url?: string; published_on?: string };
export type TowerRecommendationItem = {
  key: string; actions: TowerAction[]; evaluation: TowerEvaluation;
  benefit: { status: "unknown" | "supported" | "not_an_improvement"; before: string | null; after: string | null; source: (EvidenceRef | MetricReference)[]; workload: string | null; label?: string };
  cost: { total_ars: string | null; known_subtotal_ars: string; within_budget: boolean | null; lines: { component_id: string; quantity: number; unit_amount_ars: string; amount_ars: string; offer_id: string }[]; missing_fields: string[]; excluded: ("shipping" | "financing" | "labor")[] };
  dependencies: { kind: "thermal_compound" | TowerCategory; required: boolean; state: "included" | "available_confirmed" | "priced" | "missing"; component_id: string | null; offer_id: string | null; amount_ars: string | null; source_refs: (EvidenceRef | string)[]; reason: string }[];
  offers: RetailOffer[]; versions: { catalog: string; rules: string; references: string; identity: string; search: string };
  status: "recommended" | "requires_verification" | "rejected"; missing_fields: string[];
};
export type TowerRecommendationPreview = { pc_id: string; pc_revision: number | string; objective: RecommendationObjective; budget_ars: string; mode: "automatic" | "manual_comparison"; items: TowerRecommendationItem[]; missing_fields: string[]; limitations: string[] };
export type RecommendationDraft = { objective: RecommendationObjective; budget_ars: string; price_condition: "cash" | "list"; workload: "blender-cpu" | null; thermal_available: boolean };
export type TowerRecommendationInput = { expected_pc_revision: number; objective: RecommendationObjective; budget_ars: string; price_condition: "cash" | "list"; mode: "automatic" | "manual_comparison"; workload: "blender-cpu" | null; materials: { kind: "thermal_compound"; state: "available_confirmed"; confirmed: true }[]; alternatives: { key: string; actions: TowerAction[] }[] };
export function recommendationInput(pc: Tower, draft: RecommendationDraft, mode: TowerRecommendationInput["mode"] = "automatic", alternatives: TowerRecommendationInput["alternatives"] = []): TowerRecommendationInput {
  const budget = draft.budget_ars.trim();
  if (!Number.isInteger(pc.revision) || pc.revision < 1 || !["general", "gaming", "productivity"].includes(draft.objective) || !["cash", "list"].includes(draft.price_condition) || !["automatic", "manual_comparison"].includes(mode) || (draft.workload !== null && draft.workload !== "blender-cpu") || typeof draft.thermal_available !== "boolean") throw new Error("Revisá objetivo, condición de precio y contexto explícito.");
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(budget) || !/[1-9]/.test(budget)) throw new Error("Indicá un presupuesto ARS mayor a cero, con punto decimal y sin separadores de miles.");
  if (mode === "automatic" && alternatives.length) throw new Error("La búsqueda automática no recibe candidatas manuales.");
  if (mode === "manual_comparison" && !alternatives.length) throw new Error("La comparación manual necesita alternativas explícitas.");
  return { expected_pc_revision: pc.revision, objective: draft.objective, budget_ars: budget, price_condition: draft.price_condition, mode, workload: draft.workload, materials: draft.thermal_available ? [{ kind: "thermal_compound", state: "available_confirmed", confirmed: true }] : [], alternatives: alternatives.map(item => ({ key: item.key, actions: towerSimulationInput(pc, item.actions).actions })) };
}
export function recommendationStatus(item: TowerRecommendationItem): string {
  if (item.status === "rejected") return "Propuesta descartada por el servidor";
  if (item.status !== "recommended") return "Necesita verificación antes de recomendar";
  if (item.evaluation.verdict !== "compatible" || !item.evaluation.coverage.complete || item.evaluation.missing_fields.length || item.evaluation.rule_results.some(rule => rule.state !== "pass") || item.missing_fields.length || item.cost.total_ars === null || item.cost.within_budget !== true || item.cost.missing_fields.length || item.benefit.status !== "supported" || item.dependencies.some(dep => dep.required && !["included", "available_confirmed", "priced"].includes(dep.state))) return "Resultado incompleto: revisá los faltantes del servidor";
  return "Recomendación del servidor dentro del alcance declarado";
}
// External evidence is untrusted. Links are click-only, never image/iframe/fetch targets.
export function publicEvidenceURL(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value), host = url.hostname;
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || !host.includes(".") || host.startsWith("[") || /^\d+(?:\.\d+){3}$/.test(host) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}
export type RecommendationState = { phase: "idle" | "working" | "done" | "error"; message: string; result: TowerRecommendationPreview | null };
class RecommendationError extends Error {}
export function createTowerRecommendations(deps: { onState: (state: RecommendationState) => void; request?: typeof fetch }) {
  const request = deps.request ?? fetch; let generation = 0, active: AbortController | null = null;
  function stop() { generation++; active?.abort(); active = null; }
  const state = (phase: RecommendationState["phase"], message: string, result: TowerRecommendationPreview | null = null) => deps.onState({ phase, message, result });
  return {
    dispose: stop,
    invalidate() { stop(); state("idle", "Los datos cambiaron. Buscá de nuevo para obtener propuestas con estos criterios."); },
    cancel() { stop(); state("idle", "Consulta cancelada. No se solicitó guardar una PC ni un plan."); },
    async run(pc: Tower, draft: RecommendationDraft) {
      if (active) return;
      let body: TowerRecommendationInput;
      try { body = recommendationInput(pc, draft); } catch (error) { state("error", error instanceof Error ? error.message : "Revisá el presupuesto."); return; }
      const controller = new AbortController(), ticket = ++generation; active = controller; state("working", "Buscando propuestas en el servidor…");
      try {
        const csrf = await request("/api/auth/csrf", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (!csrf.ok) throw new RecommendationError(pcError(csrf.status));
        const token = await csrf.json(); if (typeof token.csrf_token !== "string") throw new RecommendationError(pcError(503));
        if (controller.signal.aborted) return;
        const response = await request(`/api/towers/${pc.id}/recommendations/preview`, { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(body) });
        if (!response.ok) throw new RecommendationError(response.status === 409 ? "La PC guardada cambió. Los criterios se conservan: seleccioná de nuevo tu PC para revisar su nueva versión antes de consultar." : response.status === 429 ? "Demasiadas consultas. Esperá antes de intentar explícitamente otra vez." : pcError(response.status));
        const result = await response.json() as TowerRecommendationPreview;
        if (result.pc_id !== pc.id || String(result.pc_revision) !== String(pc.revision) || result.objective !== body.objective || result.mode !== body.mode || !Array.isArray(result.items) || !Array.isArray(result.missing_fields) || !Array.isArray(result.limitations)) throw new RecommendationError("La respuesta no corresponde a esta PC y consulta. No se muestra como propuesta válida.");
        if (ticket === generation && !controller.signal.aborted) state("done", "Propuestas recibidas. Tu PC y tus planes no cambiaron.", result);
      } catch (error) { if (ticket === generation && !controller.signal.aborted) state("error", error instanceof RecommendationError ? error.message : "No se pudo consultar. Conservamos tus criterios; no se reintentó ni se guardó nada automáticamente."); }
      finally { if (ticket === generation) active = null; }
    },
  };
}
