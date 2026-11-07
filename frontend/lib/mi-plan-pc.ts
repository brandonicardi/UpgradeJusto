// «Actualizar Mi PC»: arma la PC que quedaría al comprar hasta una compra del plan y la guarda
// solo cuando la persona lo confirma. La configuración sale de lo que ya calculó el servidor.
import { towerInput, towerRequest, towerUUID, type Tower, type TowerInput } from "./towers";
import type { TowerPlanRead } from "./tower-plans";

type Line = { category: string; component_id?: string | null; declared_model?: string | null; quantity?: number | null };
function sameParts(a: readonly Line[], b: readonly Line[]): boolean {
  const key = (lines: readonly Line[]) => lines.map(line => [line.category, line.component_id ?? "", line.declared_model ?? "", line.quantity ?? ""].join("|")).sort().join("|");
  return key(a) === key(b);
}

/** Se puede actualizar sin pisar nada si la PC es la del plan, o quedó como una compra anterior de este plan. */
export function pcMatchesPlan(plan: Pick<TowerPlanRead, "snapshot">, pc: Pick<Tower, "revision" | "lines">, index: number): boolean {
  if (pc.revision === plan.snapshot.pc_revision) return true;
  return plan.snapshot.stages.slice(0, index).some(stage => sameParts(stage.evaluated_configuration.lines, pc.lines));
}

/** PC con todo lo comprado hasta la compra `index` (desde cero), con el nombre y el contexto de la PC guardada. */
export function pcAfterPurchase(pc: Tower, plan: Pick<TowerPlanRead, "snapshot">, index: number): TowerInput {
  const stage = plan.snapshot.stages[index];
  if (!stage) throw new Error("Esa compra no está en el plan.");
  const own = new Set(pc.lines.map(line => line.line_id).filter((id): id is string => typeof id === "string"));
  const evaluated = stage.evaluated_configuration;
  return towerInput({
    schema_version: 2, name: pc.name, category_status: evaluated.category_status, context: pc.context,
    lines: evaluated.lines.map(line => ({ line_id: line.line_id && towerUUID.test(line.line_id) && own.has(line.line_id) ? line.line_id : null, category: line.category, component_id: line.component_id, declared_model: line.declared_model, quantity: line.quantity })),
  });
}

/** Guarda la PC nueva con la revisión que se leyó; si cambió, el servidor lo rechaza y no se pisa nada. */
export async function updateMyPc(pc: Tower, plan: Pick<TowerPlanRead, "snapshot">, index: number, request: typeof towerRequest = towerRequest): Promise<Tower> {
  if (!pcMatchesPlan(plan, pc, index)) throw new Error("Tu PC cambió desde que armaste el plan.");
  const response = await request(`/${pc.id}`, "PUT", { ...pcAfterPurchase(pc, plan, index), revision: pc.revision });
  return await response.json() as Tower;
}
