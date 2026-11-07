import { remoteCatalog, type TowerCatalogPage, type TowerComponent } from "./tower-catalog";
import type { TowerCategory } from "./towers";

const RELLENO = /\b(?:mother|motherboard|placa|madre|de|video|fuente|ssd|disco|memoria|ram|gabinete|cooler|procesador|cpu|gpu)\b/gi;
const palabras = (texto: string) => texto.replace(RELLENO, " ").split(/[\s,;]+/).filter(palabra => palabra.length > 1);

/** Qué buscar, de lo más preciso a lo más amplio. El catálogo busca el texto tal cual, sin separar palabras. */
export function busquedasDeSugerencia(texto: string): string[] {
  const sueltas = palabras(texto);
  if (!sueltas.length) return [];
  const largas = [...sueltas].sort((a, b) => b.length - a.length).slice(0, 2);
  return [...new Set([sueltas.join(" "), ...largas])];
}

const aciertos = (nombre: string, sueltas: string[]) => sueltas.filter(palabra => new RegExp(`(?<![a-z0-9])${palabra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i").test(nombre)).length;

/** Primero lo que tiene más palabras exactas de lo que escribió la persona: «5700G» antes que «5700GE». */
export function ordenarSugerencias<T extends { name: string }>(items: T[], texto: string, limite = 3): T[] {
  const sueltas = palabras(texto);
  return items.map((item, orden) => ({ item, orden, puntos: aciertos(item.name, sueltas) })).sort((a, b) => b.puntos - a.puntos || a.orden - b.orden).slice(0, limite).map(({ item }) => item);
}

/** Solo sugiere: nada se elige sin que la persona lo toque. */
export async function buscarSugerencias(category: TowerCategory, texto: string, signal?: AbortSignal): Promise<TowerComponent[]> {
  for (const q of busquedasDeSugerencia(texto)) {
    const page = await remoteCatalog<TowerCatalogPage>(`?${new URLSearchParams({ category, q, page: "1", page_size: "12", sort: "retail_first" })}`, signal);
    const items = page.items.filter(item => item.category === category);
    if (items.length) return ordenarSugerencias(items, texto);
  }
  return [];
}
