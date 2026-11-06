import type { TowerComponent } from "./tower-catalog";
import type { Tower } from "./towers";
import { towerCompatibilityRequest, towerSimulationInput } from "./tower-compatibility";
import { emptyManualPlan, type TowerPlanDraft } from "./tower-plans";
import type { RecommendationDraft } from "./tower-recommendations";
export const pieceCategories = { cpu: "Procesadores", motherboard: "Placas madre", ram: "Memorias", gpu: "Placas de video", psu: "Fuentes", case: "Gabinetes", storage: "Almacenamiento", cooler: "Coolers", fan: "Ventiladores" };
const labels: Record<string, string> = { recommended_psu: "Fuente que necesita", length: "Largo de la pieza", interface: "Conexión", power_connector: "Cable de energía", continuous_power: "Potencia continua", capacity_per_module: "Capacidad por módulo", cores: "Núcleos", threads: "Hilos", tdp: "Consumo declarado", vram: "Memoria de video", motherboard_formats: "Formatos de placa madre", gpu_length_limit: "Largo máximo de placa de video", socket: "Conexión del procesador", memory_type: "Tipo de memoria", form_factor: "Formato", length_mm: "Largo (mm)", tdp_w: "Consumo (W)", power_connectors: "Cables de energía", capacity_gb: "Capacidad (GB)", rpm: "Velocidad de giro", wattage: "Potencia" };
export function pieceFacts(part: TowerComponent) {
  const facts = Object.entries(labels).filter(([key]) => Object.hasOwn(part.attributes, key)).map(([key, label]) => ({ label, value: part.attributes[key]?.trim() || "Falta un dato" }));
  return facts.length ? facts : [{ label: "Información de la pieza", value: "No tenemos ese dato todavía" }];
}
// Solo ordena la presentación: qué comprobaciones hablan de la categoría de la pieza. No decide ningún veredicto.
const todas = Object.keys(pieceCategories);
const ruleCategories: Record<string, string[]> = {
  T01: ["cpu", "motherboard"], T02: ["ram", "motherboard", "cpu"], T03: ["gpu", "motherboard"], T04: ["gpu", "case"],
  T05: ["psu", "gpu", "cpu"], T06: ["psu", "gpu", "motherboard"], T07: ["motherboard", "case"], T08: ["storage", "motherboard"],
  T09: ["cooler", "cpu", "case"], T10: ["fan", "case"], T11: todas, T12: ["psu", "gpu", "cpu", "storage"],
};
/** Separa las comprobaciones en las de la categoría de la pieza y el resto. Conserva el orden y no descarta ninguna. */
export function splitPieceChecks<T extends { rule_id: string }>(rules: T[], category: string) {
  const related = rules.filter(rule => ruleCategories[rule.rule_id]?.includes(category));
  return { related, others: rules.filter(rule => !related.includes(rule)) };
}
export const pieceState = { pass: "Encaja", fail: "No encaja", unknown: "Falta un dato" };
export const pieceVerdict = { compatible: "Encaja", incompatible: "No encaja", requiere_verificacion: "Falta un dato" };
const replaceWithPiece = (part: TowerComponent) => ({ action: "replace_category" as const, category: part.category, line_id: null, candidates: [{ component_id: part.id, declared_model: null, quantity: 1 }] });
export async function simulatePiece(pc: Tower, part: TowerComponent, signal: AbortSignal) {
  return towerCompatibilityRequest(pc, "simulate", towerSimulationInput(pc, [replaceWithPiece(part)]), signal);
}
/** Borrador editable en memoria: la primera etapa reemplaza la categoría por esta pieza. No guarda nada. */
export function piecePlanDraft(pc: Tower, part: TowerComponent, criteria: RecommendationDraft, catalog: string): TowerPlanDraft {
  const draft = emptyManualPlan(pc, criteria, catalog);
  return { ...draft, stages: draft.stages.map((stage, index) => index === 0 ? { ...stage, actions: [...stage.actions, replaceWithPiece(part)] } : stage) };
}
