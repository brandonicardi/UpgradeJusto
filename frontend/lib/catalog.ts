export const categories = {
  cpu: "Procesadores",
  motherboard: "Motherboards",
  ram: "Memoria RAM",
  gpu: "Tarjetas gráficas",
  psu: "Fuentes de alimentación",
  case: "Gabinetes",
} as const;

export type Category = keyof typeof categories;
export type Component = {
  id: string;
  category: Category;
  name: string;
  attributes: Record<string, string | null>;
  sources: { id: string; url: string }[];
  prices: { amount: string; currency: string; date: string; source: string }[];
  image: null;
};
export type CatalogPage = {
  dataset_version: string;
  items: Component[];
  total: number;
  page: number;
  page_size: number;
};
export type Query = { category: string; q: string; page: number; page_size: number };
type Search = Record<string, string | string[] | undefined>;

function scalar(value: Search[string]): string {
  return typeof value === "string" ? value : "";
}

function integer(value: string, fallback: number, max: number): number {
  if (!value) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) {
    throw new Error("La página o el tamaño de página no es válido.");
  }
  return Number(value);
}

export function parseQuery(search: Search): Query {
  const category = scalar(search.category);
  const q = scalar(search.q).trim();
  if (category && !Object.hasOwn(categories, category)) throw new Error("Categoría no válida.");
  if (q.length > 100) throw new Error("La búsqueda admite hasta 100 caracteres.");
  return { category, q, page: integer(scalar(search.page), 1, 10000), page_size: integer(scalar(search.page_size), 12, 50) };
}

export function queryString(query: Query, page = query.page): string {
  const params = new URLSearchParams({ page: String(page), page_size: String(query.page_size) });
  if (query.category) params.set("category", query.category);
  if (query.q) params.set("q", query.q);
  return params.toString();
}

export function safeSource(url: string): string | null {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
}

export class CatalogError extends Error {
  constructor(public status: number) { super("No se pudo consultar el catálogo."); }
}

export async function catalogFetch<T>(path: string): Promise<T> {
  // Server-only callers: no browser credentials, client authorization or CORS bypass.
  const base = process.env.CATALOG_API_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${base}/api/catalog/components${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new CatalogError(response.status);
  return response.json() as Promise<T>;
}
