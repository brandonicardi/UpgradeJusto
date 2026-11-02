import { signedProxyHeaders } from "./gateway";
import { pcListQuery } from "./pcs";
import { readRequestBody, RequestBodyError } from "./request-body";
import { retryAfterHeaders } from "./retry-after";
const planPathUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export async function towerPlansProxy(request: Request, id?: string, operation?: "recalculate" | "history", revision?: string): Promise<Response> {
  const fail = (status: number, retry: string | null = null) => Response.json({ detail: "Plan request failed" }, { status, headers: { "Cache-Control": "no-store", ...retryAfterHeaders(status, retry) } });
  if ((id !== undefined && !planPathUUID.test(id)) || (operation !== undefined && (!id || !["recalculate", "history"].includes(operation))) || (operation === "history" && (!revision || !/^[1-9]\d{0,9}$/.test(revision))) || (operation !== "history" && revision !== undefined)) return fail(422);
  const allowed = operation === "history" ? ["GET"] : operation === "recalculate" ? ["POST"] : id ? ["GET", "DELETE"] : ["GET", "POST"];
  if (!allowed.includes(request.method)) return fail(405);
  const url = new URL(request.url); let query = "";
  try { if (!id && request.method === "GET") query = `?${pcListQuery(url.searchParams)}`; else if (url.search) return fail(422); } catch { return fail(422); }
  const pathname = id ? `/api/tower-plans/${id}${operation === "history" ? `/revisions/${revision}` : operation === "recalculate" ? "/recalculate" : ""}` : "/api/tower-plans";
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET); if (!signed) return fail(503);
  const headers = new Headers(signed); for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) { const value = request.headers.get(key); if (value !== null) headers.set(key, value); }
  try {
    const body = ["POST", "DELETE"].includes(request.method) ? await readRequestBody(request) : undefined;
    const response = await fetch(new URL(pathname + query, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) return fail(response.status, response.headers.get("Retry-After"));
    if (response.status === 204) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
