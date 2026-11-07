// Armado de la pantalla «Lo que te conviene». Traduce lo que devuelve la API a textos y datos de
// presentación: no decide compatibilidad, no calcula precios ni arma veredictos.
import type { TowerRecommendationItem, RecommendationDraft } from "./tower-recommendations";
import type { Tower, TowerCategory, TowerLine } from "./towers";
import type { TowerPlanDraft } from "./tower-plans";
import { metadataKey, type MetadataQuery, type MetadataSnapshot } from "./preview-metadata";
import { checkRows } from "./conviene-presentation";
import type { ApiObjective } from "./home-goals";
import { formatPieceARS } from "./retail-presentation";

/** Las categorías, con el nombre de las maquetas y en el orden en que se muestra una PC. */
export const categoryOrder: TowerCategory[] = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
export const categoryNames: Record<TowerCategory, string> = {
  cpu: "Procesador", motherboard: "Placa madre", ram: "Memoria", gpu: "Placa de video", psu: "Fuente",
  case: "Gabinete", storage: "Almacenamiento", cooler: "Cooler", fan: "Ventiladores",
};

/** Lo que se le manda al servidor. Para «productividad» solo hay referencia de Blender: se pide así y se dice en pantalla. */
export function convieneDraft(objective: ApiObjective, budget: string): RecommendationDraft {
  return { objective, budget_ars: budget, price_condition: "cash", workload: objective === "productivity" ? "blender-cpu" : null, thermal_available: false };
}

export function workloadNote(draft: Pick<RecommendationDraft, "workload">): string | null {
  return draft.workload === "blender-cpu" ? "Para medir la mejora usamos como referencia el render en Blender: es el único trabajo de este tipo que tenemos medido." : null;
}

/** La bajada de la pantalla, con las palabras de la maqueta y las del objetivo elegido. */
export function introLine(goalText: string): string {
  return goalText.trim().toLowerCase() === "jugar mejor"
    ? "Miramos tu PC entera y buscamos el cambio que más mejora tus juegos sin pasarte del presupuesto."
    : `Miramos tu PC entera y buscamos el cambio que más te sirve para ${goalText.trim().toLowerCase()} sin pasarte del presupuesto.`;
}

/** «Empezá por la placa de video…»: nombra el cambio cuando la categoría se conoce. */
export function planLead(category: TowerCategory | null): string {
  return category ? `Empezá por la ${categoryNames[category].toLowerCase()}. Cuando puedas, sumá lo que sigue.` : "Empezá por este cambio. Cuando puedas, sumá lo que sigue.";
}

/** `389900.00` → `$ 389.900`, tal cual lo informó el servidor (sin pasar por Number). Sin importe válido no hay texto. */
export function moneyText(amount: string | null | undefined): string | null {
  return typeof amount === "string" && /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount) ? formatPieceARS(amount.includes(".") ? amount.padEnd(amount.indexOf(".") + 3, "0") : `${amount}.00`).replace(/^ARS /, "") : null;
}

export function proposalCategory(item: Pick<TowerRecommendationItem, "actions">): TowerCategory | null {
  return item.actions[0]?.category ?? null;
}

/** Nombre de la pieza en una línea: lo declarado o lo que dice el catálogo. Sin dato, no se inventa. */
export function lineName(line: Pick<TowerLine, "component_id" | "declared_model" | "category">, version: string, metadata: MetadataSnapshot): string | null {
  if (line.declared_model) return line.declared_model;
  const entry = line.component_id ? metadata.entries.get(metadataKey(line.component_id, version)) : undefined;
  return metadata.status === "active" && entry?.status === "ready" && entry.part.category === line.category ? entry.part.name : null;
}

/** Qué piezas hay que mirar en el catálogo: las propuestas y las que ya tiene la PC. */
export function metadataQueriesFor(items: readonly TowerRecommendationItem[], pc: Pick<Tower, "lines"> | null): MetadataQuery[] {
  const found = new Map<string, MetadataQuery>();
  for (const item of items) {
    const version = item.versions.catalog;
    for (const action of item.actions) for (const candidate of action.candidates) if (candidate.component_id) found.set(metadataKey(candidate.component_id, version), { id: candidate.component_id, version });
    for (const line of [...(pc?.lines ?? []), ...item.evaluation.evaluated_configuration.lines]) if (line.component_id) found.set(metadataKey(line.component_id, version), { id: line.component_id, version });
  }
  return [...found.values()];
}

const withQuantity = (name: string, quantity: number) => quantity > 1 ? `${quantity} × ${name}` : name;

/** «Hoy tenés» y «Pasás a»: nombres del catálogo con la cantidad, sin inventar ninguno. */
export function swapSides(item: { actions: TowerRecommendationItem["actions"]; versions: { catalog: string } }, pc: Pick<Tower, "lines" | "category_status"> | null, metadata: MetadataSnapshot): { actual: string; nueva: string } {
  const first = item.actions[0];
  if (!first) return { actual: "Por confirmar", nueva: "Componente por confirmar" };
  const version = item.versions.catalog;
  const own = pc?.lines.filter(line => line.category === first.category) ?? [];
  const actual = own.length ? own.map(line => withQuantity(lineName(line, version, metadata) ?? "Por confirmar", line.quantity)).join(", ")
    : pc?.category_status[first.category] === "absent" ? "Sin componente de este tipo" : "Por confirmar";
  const nueva = first.candidates.map(candidate => withQuantity(lineName({ ...candidate, category: first.category }, version, metadata) ?? "Componente por confirmar", candidate.quantity)).join(", ");
  return { actual, nueva: nueva || "Componente por confirmar" };
}

/** La mejora, dicha con palabras comunes. La unidad solo se nombra cuando la API la declara (capacidad en GB). */
export function benefitLine(item: Pick<TowerRecommendationItem, "benefit">): string {
  const { benefit } = item;
  if (benefit.status === "not_an_improvement") return "Según la referencia, este cambio no mejora lo que ya tenés.";
  if (benefit.status !== "supported") return "Todavía no tenemos una referencia para medir cuánto mejora.";
  if (!benefit.before || !benefit.after) return "La referencia respalda una mejora.";
  if (/\bGB\b/.test(benefit.label ?? "")) return `Tu memoria pasa de ${benefit.before} GB a ${benefit.after} GB.`;
  const before = Number(benefit.before), after = Number(benefit.after);
  if (!(before > 0) || !(after > 0)) return `En la referencia, el puntaje pasa de ${benefit.before} a ${benefit.after}.`;
  return `Rinde cerca de ${Math.round((after / before - 1) * 100)} % más que lo que tenés, según un índice de referencia.`;
}

/** Los FPS solo importan al jugar; para trabajar sería hablar de algo que nadie preguntó. */
export function referenceNote(item: Pick<TowerRecommendationItem, "benefit">): string {
  return item.benefit.workload ? "Es una referencia: no mide el rendimiento de toda tu PC." : "Es una referencia, no una promesa de FPS ni del rendimiento de toda tu PC.";
}

/** El motor no evalúa refrigeración: al cambiar el procesador se avisa, sin bloquear ni afirmar nada. */
export const coolerNote = "Chequeá el cooler: no revisamos si el que tenés alcanza para este procesador.";
export function needsCoolerCheck(actions: readonly { category: string }[]): boolean {
  return actions.some(action => action.category === "cpu");
}

/** Los motivos de la tarjeta principal: la mejora, lo que se revisó y la aclaración de que no es una promesa. */
export function whyReasons(item: TowerRecommendationItem): string[] {
  const pasaron = checkRows(item).filter(row => row.estado === "compatible").map(row => row.label);
  return [benefitLine(item), ...(pasaron.length ? [`Revisamos con tu PC: ${joinLabels(pasaron)}.`] : []), referenceNote(item)];
}

/** Cuántas piezas descartadas se listan; el resto se cuenta pero no se despliega. */
export const maxDiscardedShown = 6;

export type MiniPart = { category: TowerCategory; label: string; name: string; isNew: boolean };

/** «Tu PC con este cambio»: las piezas nuevas primero y después el resto, una fila por categoría. */
export function pcAfterChange(item: TowerRecommendationItem, metadata: MetadataSnapshot): MiniPart[] {
  const version = item.versions.catalog;
  const nuevas = new Set(item.actions.flatMap(action => action.candidates.map(candidate => candidate.component_id ?? candidate.declared_model).filter((id): id is string => !!id)));
  const lines = item.evaluation.evaluated_configuration.lines;
  const rows = categoryOrder.flatMap(category => {
    const own = lines.filter(line => line.category === category);
    if (!own.length) return [];
    const isNew = own.some(line => nuevas.has(line.component_id ?? line.declared_model ?? ""));
    const names = own.map(line => withQuantity(lineName(line, version, metadata) ?? "Por confirmar", line.quantity));
    return [{ category, label: categoryNames[category], name: [...new Set(names)].join(", "), isNew }];
  });
  return [...rows.filter(row => row.isNew), ...rows.filter(row => !row.isNew)];
}

/** Comprobaciones que el motor no pudo resolver, con nombre para personas. */
export function unknownChecks(item: TowerRecommendationItem): string[] {
  return checkRows(item).filter(row => row.estado === "requiere_verificacion").map(row => row.label);
}

/** «A, B, C y 2 más»: una lista corta para que un aviso no se vuelva una pared de nombres. */
export function joinLabels(labels: readonly string[], max = 3): string {
  const shown = labels.slice(0, max).join(", "), rest = labels.length - max;
  return rest > 0 ? `${shown} y ${rest} más` : shown;
}

export function budgetState(item: Pick<TowerRecommendationItem, "cost">): "dentro" | "fuera" | "desconocido" {
  return item.cost.total_ars === null ? "desconocido" : item.cost.within_budget === true ? "dentro" : item.cost.within_budget === false ? "fuera" : "desconocido";
}

/** La principal es la que eligió la persona entre las que sirven; si no eligió o ya no está, la primera del servidor. */
export function chooseMain<T extends { key: string }>(candidates: readonly T[], chosenKey: string | null): { main: T | null; others: T[] } {
  const main = candidates.find(item => item.key === chosenKey) ?? candidates[0] ?? null;
  return { main, others: candidates.filter(item => item !== main) };
}

/** Etiqueta de la alternativa: solo dice «más barata» para la de menor precio cuando hay un precio real con qué comparar. */
export function altLabel(category: TowerCategory | null, cheapestKey: string | null, key: string): string {
  const base = category ? categoryNames[category] : "Cambio propuesto";
  return cheapestKey === key ? `${base} · más barata` : base;
}

/** Borrador editable: no guarda nada. Un plan con una etapa y las acciones tal como las devolvió el servidor. */
export function planDraftFor(pc: Tower, item: TowerRecommendationItem, draft: RecommendationDraft): TowerPlanDraft {
  const categoria = proposalCategory(item);
  return {
    name: `Mejora de ${pc.name}`, pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: item.versions.catalog,
    objective: draft.objective, workload: draft.objective === "productivity" ? draft.workload : null, budget_ars: draft.budget_ars, price_condition: draft.price_condition,
    stages: [{ name: categoria ? categoryNames[categoria] : "Primera etapa", budget_ars: draft.budget_ars, actions: structuredClone(item.actions), materials: [] }],
  };
}

/** La pasta térmica solo importa si el cambio toca el procesador o el cooler. */
export const thermalQuestion = "¿Tenés pasta térmica? Va entre el procesador y el cooler.";
export function touchesThermal(actions: readonly { category: string }[]): boolean {
  return actions.some(action => action.category === "cpu" || action.category === "cooler");
}
export const thermalMaterial = { kind: "thermal_compound", state: "available_confirmed", confirmed: true } as const;

/** «Placa de video: se cambia», en palabras de la persona. Solo para mostrar. */
export function actionPhrase(category: TowerCategory, action: string): string {
  const verbo = action === "add_line" ? "se suma" : action === "remove_line" ? "se saca" : "se cambia";
  return `${categoryNames[category]}: ${verbo}`;
}

/** Texto del guardado sin nombres internos. */
export function saveStateText(phase: "idle" | "saving" | "error" | "uncertain" | "saved"): string {
  if (phase === "saving") return "Guardando tu plan…";
  if (phase === "saved") return "Listo, guardamos tu plan.";
  if (phase === "error") return "No pudimos guardar el plan. Probá de nuevo; tu PC no cambió.";
  if (phase === "uncertain") return "Puede que el plan se haya guardado. Revisá tus planes antes de volver a intentar.";
  return "";
}
