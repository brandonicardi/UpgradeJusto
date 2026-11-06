// Lo que se elige en el inicio y llega a «Lo que te conviene». Solo traduce palabras de la gente a los
// objetivos que entiende la API; la interfaz no decide nada más.
export type GoalKey = "gaming" | "work" | "creative" | "everyday";
export type ApiObjective = "general" | "gaming" | "productivity";

export const homeGoals: ReadonlyArray<{ key: GoalKey; text: string; objective: ApiObjective }> = [
  { key: "gaming", text: "Jugar mejor", objective: "gaming" },
  { key: "work", text: "Trabajar más rápido", objective: "productivity" },
  { key: "creative", text: "Editar fotos y video", objective: "productivity" },
  { key: "everyday", text: "Que abra todo más rápido", objective: "general" },
];

// Enteros guardados como texto, como pide el sistema de diseño: nunca `float`.
export const homeBudget = {
  min: "100000", max: "1500000", step: "50000", initial: "400000", currency: "ARS",
  presets: [{ valor: "250000", texto: "$ 250 mil" }, { valor: "500000", texto: "$ 500 mil" }, { valor: "1000000", texto: "$ 1 millón" }],
} as const;

export function goalByKey(key: string | null | undefined) {
  return homeGoals.find(goal => goal.key === key) ?? null;
}

/** Un monto válido es un entero dentro del rango del deslizador. Cualquier otra cosa se descarta, no se corrige. */
export function validBudget(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const value = BigInt(raw);
  return value >= BigInt(homeBudget.min) && value <= BigInt(homeBudget.max) ? raw : null;
}

export function convieneHref(goal: GoalKey, budget: string): string {
  return `/conviene?objetivo=${goal}&presupuesto=${budget}`;
}

/** Lee `?objetivo=&presupuesto=`. Devuelve `null` si falta algo o no es válido: la pantalla pide los datos de nuevo. */
export function parseConvieneQuery(params: { get(name: string): string | null }): { goal: (typeof homeGoals)[number]; budget: string } | null {
  const goal = goalByKey(params.get("objetivo")), budget = validBudget(params.get("presupuesto"));
  return goal && budget ? { goal, budget } : null;
}
