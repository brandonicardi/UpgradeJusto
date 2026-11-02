import { towerUUID, type Tower } from "./towers";

export type AssistantContext = Readonly<{ context_version: 2; configuration_schema: 1 | 2; pc_id: string; expected_pc_revision: number; objective: "general" | "gaming" | "productivity" | null; budget_ars: string | null; price_condition: "cash" | "list"; workload: "blender-cpu" | null }>;
export type TurnCriteria = { objective: AssistantContext["objective"]; budget: string; price_condition: "cash" | "list"; workload: "blender-cpu" | null };
export const emptyTurnCriteria = (): TurnCriteria => ({ objective: null, budget: "", price_condition: "cash", workload: null });
// Event-time invalidation closes the gap before the next effect cleanup runs.
export function createContextRequestEpoch() {
  let epoch = 0;
  return { current: () => epoch, advance: () => ++epoch, isCurrent: (ticket: number) => ticket === epoch };
}
export function turnObjective(criteria: TurnCriteria, objective: TurnCriteria["objective"]): TurnCriteria {
  return { ...criteria, objective, workload: objective === "productivity" ? criteria.workload : null };
}
export function assistantContext(value: AssistantContext): AssistantContext {
  const condition = value.price_condition === undefined ? "cash" : value.price_condition;
  if (value.context_version !== 2 || ![1, 2].includes(value.configuration_schema) || typeof value.pc_id !== "string" || !towerUUID.test(value.pc_id) || !Number.isSafeInteger(value.expected_pc_revision) || value.expected_pc_revision < 1 || ![null, "general", "gaming", "productivity"].includes(value.objective) || !["cash", "list"].includes(condition) || ![null, "blender-cpu"].includes(value.workload) || (value.workload !== null && value.objective !== "productivity")) throw new Error("Revisá la PC, revisión y criterios del turno.");
  if (value.budget_ars !== null && (typeof value.budget_ars !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.budget_ars) || !/[1-9]/.test(value.budget_ars))) throw new Error("Presupuesto opcional: decimal positivo con punto, sin miles ni exponentes.");
  return Object.freeze({ context_version: 2, configuration_schema: value.configuration_schema, pc_id: value.pc_id, expected_pc_revision: value.expected_pc_revision, objective: value.objective, budget_ars: value.budget_ars, price_condition: condition, workload: value.workload });
}
export function towerTurnContext(pc: Tower, criteria: TurnCriteria): AssistantContext {
  if (pc.schema_version !== 2 || pc.origin_schema !== 2) throw new Error("Seleccioná una torre schema2 propia y recargá su revisión.");
  return assistantContext({ context_version: 2, configuration_schema: 2, pc_id: pc.id, expected_pc_revision: pc.revision, objective: criteria.objective, budget_ars: criteria.budget.trim() || null, price_condition: criteria.price_condition, workload: criteria.workload });
}
