import type { JsonValue } from "./compatibility";
import { pcError } from "./pcs";
import { towerKeys, towerUUID, type Tower, type TowerCategory } from "./towers";

export type TowerEvaluation = {
  verdict: "compatible" | "incompatible" | "requiere_verificacion";
  rule_results: { rule_id: string; family: string; state: "pass" | "fail" | "unknown"; facts: JsonValue[]; evidence: JsonValue[]; conditions: JsonValue[]; missing_fields: JsonValue[] }[];
  missing_fields: JsonValue[]; rules_version: "cu05-tower-stock-engine-1"; data_revision: string; pc_revision: string | number;
  scope: { id: "cu05-tower-stock-1"; policy_version: "tower-stock-policy-1"; inventory_version: "tower-stock-inventory-1"; label: string; operating_regime: "stock_no_oc"; excludes: string[] };
  coverage: { required: JsonValue; implemented: JsonValue; evaluated: JsonValue; passed: JsonValue; failed: JsonValue; unknown: JsonValue; not_applicable: JsonValue; not_implemented: JsonValue; complete: boolean };
  additional_checks: { id: string; status: string; reason: string }[]; warnings: string[]; evaluated_configuration: Tower;
};
export type TowerCandidate = { component_id: string | null; declared_model: string | null; quantity: number };
export type TowerAction = { action: "replace_category" | "replace_line" | "add_line" | "remove_line"; category: TowerCategory; line_id: string | null; candidates: TowerCandidate[]; candidate_context?: { bios_version: string | null } };
export type TowerSimulation = { expected_pc_revision: number; actions: TowerAction[] };
export const towerRuleLabels: Record<string, string> = { T01: "CPU y BIOS", T02: "Memoria RAM", T03: "Interfaz de la gráfica", T04: "Largo de la gráfica", T05: "Fuente de alimentación", T06: "Conexiones", T07: "Formatos", T08: "Almacenamiento", T09: "Refrigeración del CPU", T10: "Ventiladores", T11: "Identificación y presencia", T12: "Recursos compartidos y potencia" };
export function towerResultLabel(result: TowerEvaluation): string {
  if (result.scope?.id !== "cu05-tower-stock-1" || result.scope.operating_regime !== "stock_no_oc") return "Alcance no identificado: revisá el detalle del servidor";
  const label = { compatible: "Compatible dentro del alcance torre stock", incompatible: "Hay incompatibilidades en tu torre", requiere_verificacion: "Faltan datos para comprobar tu torre" }[result.verdict];
  // A contradictory/partial response must never acquire a green headline.
  if (result.verdict === "compatible" && (!result.coverage.complete || result.missing_fields.length || result.rule_results.some(rule => rule.state !== "pass"))) return "Resultado inconsistente o incompleto: requiere revisión del servidor";
  return label ?? "Estado del servidor no reconocido";
}
export function towerSimulationInput(pc: Tower, input: TowerAction[]): TowerSimulation {
  if (!Number.isInteger(pc.revision) || pc.revision < 1 || !input.length) throw new Error("Agregá al menos una acción manual sobre la revisión guardada.");
  let working = pc.lines.map(line => ({ ...line }));
  const actions = input.map(item => {
    if (!towerKeys.includes(item.category) || !["replace_category", "replace_line", "add_line", "remove_line"].includes(item.action)) throw new Error("Acción o categoría no válida.");
    const targeted = item.action === "replace_line" || item.action === "remove_line";
    const target = targeted ? working.find(line => line.line_id === item.line_id && line.category === item.category) : null;
    if (targeted ? !item.line_id || !towerUUID.test(item.line_id) || !target : item.line_id !== null) throw new Error("Elegí una línea propia de esta PC y categoría; no se aceptan IDs candidatos.");
    if (item.category === "ram" && item.action !== "replace_category") throw new Error("RAM sustituye TODO el conjunto mediante reemplazo de categoría.");
    if (item.action === "add_line" && !["storage", "fan"].includes(item.category)) throw new Error("Sólo almacenamiento y ventiladores admiten añadir líneas.");
    if (item.action === "remove_line" ? item.candidates.length !== 0 : !item.candidates.length || (item.action !== "replace_category" && item.candidates.length !== 1)) throw new Error("Revisá la cantidad de candidatas para esta acción.");
    const candidates = item.candidates.map(candidate => {
      const component_id = candidate.component_id?.trim() || null, declared_model = candidate.declared_model?.trim() || null;
      if (Boolean(component_id) === Boolean(declared_model) || (declared_model && (declared_model.length > 200 || declared_model.includes("\0"))) || !Number.isInteger(candidate.quantity) || candidate.quantity < 1) throw new Error("Cada candidata requiere selección O modelo declarado y cantidad entera explícita.");
      return { component_id, declared_model, quantity: candidate.quantity };
    });
    const replacementBoard = item.category === "motherboard" && ["replace_category", "replace_line"].includes(item.action);
    if (item.candidate_context !== undefined && !replacementBoard) throw new Error("La BIOS candidata sólo corresponde a reemplazos de placa madre.");
    const action: TowerAction = { action: item.action, category: item.category, line_id: targeted ? item.line_id : null, candidates };
    if (replacementBoard) {
      const bios = item.candidate_context?.bios_version?.trim() || null;
      if (bios && (bios.length > 100 || bios.includes("\0"))) throw new Error("Revisá la BIOS candidata (máximo100 caracteres).");
      action.candidate_context = { bios_version: bios };
    }
    if (item.action === "replace_category") working = working.filter(line => line.category !== item.category);
    else if (targeted) working = working.filter(line => line !== target);
    working.push(...candidates.map(candidate => ({ ...candidate, category: item.category, line_id: null })));
    if (working.length > 36) throw new Error("La copia simulada excede36 líneas.");
    for (const category of towerKeys) {
      const lines = working.filter(line => line.category === category), total = lines.reduce((sum, line) => sum + line.quantity, 0);
      const [groups, units] = category === "ram" ? [4, 16] : category === "storage" ? [16, 16] : category === "fan" ? [8, 32] : [1, 1];
      if (lines.length > groups || total > units) throw new Error("La copia simulada excede los límites de líneas o cantidades de una categoría.");
    }
    return action;
  });
  return { expected_pc_revision: pc.revision, actions };
}
export async function towerCompatibilityRequest(pc: Tower, action: "evaluate" | "simulate", simulation: TowerSimulation | undefined, signal: AbortSignal): Promise<TowerEvaluation> {
  const csrf = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin", signal });
  if (!csrf.ok) throw new Error(pcError(csrf.status));
  const token = await csrf.json();
  if (typeof token.csrf_token !== "string") throw new Error(pcError(503));
  const body = action === "evaluate" ? { expected_pc_revision: pc.revision } : simulation;
  if (!body) throw new Error("Falta la propuesta manual de simulación.");
  const response = await fetch(`/api/towers/${pc.id}/${action}`, { method: "POST", credentials: "same-origin", cache: "no-store", signal, headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(response.status === 409 ? "La revisión guardada cambió. Tu propuesta manual no se borró. Seleccioná de nuevo la PC para recargarla antes de comprobar." : pcError(response.status));
  return response.json();
}
