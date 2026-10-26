import type { Category } from "./catalog";
import { pcError } from "./pcs";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Evaluation = {
  scope?: { id: string; policy_version: string; inventory_version: string; operating_regime: string; label: string; inventory_reason: string; includes: string[]; excludes: string[]; assumptions: string[] };
  additional_checks?: { id: string; status: "outside_scope" | "unknown" | "pass" | "fail"; reason: string; evidence_refs: JsonValue }[];
  warnings?: string[];
  verdict: string; rules_version: string; data_revision: string; pc_revision: string;
  rule_results: { rule_id: string; family: string; state: string; facts: JsonValue; evidence: JsonValue; conditions: JsonValue; missing_fields: JsonValue }[];
  missing_fields: JsonValue; coverage: JsonValue;
  evaluated_configuration: JsonValue;
};
type ScopeIdentity = { scope?: Pick<NonNullable<Evaluation["scope"]>, "id" | "operating_regime"> };
export function isBasicStock(result: ScopeIdentity): boolean {
  return result.scope?.id === "cu05-basic-stock-1" && result.scope.operating_regime === "stock_no_oc";
}
export function evaluationLabel(result: ScopeIdentity & { verdict: string }): string {
  if (!isBasicStock(result)) return `Resultado histórico / alcance no identificado: ${result.verdict}. No certifica compatibilidad física total.`;
  const labels: Record<string, string> = { compatible: "Compatible en alcance básico stock", incompatible: "Incompatible en alcance básico stock", requiere_verificacion: "Requiere verificación en alcance básico stock" };
  return labels[result.verdict] ?? `Estado desconocido del servidor: ${result.verdict}`;
}
const basicRuleLabels: Record<string, string> = {
  B01: "CPU, socket y BIOS", B02: "RAM: DDR, capacidad y ranuras", B03: "Interfaz GPU",
  B04: "Largo nominal GPU", B05: "Selección de fuente en stock", B06: "Conectores y cables",
  B07: "Formatos y longitud nominal de fuente",
};
export function ruleLabel(id: string, family: string): string {
  return basicRuleLabels[id] ?? (family === id ? "Comprobación del servidor" : family);
}
export function additionalStatusLabel(status: string): string {
  const labels: Record<string, string> = { outside_scope: "Fuera de alcance básico", unknown: "Pendiente adicional", pass: "Comprobación adicional aprobada", fail: "Fallo adicional informado" };
  return `${labels[status] ?? "Estado adicional no reconocido"} (${status})`;
}
export function evaluationWarnings(result: Pick<Evaluation, "warnings" | "additional_checks">): string[] {
  // Exact-text presentation deduplication only; keep every server warning/reason.
  return [...new Set([...(result.warnings ?? []), ...(result.additional_checks ?? []).map(check => check.reason)])];
}
export type Candidate = { component_id: string; quantity: number };
export type Simulation = { expected_pc_revision: number; category: Category; candidates: Candidate[]; candidate_context?: { bios_version: string | null } };

export function simulationInput(revision: number, category: Category, form: FormData): Simulation {
  const ids = form.getAll("candidate").map(String);
  const quantities = form.getAll("quantity").map(String);
  if (!Number.isInteger(revision) || revision < 1 || !ids.length || ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error("Seleccioná referencias distintas del catálogo.");
  if (category !== "ram" && ids.length !== 1) throw new Error("Esta categoría requiere exactamente una referencia.");
  const candidates = ids.map((component_id, index) => {
    const raw = quantities[index];
    if (!raw || !/^[1-8]$/.test(raw) || (category !== "ram" && raw !== "1")) throw new Error("Indicá cantidades explícitas válidas: RAM 1 a 8; otras categorías 1.");
    return { component_id, quantity: Number(raw) };
  });
  if (candidates.reduce((sum, item) => sum + item.quantity, 0) > 8) throw new Error("El conjunto candidato admite hasta 8 módulos RAM en total.");
  const result: Simulation = { expected_pc_revision: revision, category, candidates };
  if (category === "motherboard") {
    const bios = String(form.get("candidate_bios") ?? "").trim();
    if (bios.length > 100 || bios.includes("\0")) throw new Error("Revisá la BIOS declarada: hasta 100 caracteres, sin NUL.");
    result.candidate_context = { bios_version: bios || null };
  }
  return result;
}

export async function compatibilityRequest(id: string, action: "evaluate" | "simulate", body: { expected_pc_revision: number } | Simulation): Promise<Evaluation> {
  const options: RequestInit = { cache: "no-store", credentials: "same-origin" };
  const csrf = await fetch("/api/auth/csrf", options);
  if (!csrf.ok) throw new Error(pcError(csrf.status));
  const token = await csrf.json();
  if (typeof token.csrf_token !== "string") throw new Error(pcError(503));
  const response = await fetch(`/api/pcs/${id}/compatibility/${action}`, {
    ...options, method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(pcError(response.status));
  return response.json();
}
