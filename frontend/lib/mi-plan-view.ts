// Armado de la pantalla «Mi plan». Solo ordena y nombra lo que guardó el servidor:
// no suma precios, no decide compatibilidad ni marca nada como comprado por su cuenta.
import { categoryNames, categoryOrder, lineName, moneyText, type MiniPart } from "./conviene-view";
import { shortRetailDate } from "./retail-presentation";
import type { MetadataSnapshot } from "./preview-metadata";
import type { StageState, TowerPlanRead } from "./tower-plans";

export const objectiveWords = { general: "para que abra todo más rápido", gaming: "para jugar mejor", productivity: "para trabajar más rápido" } as const;

/** Rango de días de las cotizaciones guardadas; sin cotizaciones no hay texto. */
export function priceRangeText(plan: Pick<TowerPlanRead, "snapshot">): string | null {
  const days = plan.snapshot.stages.flatMap(stage => stage.offers.map(offer => offer.observed_at)).filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b));
  if (!days.length) return null;
  const first = shortRetailDate(days[0]), last = shortRetailDate(days[days.length - 1]);
  return first === last ? `Precios vistos el ${first}` : `Suma de precios vistos entre el ${first} y el ${last}`;
}

/** Lo ya comprado, tal como lo acumuló el servidor hasta la última etapa marcada. Si lo marcado no es seguido desde el principio, no se afirma ningún importe. */
export function spentAmount(plan: Pick<TowerPlanRead, "snapshot">, states: readonly StageState[]): string | null {
  let last = -1;
  for (const [index, state] of states.entries()) { if (state !== "hecha") break; last = index; }
  if (last < 0 || states.slice(last + 1).includes("hecha")) return null;
  return plan.snapshot.stages[last]?.cumulative_cost.total_ars ?? null;
}
export function spentText(plan: Pick<TowerPlanRead, "snapshot">, states: readonly StageState[]): string | null {
  return moneyText(spentAmount(plan, states));
}

export function doneCount(states: readonly StageState[]): number { return states.filter(state => state === "hecha").length; }

/** Día de la compra marcada (`dd/mm`); sin fecha válida no se muestra ninguna. */
export function boughtOn(progress: Record<string, string> | undefined, key: string | undefined): string | null {
  const value = key ? progress?.[key] : undefined;
  return value && Number.isFinite(Date.parse(value)) ? shortRetailDate(value) : null;
}

/** «Tu PC al terminar»: solo las categorías que el plan toca, con el nombre que quedaría en la última etapa. */
export function finishedParts(plan: Pick<TowerPlanRead, "snapshot">, metadata: MetadataSnapshot): MiniPart[] {
  const touched = new Set(plan.snapshot.stages.flatMap(stage => stage.actions.map(action => action.category)));
  const final = plan.snapshot.stages.at(-1)?.evaluated_configuration;
  if (!final) return [];
  return categoryOrder.filter(category => touched.has(category)).map(category => {
    const own = final.lines.filter(line => line.category === category);
    const names = own.map(line => `${line.quantity > 1 ? `${line.quantity} × ` : ""}${lineName(line, plan.snapshot.versions.catalog, metadata) ?? "Por confirmar"}`);
    return { category, label: categoryNames[category], name: own.length ? [...new Set(names)].join(", ") : final.category_status?.[category] === "absent" ? "Sin pieza de este tipo" : "Por confirmar", isNew: true };
  });
}

/** Piezas del catálogo que hay que nombrar: las que entran en cada etapa y las que quedan al final. */
export function planMetadataQueries(plan: Pick<TowerPlanRead, "snapshot">): { id: string; version: string }[] {
  const version = plan.snapshot.versions.catalog, found = new Map<string, { id: string; version: string }>();
  const lines = [...plan.snapshot.stages.flatMap(stage => [...stage.actions.flatMap(action => action.candidates), ...stage.evaluated_configuration.lines]), ...plan.snapshot.base_configuration.lines];
  for (const line of lines) if (line.component_id) found.set(line.component_id, { id: line.component_id, version });
  return [...found.values()];
}

/** Etapa: «Etapa 2 · Placa de video · la que sigue». */
export function stageKicker(position: number, category: string | undefined, state: StageState): string {
  const base = [`Etapa ${position}`, category ? categoryNames[category as keyof typeof categoryNames] ?? null : null].filter(Boolean).join(" · ");
  return state === "actual" ? `${base} · la que sigue` : base;
}
