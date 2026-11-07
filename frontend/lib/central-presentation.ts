import type { JsonValue } from "./compatibility";
import { towerCategories, type Tower } from "./towers";

// Snapshot declarations, not a requirements engine or compatibility decision.
export function configurationNextSteps(pc: Tower): string[] {
  const categories = ["cpu", "motherboard", "ram", "psu", "case", "storage"] as const;
  const absent = categories.filter(category => pc.category_status[category] === "absent");
  const unknown = categories.filter(category => pc.category_status[category] === "unknown");
  return [
    ...(absent.length ? [`Elegí o revisá los componentes declarados ausentes en la base del plan: ${absent.map(category => towerCategories[category]).join(", ")}.`] : []),
    ...(unknown.length ? [`Confirmá qué tenés en la base del plan: ${unknown.map(category => towerCategories[category]).join(", ")}. No sé no significa ausente.`] : []),
  ];
}

// Display only: never used to decide compatibility, cost or permission.
export function actionLabel(value: string): string {
  const labels: Record<string, string> = { replace_category: "Reemplazar conjunto completo", replace_line: "Reemplazar línea", add_line: "Añadir línea", remove_line: "Retirar línea" };
  return Object.hasOwn(labels, value) ? labels[value] : "Acción sin traducción; revisar detalle técnico";
}
function recognizedMissingLabel(value: string): string | null {
  const stageOffer = /^stages\.([1-9]\d*).offer:unidentified_component$/.exec(value);
  if (stageOffer) return `Etapa ${stageOffer[1]}: componente sin identificar; falta cotización`;
  const labels: Record<string, string> = {
    "offer:unidentified_component": "Componente sin identificar; falta cotización",
    "offer.missing": "Falta una cotización",
    "cpu.socket": "Falta confirmar el socket del procesador",
    "context.bios_version": "La versión de BIOS guardada es solo un dato: no se evalúa ni bloquea la revisión",
    "search:bounded_not_exhaustive": "Búsqueda acotada; no se evaluaron todas las combinaciones",
  };
  return Object.hasOwn(labels, value) ? labels[value] : null;
}
export function missingLabel(value: string): string {
  return recognizedMissingLabel(value) ?? "Dato o condición pendiente; revisá el código en el detalle técnico";
}
export function pendingGroups(fields: readonly JsonValue[]): { total: number; groups: { summary: string; count: number }[]; remainingCount: number; unknownCount: number } {
  const counts = new Map<string, number>();
  let unknownCount = 0;
  for (const field of fields) {
    const summary = typeof field === "string" ? recognizedMissingLabel(field) : null;
    if (summary === null) { unknownCount++; continue; }
    counts.set(summary, (counts.get(summary) ?? 0) + 1);
  }
  // Stable first occurrence order, with a bounded number of distinct summaries.
  // remainingCount includes unknowns AND entries in recognized groups not shown.
  const groups = [...counts].slice(0, 3).map(([summary, count]) => ({ summary, count }));
  return { total: fields.length, groups, remainingCount: fields.length - groups.reduce((sum, group) => sum + group.count, 0), unknownCount };
}
export function workloadLabel(value: string | null): string {
  return value === "blender-cpu" ? "Blender: render con procesador" : value === null ? "Trabajo no especificado" : "Trabajo de referencia sin traducción; ver detalle técnico";
}
