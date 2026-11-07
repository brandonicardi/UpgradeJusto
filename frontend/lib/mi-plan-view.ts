// Armado de la pantalla «Mi plan». Solo ordena y nombra lo que guardó el servidor:
// no suma precios, no decide compatibilidad ni marca nada como comprado por su cuenta.
// Lo único que cuenta es una estimación de meses, rotulada como tal.
import { categoryNames, categoryOrder, lineName, moneyText, type MiniPart } from "./conviene-view";
import { shortRetailDate } from "./retail-presentation";
import type { MetadataSnapshot } from "./preview-metadata";
import type { StageState, TowerPlanRead, TowerPlanSnapshot, PlanBenefit } from "./tower-plans";
import type { Tower, TowerCategory } from "./towers";

export const objectiveWords = { general: "para que abra todo más rápido", gaming: "para jugar mejor", productivity: "para trabajar más rápido" } as const;

/** Rango de días de las cotizaciones guardadas; sin cotizaciones no hay texto. */
export function priceRangeText(plan: Pick<TowerPlanRead, "snapshot">): string | null {
  const days = plan.snapshot.stages.flatMap(stage => stage.offers.map(offer => offer.observed_at)).filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b));
  if (!days.length) return null;
  const first = shortRetailDate(days[0]), last = shortRetailDate(days[days.length - 1]);
  return first === last ? `Con los precios del ${first}` : `Con los precios del ${first} al ${last}`;
}

export function doneCount(states: readonly StageState[]): number { return states.filter(state => state === "hecha").length; }

/** Día de la compra marcada (`dd/mm`); sin fecha válida no se muestra ninguna. */
export function boughtOn(progress: Record<string, string> | undefined, key: string | undefined): string | null {
  const value = key ? progress?.[key] : undefined;
  return value && Number.isFinite(Date.parse(value)) ? shortRetailDate(value) : null;
}

/** «Tu PC al terminar»: solo las categorías que el plan toca, con el nombre que quedaría en la última compra. */
export function finishedParts(plan: Pick<TowerPlanRead, "snapshot">, metadata: MetadataSnapshot): MiniPart[] {
  const touched = new Set(plan.snapshot.stages.flatMap(stage => stage.actions.map(action => action.category)));
  const final = plan.snapshot.stages.at(-1)?.evaluated_configuration;
  if (!final) return [];
  return categoryOrder.filter(category => touched.has(category)).map(category => {
    const own = final.lines.filter(line => line.category === category);
    const names = own.map(line => `${line.quantity > 1 ? `${line.quantity} × ` : ""}${lineName(line, plan.snapshot.versions.catalog, metadata) ?? "Por confirmar"}`);
    return { category, label: categoryNames[category], name: own.length ? [...new Set(names)].join(", ") : final.category_status?.[category] === "absent" ? "Sin componente de este tipo" : "Por confirmar", isNew: true };
  });
}

/** Componentes del catálogo que hay que nombrar: los que entran en cada compra y las que quedan al final. */
export function planMetadataQueries(plan: Pick<TowerPlanRead, "snapshot">): { id: string; version: string }[] {
  const version = plan.snapshot.versions.catalog, found = new Map<string, { id: string; version: string }>();
  const lines = [...plan.snapshot.stages.flatMap(stage => [...stage.actions.flatMap(action => action.candidates), ...stage.evaluated_configuration.lines]), ...plan.snapshot.base_configuration.lines];
  for (const line of lines) if (line.component_id) found.set(line.component_id, { id: line.component_id, version });
  return [...found.values()];
}

/** Compra: «Compra 2 · Placa de video · la que sigue». */
export function stageKicker(position: number, category: string | undefined, state: StageState): string {
  const base = [`Compra ${position}`, category ? categoryNames[category as keyof typeof categoryNames] ?? null : null].filter(Boolean).join(" · ");
  return state === "actual" ? `${base} · la que sigue` : base;
}

/** Lo visible dice «compra», no «etapa»: los nombres guardados con «Etapa 2» o «Primera etapa» se leen como compras. */
export function stageTitle(name: string): string {
  return name.replace(/\betapas\b/gi, match => match[0] === "E" ? "Compras" : "compras").replace(/\betapa\b/gi, match => match[0] === "E" ? "Compra" : "compra");
}

const cents = (value: string | null | undefined): bigint | null => {
  const match = typeof value === "string" ? /^(\d+)(?:\.(\d{1,2}))?$/.exec(value) : null;
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0") : null;
};

/** La ganancia dicha con palabras simples, solo si el servidor la respalda con datos de referencia. Sin dato, nada. */
export function gainText(benefit: Pick<PlanBenefit, "status" | "before" | "after" | "label"> | null | undefined): string | null {
  if (!benefit || benefit.status !== "supported" || !benefit.before || !benefit.after) return null;
  const before = Number(benefit.before), after = Number(benefit.after);
  if (!(before > 0) || !(after > 0)) return null;
  if (/\bGB\b/.test(benefit.label ?? "")) return `Pasás de ${benefit.before} GB a ${benefit.after} GB`;
  const ratio = after / before;
  if (ratio <= 1) return null;
  return ratio >= 1.9 && ratio <= 2.1 ? "Rinde cerca del doble" : `Rinde cerca de ${Math.round((ratio - 1) * 100)} % más`;
}
export const gainNote = "Según datos de referencia. No son FPS.";

export type PriceChange = { direction: "sube" | "baja" | "igual" | "sin_dato"; before: string | null; after: string | null; stopsFitting: string[] };
/** Qué cambió al recalcular: solo compara lo que el servidor guardó, sin calcular ninguna diferencia en pesos. */
export function comparePlans(before: Pick<TowerPlanSnapshot, "cost" | "stages">, after: Pick<TowerPlanSnapshot, "cost" | "stages">): PriceChange {
  const a = cents(before.cost.total_ars), b = cents(after.cost.total_ars);
  const direction = a === null || b === null ? "sin_dato" : b > a ? "sube" : b < a ? "baja" : "igual";
  const stopsFitting = after.stages.filter((stage, index) => (before.stages[index]?.evaluation.verdict === "compatible") && stage.evaluation.verdict !== "compatible").map(stage => stageTitle(stage.name));
  return { direction, before: before.cost.total_ars, after: after.cost.total_ars, stopsFitting };
}
export function priceChangeText(change: PriceChange): string {
  const before = moneyText(change.before), after = moneyText(change.after);
  if (change.direction === "sin_dato") return "Ahora falta el precio de alguna compra, así que no podemos comparar el total.";
  if (change.direction === "igual") return "Los precios siguen igual que antes.";
  return `${change.direction === "sube" ? "Los precios subieron" : "Los precios bajaron"}: el plan pasó de ${before} a ${after}.`;
}

/** Monto mensual escrito a mano («100.000», «$ 100000»): solo dígitos, sin decimales; vacío o cero no sirven. */
export function parseMonthly(text: string): number | null {
  const digits = text.split(",")[0].replace(/\D/g, "");
  const value = Number(digits);
  return digits && Number.isSafeInteger(value) && value > 0 ? value : null;
}
/** Meses para juntar lo que falta con ese aporte: una estimación con los precios de hoy, no un precio. */
export function monthsToFinish(remaining: string | null | undefined, monthly: number | null): number | null {
  const left = remaining === null || remaining === undefined ? NaN : Number(remaining);
  if (monthly === null || !Number.isFinite(left) || left < 0) return null;
  return Math.ceil(left / monthly);
}
export function monthsText(months: number | null, hasRemaining: boolean): string {
  if (!hasRemaining) return "No podemos estimarlo: falta el precio de alguna compra.";
  if (months === null) return "Escribí cuánto podés apartar por mes.";
  if (months === 0) return "Ya no te falta nada.";
  return months === 1 ? "Terminás en 1 mes." : `Terminás en unos ${months} meses.`;
}

/** «Tu PC al terminar» en forma de cambio: «2 × 8 GB → 2 × 16 GB», «Se suma …» o «Falta un dato». */
export function pcChanges(plan: Pick<TowerPlanRead, "snapshot">, metadata: MetadataSnapshot, upTo = plan.snapshot.stages.length - 1): { category: TowerCategory; label: string; text: string }[] {
  const version = plan.snapshot.versions.catalog, base = plan.snapshot.base_configuration, final = plan.snapshot.stages[upTo]?.evaluated_configuration;
  if (!final) return [];
  const touched = new Set(plan.snapshot.stages.slice(0, upTo + 1).flatMap(stage => stage.actions.map(action => action.category)));
  const named = (config: Tower, category: TowerCategory) => {
    const own = config.lines.filter(line => line.category === category);
    return own.length ? [...new Set(own.map(line => `${line.quantity > 1 ? `${line.quantity} × ` : ""}${lineName(line, version, metadata) ?? "Por confirmar"}`))].join(", ") : null;
  };
  return categoryOrder.filter(category => touched.has(category)).map(category => {
    const before = named(base, category), after = named(final, category);
    const text = !after ? "Falta un dato" : after.includes("Por confirmar") ? "Falta un dato" : !before ? `Se suma ${after}` : before === after ? after : `${before} → ${after}`;
    return { category, label: categoryNames[category], text };
  });
}

/** Frases de otras pantallas que dicen «pieza»: acá se leen como «componente». */
export function plainWords(text: string): string {
  return text.replace(/Pieza por confirmar/g, "Componente por confirmar").replace(/Sin pieza de este tipo/g, "Sin componente de este tipo").replace(/Etapa (\d)/g, "Compra $1");
}

const limitNotes: Record<string, string> = {
  "Saved plan never applies changes to the PC; every prefix requires validation.": "El plan guardado nunca cambia tu PC; cada compra se revisa sobre las anteriores.",
  "Quotes frozen at generation, not reservations or future stock/price guarantees.": "Los precios quedan como los vimos ese día: no reservan stock ni aseguran el precio futuro.",
  "Shipping, financing and labor excluded; removed parts receive no resale credit.": "No incluimos envío, cuotas ni mano de obra, ni lo que podrías conseguir por vender lo que sacás.",
  "Reference scores are not FPS or guaranteed physical system performance.": "Los puntajes de referencia no son FPS ni garantizan cómo rinde tu PC.",
  "Unidentified installed stock cooler remains conditional, not proven installed.": "Si tu PC trae el cooler original sin identificar, no damos por hecho que esté instalado.",
  "Unknown necessary tower evidence including T10 blocks ready; no policy bypass.": "Si falta un dato necesario de tu PC, el plan no figura como listo.",
};
const codeNotes: Record<string, string> = {
  "offer:unidentified_component": "No pudimos identificar el componente, así que falta su precio.",
  "offer.missing": "Falta un precio.",
  "cpu.socket": "Falta confirmar el socket del procesador.",
  "search:bounded_not_exhaustive": "No revisamos todas las combinaciones posibles.",
};
/** Un límite o faltante del plan, en palabras comunes. Lo que no se reconoce (códigos, inglés) se esconde: nunca se muestra crudo. */
export function plainPlanNote(text: string): string | null {
  if (Object.hasOwn(limitNotes, text)) return limitNotes[text];
  const staged = /^stages[.]([1-9][0-9]*)[.](.+)$/.exec(text);
  if (staged) { const inner = plainPlanNote(staged[2]); return inner ? `Compra ${staged[1]}: ${inner[0].toLowerCase()}${inner.slice(1)}` : null; }
  if (Object.hasOwn(codeNotes, text)) return codeNotes[text];
  return text.startsWith("dependency:") ? (text === "dependency:thermal_compound" ? "Falta pasta térmica." : "Falta algo que el componente necesita.") : null;
}
export function plainPlanNotes(list: readonly string[]): string[] {
  return [...new Set(list.map(plainPlanNote).filter((note): note is string => note !== null))];
}
