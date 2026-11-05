import { towerUUID, towerKeys, type Tower } from "./towers";
import type { TowerAction, TowerEvaluation } from "./tower-compatibility";
import type { TowerRecommendationInput, TowerRecommendationItem, RecommendationObjective, RecommendationDraft } from "./tower-recommendations";
import type { RetailOffer } from "./tower-catalog";

export type PlanCost = TowerRecommendationItem["cost"];
export type PlanBenefit = TowerRecommendationItem["benefit"];
export type PlanDependency = TowerRecommendationItem["dependencies"][number];
export type TowerMaterial = TowerRecommendationInput["materials"][number];
// Server serialization may omit None on non-targeted canonical actions. Output
// payloads remain TowerAction with explicit null; targeted omissions stay invalid.
export type CanonicalPlanAction = Omit<TowerAction, "line_id"> & { line_id?: string | null };
export type PlanStageInput = { name: string; budget_ars: string; materials: TowerMaterial[]; actions: TowerAction[] };
export type TowerPlanDraft = { name: string; pc_id: string; expected_pc_revision: number; expected_catalog_version: string; objective: RecommendationObjective; workload: "blender-cpu" | null; budget_ars: string; price_condition: "cash" | "list"; stages: PlanStageInput[] };
export type TowerPlanCreate = TowerPlanDraft & { kind: "tower_plan"; schema_version: 2; client_request_id: string };
export type TowerPlanRecalculate = TowerPlanCreate & { expected_plan_revision: number };
export type PlanStageRead = Omit<PlanStageInput, "actions"> & { actions: CanonicalPlanAction[]; position: number; evaluated_configuration: Tower; evaluation: TowerEvaluation; benefit: PlanBenefit; dependencies: PlanDependency[]; offers: RetailOffer[]; cost: PlanCost; cumulative_cost: PlanCost; status: "blocked" | "ready" | "requires_verification"; missing_fields: string[]; warnings: string[] };
export type TowerPlanSnapshot = { kind: "tower_plan"; schema_version: 2; name: string; generated_at: string; pc_revision: number; base_configuration: Tower; objective: RecommendationObjective; workload: "blender-cpu" | null; budget_ars: string; currency: "ARS"; price_condition: "cash" | "list"; versions: { catalog: string; rules: string; policy: string; inventory: string; scope: string; references: string; identity: string; calculation: string }; stages: PlanStageRead[]; cost: PlanCost; benefit: PlanBenefit; status: "blocked" | "ready" | "requires_verification"; label: string; missing_fields: string[]; limitations: string[] };
export type TowerPlanRead = { kind: "tower_plan"; schema_version: 2; id: string; name: string; revision: number; pc_id: string | null; created_at: string; updated_at: string; snapshot: TowerPlanSnapshot; stage_keys: string[]; progress: Record<string, string> };
export type TowerPlanPage = { kind: "tower_plan"; schema_version: 2; items: TowerPlanRead[]; total: number; page: number; page_size: number };
export function positiveRevision(value: number): boolean { return Number.isSafeInteger(value) && value >= 1; }
export function planMoney(value: string): string {
  const text = value.trim(), match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match || !/[1-9]/.test(text)) throw new Error("Presupuesto ARS mayor a cero, sin miles y con hasta dos decimales separados por punto.");
  return `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}`;
}
// Explicit manual preparation only: no purchases, materials, verdict or write.
export function emptyManualPlan(pc: Tower, criteria: RecommendationDraft, catalog: string): TowerPlanDraft {
  if (!catalog.trim() || catalog.length > 200 || catalog.includes("\0")) throw new Error("Consultá el catálogo antes de preparar el plan.");
  const budget = planMoney(criteria.budget_ars);
  return { name: `Mejora de ${pc.name}`, pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: catalog, objective: criteria.objective, workload: criteria.objective === "productivity" ? criteria.workload : null, budget_ars: budget, price_condition: criteria.price_condition, stages: [{ name: "Primera etapa", budget_ars: budget, actions: [], materials: [] }] };
}
function clean(value: string): string { const text = value.trim(); if (!text || text.includes("\0")) throw new Error("Completá los nombres sin NUL."); return text; }
// Structural wire validation only. Ownership, accumulated rule decisions, cost
// and cross-stage line assignments belong exclusively to the server.
export function planActions(input: CanonicalPlanAction[]): TowerAction[] {
  if (!input.length || input.length > 36) throw new Error("Cada etapa necesita entre1 y36 acciones.");
  return input.map(item => {
    if (!towerKeys.includes(item.category) || !["replace_category", "replace_line", "add_line", "remove_line"].includes(item.action)) throw new Error("Acción no válida.");
    const targeted = item.action === "replace_line" || item.action === "remove_line";
    if (targeted ? typeof item.line_id !== "string" || !towerUUID.test(item.line_id) : item.line_id !== undefined && item.line_id !== null) throw new Error("La acción requiere una línea propia confirmada por el servidor, o null para categoría completa/añadir.");
    if (item.category === "ram" && item.action !== "replace_category") throw new Error("RAM reemplaza TODO el conjunto, no se amplía implícitamente.");
    if (item.action === "add_line" && !["storage", "fan"].includes(item.category)) throw new Error("Añadir línea sólo corresponde a discos o ventiladores.");
    if (item.action === "remove_line" ? item.candidates.length !== 0 : !item.candidates.length || (item.action !== "replace_category" && item.candidates.length !== 1)) throw new Error("Revisá las candidatas de la acción.");
    const candidates = item.candidates.map(candidate => {
      const component_id = candidate.component_id?.trim() || null, declared_model = candidate.declared_model?.trim() || null;
      if (Boolean(component_id) === Boolean(declared_model) || (declared_model && (declared_model.length > 200 || declared_model.includes("\0"))) || !Number.isInteger(candidate.quantity) || candidate.quantity < 1) throw new Error("Selección O modelo declarado y cantidad explícita son obligatorios; desconocido no es1.");
      return { component_id, declared_model, quantity: candidate.quantity };
    });
    const [groups, units] = item.category === "ram" ? [4, 16] : item.category === "storage" ? [16, 16] : item.category === "fan" ? [8, 32] : [1, 1];
    if (candidates.length > groups || candidates.reduce((sum, candidate) => sum + candidate.quantity, 0) > units) throw new Error("Candidatas fuera de los límites de líneas/cantidades.");
    const board = item.category === "motherboard" && ["replace_category", "replace_line"].includes(item.action);
    if (item.candidate_context !== undefined && !board) throw new Error("BIOS candidata sólo en reemplazo de placa.");
    const result: TowerAction = { action: item.action, category: item.category, line_id: targeted ? item.line_id! : null, candidates };
    if (board) { const bios = item.candidate_context?.bios_version?.trim() || null; if (bios && (bios.length > 100 || bios.includes("\0"))) throw new Error("BIOS candidata inválida."); result.candidate_context = { bios_version: bios }; }
    return result;
  });
}
export function towerPlanInput(draft: TowerPlanDraft, requestId: string, expectedPlanRevision?: number): TowerPlanCreate | TowerPlanRecalculate {
  if (!towerUUID.test(requestId) || !towerUUID.test(draft.pc_id) || !positiveRevision(draft.expected_pc_revision) || (expectedPlanRevision !== undefined && !positiveRevision(expectedPlanRevision))) throw new Error("Revisá las referencias y revisiones de la operación.");
  const catalog = draft.expected_catalog_version.trim();
  if (!catalog || catalog.length > 200 || catalog.includes("\0") || !["general", "gaming", "productivity"].includes(draft.objective) || !["cash", "list"].includes(draft.price_condition) || (draft.workload !== null && (draft.workload !== "blender-cpu" || draft.objective !== "productivity"))) throw new Error("Contexto, trabajo u objetivo de plan inválido.");
  if (!draft.stages.length || draft.stages.length > 12 || draft.stages.reduce((sum, stage) => sum + stage.actions.length, 0) > 96) throw new Error("Usá1..12 etapas y hasta96 acciones totales.");
  const stages = draft.stages.map(stage => {
    if (stage.materials.length > 1 || stage.materials.some(material => material.kind !== "thermal_compound" || material.state !== "available_confirmed" || material.confirmed !== true)) throw new Error("Materiales sólo por confirmación explícita en esta etapa.");
    return { name: clean(stage.name), budget_ars: planMoney(stage.budget_ars), materials: stage.materials.map(() => ({ kind: "thermal_compound" as const, state: "available_confirmed" as const, confirmed: true as const })), actions: planActions(stage.actions) };
  });
  return { kind: "tower_plan", schema_version: 2, client_request_id: requestId, name: clean(draft.name), pc_id: draft.pc_id, expected_pc_revision: draft.expected_pc_revision, expected_catalog_version: catalog, objective: draft.objective, workload: draft.workload, budget_ars: planMoney(draft.budget_ars), price_condition: draft.price_condition, stages, ...(expectedPlanRevision === undefined ? {} : { expected_plan_revision: expectedPlanRevision }) };
}
export function planDraftFromRead(plan: TowerPlanRead, pc: Tower, catalog: string): TowerPlanDraft {
  const source = plan.snapshot;
  return { name: plan.name, pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: catalog, objective: source.objective, workload: source.workload, budget_ars: source.budget_ars, price_condition: source.price_condition, stages: source.stages.map(stage => ({ name: stage.name, budget_ars: stage.budget_ars, actions: planActions(stage.actions), materials: [] })) };
}
export function planStateLabel(status: string): string { return status === "ready" ? "Listo según el servidor, dentro del alcance declarado" : status === "blocked" ? "Plan bloqueado: revisá los motivos" : "Plan pendiente de verificación"; }
export class TowerPlanError extends Error { constructor(public status: number) { super(status === 409 ? "Conflicto de revisión, catálogo o clave de operación. Tu borrador se conserva; recargá y revisá explícitamente, sin guardar automáticamente." : status === 401 ? "Iniciá sesión para consultar tus planes." : status === 404 ? "Plan/revisión no disponible para esta sesión." : status === 429 ? "Demasiadas solicitudes. Esperá antes de volver a consultar." : "No se completó la operación. Revisá datos, permisos y disponibilidad; no hubo reintento automático."); } }
export async function towerPlanRequest(path: string, method = "GET", body?: string, signal?: AbortSignal, request: typeof fetch = fetch, sending?: () => void): Promise<Response> {
  const headers = new Headers();
  if (method !== "GET") {
    const csrf = await request("/api/auth/csrf", { credentials: "same-origin", cache: "no-store", signal }); if (!csrf.ok) throw new TowerPlanError(csrf.status);
    const token = await csrf.json(); if (typeof token.csrf_token !== "string") throw new TowerPlanError(503);
    if (signal?.aborted) throw new Error("Cancelled"); headers.set("X-CSRF-Token", token.csrf_token); headers.set("Content-Type", "application/json");
  }
  sending?.(); const response = await request(`/api/tower-plans${path}`, { method, headers, body, signal, credentials: "same-origin", cache: "no-store" }); if (!response.ok) throw new TowerPlanError(response.status); return response;
}
const stageKeyPattern = /^[0-9a-f]{64}$/;
export type StageState = "hecha" | "actual" | "pendiente" | "propuesta";
// Una etapa está marcada si el servidor guardó su clave. La primera sin marcar es la actual.
// En una versión anterior no hay progreso: todo sigue siendo una propuesta.
export function planStageStates(plan: Pick<TowerPlanRead, "stage_keys" | "progress"> & { snapshot: { stages: unknown[] } }, progress: Record<string, string> = plan.progress, historical = false): StageState[] {
  if (historical) return plan.snapshot.stages.map(() => "propuesta");
  let current = false;
  const keys = plan.stage_keys ?? [], marks = progress ?? {};
  return plan.snapshot.stages.map((_, index) => {
    const key = keys[index];
    if (key !== undefined && Object.hasOwn(marks, key)) return "hecha";
    if (current) return "pendiente";
    current = true; return "actual";
  });
}
export function planProgressSummary(states: StageState[]): string | null {
  const done = states.filter(state => state === "hecha").length;
  return done ? `${done} de ${states.length} ${states.length === 1 ? "etapa comprada" : "etapas compradas"}` : null;
}
// Marca (PUT) o desmarca (DELETE) una etapa. Sin cuerpo: el dueño sale de la sesión. Devuelve el progreso confirmado por el servidor.
export async function setStageProgress(planId: string, stageKey: string, done: boolean, signal?: AbortSignal, request: typeof fetch = fetch): Promise<Record<string, string>> {
  if (!towerUUID.test(planId) || !stageKeyPattern.test(stageKey)) throw new Error("Esa etapa no se puede marcar.");
  const response = await towerPlanRequest(`/${planId}/stages/${stageKey}/progress`, done ? "PUT" : "DELETE", undefined, signal, request);
  const body = await response.json() as { kind?: unknown; progress?: unknown };
  const progress = body.progress;
  if (body.kind !== "tower_plan_progress" || typeof progress !== "object" || progress === null || Array.isArray(progress) || Object.entries(progress).some(([key, value]) => !stageKeyPattern.test(key) || typeof value !== "string")) throw new Error("Respuesta de progreso inválida.");
  return progress as Record<string, string>;
}
export type PlanWriteState = { phase: "idle" | "saving" | "error" | "uncertain" | "saved"; message: string };
export function createTowerPlanWriter(deps: { onState: (state: PlanWriteState) => void; onSaved: (plan: TowerPlanRead) => void; request?: typeof fetch; uuid?: () => string }) {
  let active: AbortController | null = null, generation = 0, phase: PlanWriteState["phase"] = "idle", pending: { path: string; body: string } | null = null;
  const state = (next: PlanWriteState["phase"], message: string) => { phase = next; deps.onState({ phase, message }); };
  function stop() { generation++; active?.abort(); active = null; }
  async function send(operation: { path: string; body: string }) {
    if (active) return; pending = operation; const controller = new AbortController(), ticket = ++generation; active = controller; let sent = false; state("saving", "Guardando una revisión del plan; tu PC no se modifica…");
    try {
      const response = await towerPlanRequest(operation.path, "POST", operation.body, controller.signal, deps.request, () => { sent = true; }); const plan = await response.json() as TowerPlanRead;
      if (plan.kind !== "tower_plan" || plan.schema_version !== 2 || !towerUUID.test(plan.id) || !positiveRevision(plan.revision)) throw new Error("Invalid plan response");
      if (ticket === generation && !controller.signal.aborted) { pending = null; state("saved", response.status === 200 ? "Operación confirmada por el servidor (puede ser replay idempotente). La PC no cambió." : "Plan guardado como revisión propia. La PC no cambió."); deps.onSaved(plan); }
    } catch (error) {
      if (ticket === generation && !controller.signal.aborted) {
        const uncertain = sent && (!(error instanceof TowerPlanError) || error.status >= 500 || error.status === 408);
        if (!uncertain) pending = null;
        state(uncertain ? "uncertain" : "error", uncertain ? "Guardado incierto. Revisá tus planes. Sólo el reintento explícito conserva exactamente el cuerpo y UUID anteriores; cancelar no revierte el servidor." : error instanceof TowerPlanError ? error.message : "No se pudo preparar el envío. El borrador se conserva.");
      }
    } finally { if (ticket === generation) active = null; }
  }
  return {
    dispose: stop,
    changed() { if (active) return; const uncertain = phase === "uncertain"; pending = null; state("idle", uncertain ? "Editaste el borrador: el próximo guardado usará otra UUID. La operación anterior pudo guardarse; revisá tus planes antes de crear otra." : "Borrador modificado; se guardará sólo con confirmación explícita."); },
    cancel() { const saving = !!active; stop(); state(saving ? "uncertain" : "idle", saving ? "Espera cancelada; el servidor pudo guardar. Revisá planes antes de reintentar la misma operación." : "No se envió una operación nueva."); },
    async save(draft: TowerPlanDraft, planId?: string, revision?: number) {
      if (active || phase === "uncertain" || phase === "saved") return;
      try { if ((planId !== undefined && (!towerUUID.test(planId) || revision === undefined)) || (planId === undefined && revision !== undefined)) throw new Error("Destino de recálculo inválido."); const body = towerPlanInput(draft, (deps.uuid ?? (() => crypto.randomUUID()))(), revision); await send({ path: planId ? `/${planId}/recalculate` : "", body: JSON.stringify(body) }); } catch (error) { state("error", error instanceof Error ? error.message : "Revisá el plan."); }
    },
    async retry() { if (!active && phase === "uncertain" && pending) await send(pending); },
  };
}
