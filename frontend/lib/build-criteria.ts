import type { RecommendationDraft, RecommendationObjective } from "./tower-recommendations";

// Los tres objetivos que entiende el sistema; no hay una opción de edición audiovisual.
export const BUILD_OBJECTIVES: { valor: RecommendationObjective; texto: string }[] = [
  { valor: "general", texto: "Uso general" },
  { valor: "gaming", texto: "Juegos" },
  { valor: "productivity", texto: "Productividad" },
];

export function isBuildObjective(value: string): value is RecommendationObjective {
  return BUILD_OBJECTIVES.some(option => option.valor === value);
}

export function emptyBuildCriteria(): RecommendationDraft {
  return { objective: "general", budget_ars: "", price_condition: "cash", workload: null, thermal_available: false };
}

// El trabajo solo existe para productividad: al cambiar de objetivo se descarta.
export function withObjective(criteria: RecommendationDraft, objective: RecommendationObjective): RecommendationDraft {
  return { ...criteria, objective, workload: null };
}

// El presupuesto es el texto que escribió la persona: no se redondea ni se convierte a número.
// Vacío queda vacío (desconocido), nunca cero.
export function withBudget(criteria: RecommendationDraft, text: string): RecommendationDraft {
  return { ...criteria, budget_ars: text };
}

export function withWorkload(criteria: RecommendationDraft, value: string): RecommendationDraft {
  return { ...criteria, workload: criteria.objective === "productivity" && value === "blender-cpu" ? "blender-cpu" : null };
}
