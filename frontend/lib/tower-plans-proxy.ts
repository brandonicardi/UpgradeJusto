import { signedProxyHeaders } from "./gateway";
import { pcListQuery } from "./pcs";
import { readRequestBody, RequestBodyError } from "./request-body";
import { retryAfterHeaders } from "./retry-after";
const planPathUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const stageKeyPattern = /^[0-9a-f]{64}$/;
// `detail` es la revisión para "history" y la clave de etapa para "progress".
export async function towerPlansProxy(request: Request, id?: string, operation?: "recalculate" | "history" | "progress", detail?: string): Promise<Response> {
  const fail = (status: number, retry: string | null = null) => Response.json({ detail: "Plan request failed" }, { status, headers: { "Cache-Control": "no-store", ...retryAfterHeaders(status, retry) } });
  const detailValid = operation === "history" ? !!detail && /^[1-9]\d{0,9}$/.test(detail) : operation === "progress" ? !!detail && stageKeyPattern.test(detail) : detail === undefined;
  if ((id !== undefined && !planPathUUID.test(id)) || (operation !== undefined && (!id || !["recalculate", "history", "progress"].includes(operation))) || !detailValid) return fail(422);
  const allowed = operation === "history" ? ["GET"] : operation === "recalculate" ? ["POST"] : operation === "progress" ? ["PUT", "DELETE"] : id ? ["GET", "DELETE"] : ["GET", "POST"];
  if (!allowed.includes(request.method)) return fail(405);
  const url = new URL(request.url); let query = "";
  try { if (!id && request.method === "GET") query = `?${pcListQuery(url.searchParams)}`; else if (url.search) return fail(422); } catch { return fail(422); }
  const pathname = id ? `/api/tower-plans/${id}${operation === "history" ? `/revisions/${detail}` : operation === "recalculate" ? "/recalculate" : operation === "progress" ? `/stages/${detail}/progress` : ""}` : "/api/tower-plans";
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET); if (!signed) return fail(503);
  const headers = new Headers(signed); for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) { const value = request.headers.get(key); if (value !== null) headers.set(key, value); }
  try {
    // Marcar y desmarcar no llevan cuerpo: lo que mande el cliente no se reenvía.
    const body = operation !== "progress" && ["POST", "DELETE"].includes(request.method) ? await readRequestBody(request) : undefined;
    const response = await fetch(new URL(pathname + query, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) return fail(response.status, response.headers.get("Retry-After"));
    if (response.status === 204) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
