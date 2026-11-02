import { emptyTower, towerInput, towerKeys, type Tower, type TowerCategory, type TowerInput } from "./towers";
import type { RetailOffer, TowerComponent } from "./tower-catalog";
import type { RecommendationDraft } from "./tower-recommendations";
import type { TowerPlanDraft } from "./tower-plans";

export type PurchaseLine = { part: TowerComponent; quantity: number; offer: RetailOffer | null };
export function purchaseInput(lines: readonly PurchaseLine[], name = ""): TowerInput {
  const input = emptyTower(); input.name = `Armado propuesto (por comprar)${name.trim() ? ` · ${name.trim()}` : ""}`;
  input.category_status = { cpu: "absent", motherboard: "absent", ram: "absent", gpu: "absent", psu: "absent", case: "absent", storage: "absent", cooler: "absent", fan: "absent" };
  input.context.notes = "Configuración propuesta por comprar; no declara hardware poseído.";
  input.lines = lines.map(line => { input.category_status[line.part.category] = "present"; return { line_id: null, category: line.part.category, component_id: line.part.id, declared_model: null, quantity: line.quantity }; });
  return towerInput(input);
}
export function purchaseAdd(lines: readonly PurchaseLine[], line: PurchaseLine, mode: "replace_category" | "add_line"): PurchaseLine[] {
  if (mode === "add_line" && !["storage", "fan"].includes(line.part.category)) throw new Error("Sólo discos y ventiladores admiten añadir una línea. RAM reemplaza el conjunto completo.");
  const next = [...(mode === "replace_category" ? lines.filter(item => item.part.category !== line.part.category) : lines), line];
  purchaseInput(next); return next;
}
function cents(value: string | null): bigint | null {
  if (value === null || !/^(?:0|[1-9]\d*)\.\d{2}$/.test(value)) return null;
  const [integer, decimal] = value.split("."); return BigInt(integer) * 100n + BigInt(decimal);
}
function amount(value: bigint): string { return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`; }
export function purchaseUnselected(lines: readonly PurchaseLine[]) { return towerKeys.filter(category => !lines.some(line => line.part.category === category)); }
export function purchaseSubtotal(lines: readonly PurchaseLine[], condition: "cash" | "list") {
  let known = 0n, missing = 0;
  for (const line of lines) {
    const offer = line.offer, amount = offer && offer.component_id === line.part.id && offer.currency === "ARS" && offer.condition === condition ? cents(offer.amount) : null;
    if (amount === null) missing++; else known += amount * BigInt(line.quantity);
  }
  const value = amount(known);
  // Even when all selected lines have prices this is NOT a whole-PC total.
  return { known_subtotal_ars: value, selected_subtotal_ars: lines.length > 0 && missing === 0 ? value : null, missing_lines: missing, selected_lines: lines.length };
}
export function purchaseBudget(subtotal: ReturnType<typeof purchaseSubtotal>, budget: string) {
  const text = budget.trim(), valid = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text);
  const [integer, decimal = ""] = text.split(".");
  const parsed = valid ? cents(`${integer}.${decimal.padEnd(2, "0")}`) : null;
  const known = cents(subtotal.known_subtotal_ars)!;
  if (parsed === null || parsed <= 0n) return { budget_ars: null, known_excess_ars: null, provisional_remaining_ars: null, pending_prices: subtotal.missing_lines > 0 };
  return { budget_ars: amount(parsed), known_excess_ars: known > parsed ? amount(known - parsed) : null, provisional_remaining_ars: known <= parsed ? amount(parsed - known) : null, pending_prices: subtotal.missing_lines > 0 };
}
export function purchasePlan(pc: Tower, criteria: RecommendationDraft, catalog: string): TowerPlanDraft {
  const actions = towerKeys.flatMap(category => {
    const selected = pc.lines.filter(line => line.category === category);
    return selected.length ? [{ action: "replace_category" as const, category: category as TowerCategory, line_id: null, candidates: selected.map(line => ({ component_id: line.component_id, declared_model: line.declared_model, quantity: line.quantity })) }] : [];
  });
  return { name: "Compras del armado propuesto", pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: catalog, objective: criteria.objective, workload: criteria.objective === "productivity" ? criteria.workload : null, budget_ars: criteria.budget_ars, price_condition: criteria.price_condition, stages: [{ name: "Compras seleccionadas", budget_ars: criteria.budget_ars, materials: [], actions }] };
}
