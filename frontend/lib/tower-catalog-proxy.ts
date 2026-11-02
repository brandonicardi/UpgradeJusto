import { towerKeys } from "./towers";

// Public read-only catalog. Never forwards identity or arbitrary upstream paths.
export async function towerCatalogProxy(request: Request, id?: string): Promise<Response> {
  const fail = (status: number) => Response.json({ detail: "Catalog request failed" }, { status, headers: { "Cache-Control": "no-store" } });
  if (request.method !== "GET") return fail(405);
  const input = new URL(request.url).searchParams, query = new URLSearchParams();
  if (id !== undefined) {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(id) || input.size) return fail(422);
  } else {
    for (const key of input.keys()) if (!["q", "category", "page", "page_size", "sort"].includes(key) || input.getAll(key).length !== 1) return fail(422);
    const sort = input.get("sort");
    if (sort !== null && sort !== "retail_first" && sort !== "id") return fail(422);
    if (sort !== null) query.set("sort", sort);
    const category = input.get("category"), q = (input.get("q") ?? "").trim();
    if ((category && !towerKeys.includes(category as typeof towerKeys[number])) || q.length > 100) return fail(422);
    if (category) query.set("category", category);
    if (q) query.set("q", q);
    for (const [key, fallback, max] of [["page", 1, 10000], ["page_size", 12, 50]] as const) {
      const value = input.get(key) ?? String(fallback);
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) return fail(422);
      query.set(key, String(Number(value)));
    }
  }
  const path = id === undefined ? `/api/catalog/components?${query}` : `/api/catalog/components/${encodeURIComponent(id)}`;
  try {
    const response = await fetch(new URL(path, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]) });
    if (!response.ok) return fail(response.status);
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch { return fail(503); }
}
