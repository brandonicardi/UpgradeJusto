import { createHash } from "node:crypto";
import type { JsonValue } from "./compatibility";
import { centralEvaluationLabel, componentChecks, installationActions, evaluationBrief } from "./evaluation-presentation";
import { money } from "./presentation";
const hidden = new Set(["owner_id", "user_id", "pc_id", "plan_id", "email", "notes", "conversation", "conversation_id", "password", "token", "path"]);
const escapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = (value: string) => value.replace(/[&<>"']/g, char => escapes[char]!);
const object = (value: JsonValue | undefined): Record<string, JsonValue> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value: JsonValue | undefined, fallback: string) => typeof value === "string" ? escape(value) : fallback;
function render(value: JsonValue, depth = 0): string {
  if (depth > 24) return "<p>Contenido técnico anidado omitido.</p>";
  if (value === null || value === undefined) return "Desconocido (null), no es cero";
  if (Array.isArray(value)) return value.length ? `<ul>${value.map(item => `<li>${render(item, depth + 1)}</li>`).join("")}</ul>` : "Sin elementos informados";
  if (typeof value === "object") return `<dl>${Object.entries(value).filter(([key]) => !hidden.has(key)).map(([key, item]) => `<dt>${escape(key)}</dt><dd>${render(item, depth + 1)}</dd>`).join("")}</dl>`;
  return escape(String(value));
}
export const sharedStyle = `:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101419;color:#f4f7fb;font:16px/1.5 Arial,Helvetica,sans-serif}main{max-width:960px;margin:auto;padding:40px 24px}h1{font-size:32px;line-height:1.2;margin:12px 0}h2{font-size:22px}h3{font-size:18px}p{margin:12px 0}.brand,.muted{color:#a9b5c5}.brand{font-weight:700}.eyebrow{font-size:14px;color:#a9b5c5;letter-spacing:1px}.card{background:#181f28;border:1px solid #354252;border-radius:12px;padding:24px;margin:24px 0}.price{font-size:30px;font-weight:700}.badge{display:inline-block;border:1px solid #52637a;border-radius:6px;padding:4px 8px;color:#d2e0f8}.warning{color:#ffd3d3;border-left:3px solid #bd7d84;padding:8px 16px}summary{cursor:pointer;min-height:44px;padding:12px 0;color:#bcd3ff}details{border-top:1px solid #354252;margin-top:16px;overflow-wrap:anywhere}dt{font-weight:700}dd{margin:8px 0 16px;color:#a9b5c5;white-space:pre-wrap}:focus-visible{outline:3px solid #a9c8ff;outline-offset:4px}footer{border-top:1px solid #354252;margin-top:32px;padding-top:20px;color:#a9b5c5;font-size:14px}@media(max-width:550px){main{padding:24px 20px}h1{font-size:28px}.card{padding:16px}}`;
export const sharedStyleHash = createHash("sha256").update(sharedStyle).digest("base64");
function stageCard(value: JsonValue, index: number): string {
  const stage = object(value), evaluation = object(stage.evaluation), scope = object(evaluation.scope);
  const identity = typeof scope.id === "string" && typeof scope.operating_regime === "string" ? { id: scope.id, operating_regime: scope.operating_regime } : undefined;
  const headline = centralEvaluationLabel({ verdict: typeof evaluation.verdict === "string" ? evaluation.verdict : "", scope: identity });
  const rules = Array.isArray(evaluation.rule_results) ? evaluation.rule_results : [];
  const blockers = rules.map(object).filter(rule => rule.state !== "pass").map(rule => {
    const check = typeof rule.rule_id === "string" ? componentChecks[rule.rule_id] : undefined;
    return `<p class="warning"><strong>${escape(check?.label ?? "Comprobación guardada")}: ${rule.state === "fail" ? "No cumple" : "Falta información"}.</strong> ${escape(check?.action ?? "Revisá los datos necesarios de esta etapa.")}</p>`;
  }).join("");
  const warnings = Array.isArray(evaluation.warnings) ? evaluation.warnings.filter((warning): warning is string => typeof warning === "string") : [];
  const additional = Array.isArray(evaluation.additional_checks) ? evaluation.additional_checks.map(object).flatMap(check => typeof check.id === "string" && typeof check.reason === "string" && typeof check.status === "string" ? [{ id: check.id, reason: check.reason, status: check.status }] : []) : [];
  return `<section class="card"><p class="eyebrow">ETAPA ${index + 1}</p><h2>${text(stage.name, "Mejora planificada")}</h2><p class="badge">${escape(headline)}</p><p class="muted">${escape(evaluationBrief({ scope: identity }))}</p>${blockers}${installationActions(warnings, additional).map(action => `<p class="warning">${escape(action)}</p>`).join("")}<details><summary>Componentes, costes y comprobación de esta etapa</summary>${render(value)}</details></section>`;
}
export function sharedHtml(snapshot: Record<string, JsonValue> | null, unavailable = false): string {
  const fields = ["title", "objective", "budget_ars", "currency", "status", "components", "stages", "cost", "benefit", "missing_fields", "limitations", "warnings", "scope", "additional_checks", "published_at", "plan_revision"];
  const status = snapshot?.status === "ready" ? "Listo según evaluación guardada" : snapshot?.status === "blocked" ? "Borrador bloqueado" : "Borrador: requiere verificación";
  const cost = object(snapshot?.cost), total = typeof cost.total_ars === "string" ? money(cost.total_ars, "ARS") : "Total por confirmar";
  const stages = Array.isArray(snapshot?.stages) ? snapshot.stages.map(stageCard).join("") : "";
  const content = snapshot ? `<section class="card"><span class="badge">${status}</span><h2>${text(snapshot.title, "Plan compartido")}</h2><p class="muted">Total histórico de componentes</p><p class="price">${escape(total)}</p><p class="muted">Precios históricos con fecha y fuente en el detalle. Envío, financiación y mano de obra excluidos, no cero.</p></section>${stages}<details><summary>Datos publicados, fuentes y condiciones completas</summary>${fields.filter(key => Object.hasOwn(snapshot, key)).map(key => `<section><h3>${escape(key)}</h3>${render(snapshot[key])}</section>`).join("")}</details>` : `<section class="card"><p>${unavailable ? "Servicio temporalmente no disponible. No se sirve una copia cacheada." : "Esta publicación no existe o dejó de estar disponible."}</p></section>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>Plan compartido | UpgradeJusto</title><style>${sharedStyle}</style></head><body><main><p class="brand">UpgradeJusto</p><p class="eyebrow">SOLO LECTURA</p><h1>${snapshot ? "Plan compartido" : "Publicación no disponible"}</h1><p class="muted">Esta copia conserva el plan publicado. Los cambios posteriores no se incorporan automáticamente.</p>${content}<footer>No certifica compatibilidad física total. Revocar deniega nuevas lecturas, no borra copias ya vistas.</footer></main></body></html>`;
}
