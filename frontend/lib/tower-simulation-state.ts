import type { TowerCategory } from "./towers";
import type { TowerCandidate } from "./tower-compatibility";

export function updateSimulationCandidate(category: TowerCategory, candidates: TowerCandidate[], bios: string, index: number, patch: Partial<TowerCandidate>): { candidates: TowerCandidate[]; bios: string } {
  const previous = candidates[index];
  const next = previous ? { ...previous, ...patch } : undefined;
  const changedIdentity = previous && next && (previous.component_id !== next.component_id || previous.declared_model !== next.declared_model);
  return {
    candidates: candidates.map((candidate, i) => i === index && next ? next : candidate),
    bios: category === "motherboard" && changedIdentity ? "" : bios,
  };
}
