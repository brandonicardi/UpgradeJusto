import { catalogFetch, type Query } from "./catalog";
import { towerCategories, type TowerCategory } from "./towers";
import type { ImageEvidence, RetailOffer, TowerCatalogPage, TowerComponent } from "./tower-catalog";
export { catalogBoundOffers } from "./catalog-offers";
export const towerCatalogSorts = ["retail_first", "id", "price_asc", "price_desc"] as const;
export type TowerCatalogSort = typeof towerCatalogSorts[number];
export type TowerCatalogQuery = Query & { sort?: TowerCatalogSort };

function invalid(): never { throw new Error("Catálogo no disponible: respuesta no reconocida."); }
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
const text = (value: unknown): string => typeof value === "string" ? value : invalid();
const nullableText = (value: unknown): string | null => value === null ? null : text(value);
const bool = (value: unknown): boolean => typeof value === "boolean" ? value : invalid();
const integer = (value: unknown, min: number): number => typeof value === "number" && Number.isSafeInteger(value) && value >= min ? value : invalid();
const list = <T>(value: unknown, parse: (item: unknown) => T): T[] => Array.isArray(value) ? value.map(parse) : invalid();
const choice = <T extends string>(value: unknown, values: readonly T[]): T => typeof value === "string" && values.includes(value as T) ? value as T : invalid();
// Solo un texto no vacío es una marca válida; cualquier otra cosa se descarta y ninguna oferta se marca.
export const lowestOfferId = (value: unknown): string | null => typeof value === "string" && value.trim() !== "" ? value : null;
function imageEvidence(value: unknown): ImageEvidence | null {
  if (value === undefined || value === null) return null;
  const image = object(value);
  return { url: nullableText(image.url), alt: nullableText(image.alt), source_url: nullableText(image.source_url), retrieved_at: nullableText(image.retrieved_at), rights_note: nullableText(image.rights_note), exact_variant: bool(image.exact_variant), status: choice(image.status, ["verified", "unavailable", "quarantined"]), ...(image.photo_bytes_verified === undefined ? {} : { photo_bytes_verified: bool(image.photo_bytes_verified) }) };
}
function offer(value: unknown): RetailOffer {
  const item = object(value);
  return { offer_id: text(item.offer_id), store: choice(item.store, ["compragamer", "venex"]), product_id: text(item.product_id), component_id: text(item.component_id), variant_key: text(item.variant_key), amount: nullableText(item.amount), currency: choice(item.currency, ["ARS"]), condition: choice(item.condition, ["cash", "list"]), availability: choice(item.availability, ["in_stock", "out_of_stock", "unknown"]), stock_quantity: item.stock_quantity === null ? null : integer(item.stock_quantity, 0), source_url: text(item.source_url), observed_at: text(item.observed_at), expires_at: text(item.expires_at), status: choice(item.status, ["fresh", "stale", "unavailable"]) };
}
export function parseCatalogTowerComponent(value: unknown): TowerComponent {
  const item = object(value), category = text(item.category);
  if (!Object.hasOwn(towerCategories, category)) return invalid();
  const attributes = Object.fromEntries(Object.entries(object(item.attributes)).map(([key, value]) => [key, nullableText(value)]));
  return { id: text(item.id), category: category as TowerCategory, name: text(item.name), attributes, sources: list(item.sources, value => { const row = object(value); return { id: text(row.id), url: text(row.url) }; }), prices: list(item.prices, value => { const row = object(value); return { amount: text(row.amount), currency: text(row.currency), date: text(row.date), source: text(row.source) }; }), image: item.image === undefined ? null : nullableText(item.image), image_evidence: imageEvidence(item.image_evidence), offers: item.offers === undefined ? [] : list(item.offers, offer), lowest_offer_id: lowestOfferId(item.lowest_offer_id) };
}
export function parseCatalogTowerPage(value: unknown): TowerCatalogPage {
  const item = object(value);
  return { dataset_version: text(item.dataset_version), total: integer(item.total, 0), page: integer(item.page, 1), page_size: integer(item.page_size, 1), items: list(item.items, parseCatalogTowerComponent) };
}
export function parseTowerCatalogQuery(search: Record<string, string | string[] | undefined>): TowerCatalogQuery {
  const scalar = (key: string) => typeof search[key] === "string" ? search[key] as string : "";
  const category = scalar("category"), q = scalar("q").trim();
  if ((category && !Object.hasOwn(towerCategories, category)) || q.length > 100) throw new Error("Filtros no válidos.");
  const number = (key: string, fallback: number, max: number) => { const value = scalar(key); if (!value) return fallback; if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new Error("Paginación no válida."); return Number(value); };
  const sort = search.sort === undefined ? "retail_first" : search.sort;
  if (typeof sort !== "string" || !towerCatalogSorts.includes(sort as TowerCatalogSort)) throw new Error("Orden no válido.");
  return { category, q, page: number("page", 1, 10000), page_size: number("page_size", 12, 50), sort: sort as TowerCatalogSort };
}
export function towerQueryString(query: TowerCatalogQuery, page = query.page): string {
  const params = new URLSearchParams({ page: String(page), page_size: String(query.page_size), sort: query.sort ?? "retail_first" });
  if (query.category) params.set("category", query.category);
  if (query.q) params.set("q", query.q);
  return params.toString();
}
export async function catalogTowerPage(suffix: string) { return parseCatalogTowerPage(await catalogFetch<unknown>(suffix)); }
export async function catalogTowerComponent(id: string) { return parseCatalogTowerComponent(await catalogFetch<unknown>(`/${encodeURIComponent(id)}`)); }
