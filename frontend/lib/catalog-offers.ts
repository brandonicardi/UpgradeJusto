import type { TowerComponent } from "./tower-catalog";
export function catalogBoundOffers(part: TowerComponent) { return part.offers?.filter(item => item.component_id === part.id && item.currency === "ARS") ?? []; }
