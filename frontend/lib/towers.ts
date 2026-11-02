import { pcError } from "./pcs";

export const towerCategories = { cpu: "Procesador", motherboard: "Placa madre", ram: "Memoria RAM", gpu: "Gráfica", psu: "Fuente", case: "Gabinete", storage: "Almacenamiento", cooler: "Refrigeración del CPU", fan: "Ventiladores" } as const;
export type TowerCategory = keyof typeof towerCategories;
export const towerKeys = Object.keys(towerCategories) as TowerCategory[];
export type CategoryStatus = "present" | "unknown" | "absent";
export type TowerLine = { line_id: string | null; category: TowerCategory; component_id: string | null; declared_model: string | null; quantity: number };
export type TowerInput = { schema_version: 2; name: string; category_status: Record<TowerCategory, CategoryStatus>; lines: TowerLine[]; context: { bios_version: string | null; notes: string | null } };
export type Tower = TowerInput & { id: string; revision: number; origin_schema: 1 | 2 };
export type TowerPage = { items: Tower[]; total: number; page: number; page_size: number };
export const towerUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function emptyTower(): TowerInput {
  return { schema_version: 2, name: "", category_status: Object.fromEntries(towerKeys.map(key => [key, "unknown"])) as TowerInput["category_status"], lines: [], context: { bios_version: null, notes: null } };
}
// Build a closed payload; never send owner, evidence, verdicts or UI state.
export function towerInput(draft: TowerInput): TowerInput {
  const text = (value: string | null, max: number): string | null => {
    if (value !== null && (typeof value !== "string" || value.includes("\0") || value.trim().length > max)) throw new Error("Revisá los límites de los textos declarados.");
    return value?.trim() || null;
  };
  const name = text(draft.name, 100);
  if (!name || draft.schema_version !== 2 || draft.lines.length > 36 || Object.keys(draft.category_status).length !== 9) throw new Error("Revisá nombre, categorías y cantidad de líneas.");
  const seen = new Set<string>();
  const lines = draft.lines.map(line => {
    const component_id = text(line.component_id, 200), declared_model = text(line.declared_model, 200);
    if (!towerKeys.includes(line.category) || !Number.isInteger(line.quantity) || line.quantity < 1 || Boolean(component_id) === Boolean(declared_model)) throw new Error("Cada línea necesita una selección o modelo declarado y cantidad explícita.");
    if (line.line_id !== null) {
      if (!towerUUID.test(line.line_id) || seen.has(line.line_id)) throw new Error("Referencia de línea inválida o repetida.");
      seen.add(line.line_id);
    }
    return { line_id: line.line_id, category: line.category, component_id, declared_model, quantity: line.quantity };
  });
  const category_status = {} as TowerInput["category_status"];
  for (const key of towerKeys) {
    const status = draft.category_status[key], groups = lines.filter(line => line.category === key), count = groups.reduce((sum, line) => sum + line.quantity, 0);
    if (!["present", "unknown", "absent"].includes(status) || (status === "present" ? !groups.length : groups.length > 0)) throw new Error("Presente requiere piezas; no sé y no tengo no llevan líneas.");
    const [maxGroups, maxUnits] = key === "ram" ? [4, 16] : key === "storage" ? [16, 16] : key === "fan" ? [8, 32] : [1, 1];
    if (groups.length > maxGroups || count > maxUnits) throw new Error(`Revisá las cantidades de ${towerCategories[key]}.`);
    category_status[key] = status;
  }
  return { schema_version: 2, name, category_status, lines, context: { bios_version: text(draft.context.bios_version, 100), notes: text(draft.context.notes, 1000) } };
}
export async function towerRequest(path = "", method = "GET", data?: TowerInput & { revision?: number }): Promise<Response> {
  const headers = new Headers();
  if (method !== "GET") {
    const csrf = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
    if (!csrf.ok) throw new Error(pcError(csrf.status));
    const token = await csrf.json();
    if (typeof token.csrf_token !== "string") throw new Error(pcError(503));
    headers.set("X-CSRF-Token", token.csrf_token); headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/towers${path}`, { method, headers, cache: "no-store", credentials: "same-origin", body: data ? JSON.stringify(data) : undefined });
  if (!response.ok) throw new Error(response.status === 404 ? "Torre no disponible para esta sesión o API de torres aún no habilitada. No se guardaron cambios." : pcError(response.status));
  return response;
}
