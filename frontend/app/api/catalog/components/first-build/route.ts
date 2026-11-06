export const runtime = "nodejs";
// Público y de solo lectura: reenvía únicamente el objetivo y el presupuesto.
export async function GET(request: Request) {
  const fail = (status: number) => Response.json({ detail: "First build request failed" }, { status, headers: { "Cache-Control": "no-store" } });
  const input = new URL(request.url).searchParams;
  const objective = input.get("objective") ?? "", budget = input.get("budget_ars") ?? "";
  if (!["general", "gaming", "productivity"].includes(objective) || !/^[1-9]\d{0,11}$/.test(budget)) return fail(422);
  const path = `/api/catalog/components/first-build?${new URLSearchParams({ objective, budget_ars: budget })}`;
  try {
    const response = await fetch(new URL(path, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) return fail(response.status);
    return Response.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch { return fail(503); }
}
