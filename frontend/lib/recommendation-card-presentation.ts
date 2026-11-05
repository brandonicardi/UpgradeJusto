import type { TowerAction } from "./tower-compatibility";
import type { Tower, TowerCategory, TowerLine } from "./towers";
import type { TowerRecommendationItem } from "./tower-recommendations";
import { metadataKey, type MetadataSnapshot } from "./preview-metadata";

const piezas: Record<TowerCategory, string> = {
  cpu: "el procesador", motherboard: "la placa madre", ram: "la memoria",
  gpu: "la placa de video", psu: "la fuente", case: "el gabinete",
  storage: "el almacenamiento", cooler: "el cooler", fan: "los ventiladores",
};
const incorporaciones: Record<TowerCategory, string> = {
  cpu: "un procesador", motherboard: "una placa madre", ram: "más memoria",
  gpu: "una placa de video", psu: "una fuente", case: "un gabinete",
  storage: "almacenamiento", cooler: "un cooler", fan: "ventiladores",
};

export function proposalTitle(actions: readonly TowerAction[]): string {
  const first = actions[0];
  if (!first) return "Cambio propuesto";
  const title = first.action === "add_line" ? `Sumá ${incorporaciones[first.category]}`
    : first.action === "remove_line" ? `Quitá ${piezas[first.category]}`
    : `Cambiá ${piezas[first.category]}`;
  return actions.length > 1 ? `${title} y más` : title;
}

function partName(line: Pick<TowerLine, "component_id" | "declared_model">, category: TowerCategory, version: string, metadata: MetadataSnapshot): string | null {
  if (line.declared_model) return line.declared_model;
  const entry = line.component_id ? metadata.entries.get(metadataKey(line.component_id, version)) : undefined;
  return metadata.status === "active" && entry?.status === "ready" && entry.part.category === category ? entry.part.name : null;
}

export function proposalSwap(item: Pick<TowerRecommendationItem, "actions" | "versions">, pc: Tower | undefined, metadata: MetadataSnapshot): { actual: string; nueva: string } {
  const first = item.actions[0];
  if (!first) return { actual: "Por confirmar", nueva: "Pieza por confirmar" };
  const lines = pc?.lines.filter(line => line.category === first.category) ?? [];
  const actual = lines.length ? lines.map(line => partName(line, first.category, item.versions.catalog, metadata) ?? "Por confirmar").join(", ")
    : pc?.category_status[first.category] === "absent" ? "Sin pieza de este tipo" : "Por confirmar";
  const candidate = first.candidates[0];
  return { actual, nueva: candidate ? partName(candidate, first.category, item.versions.catalog, metadata) ?? "Pieza por confirmar" : "Pieza por confirmar" };
}

export function proposalReasons(benefit: TowerRecommendationItem["benefit"]): string[] {
  return [
    `Antes: ${benefit.before ?? "Desconocido"} → Después: ${benefit.after ?? "Desconocido"}`,
    benefit.status === "supported" ? "La referencia respalda una mejora, no garantiza el resultado de toda tu PC."
      : benefit.status === "not_an_improvement" ? "La referencia no respalda una mejora." : "Beneficio sin evidencia suficiente.",
    "Capacidad no equivale a rendimiento universal; una puntuación no son FPS garantizados.",
  ];
}
