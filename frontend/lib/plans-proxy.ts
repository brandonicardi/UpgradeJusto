import { signedProxyHeaders } from "./gateway";
import { pcListQuery } from "./pcs";
import { readRequestBody, RequestBodyError } from "./request-body";
import { retryAfterHeaders } from "./retry-after";

export async function plansProxy(request: Request, id?: string): Promise<Response> {
  const fail = (status: number, detail = status === 503 ? "Service unavailable" : "Request failed", retryAfter: string | null = null) => Response.json({ detail }, { status, headers: { "Cache-Control": "no-store", ...retryAfterHeaders(status, retryAfter) } });
  if (id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return fail(422);
  if (!(id ? ["GET", "PUT", "DELETE"] : ["GET", "POST"]).includes(request.method)) return fail(405);
  const url = new URL(request.url);
  let query = "";
  try {
    if (!id && request.method === "GET") query = `?${pcListQuery(url.searchParams)}`;
    else if (url.search) return fail(422);
  } catch { return fail(422); }
  const pathname = `/api/plans${id ? `/${id.toLowerCase()}` : ""}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) {
    const value = request.headers.get(key); if (value !== null) headers.set(key, value);
  }
  try {
    const body = ["GET", "DELETE"].includes(request.method) ? undefined : await readRequestBody(request);
    const response = await fetch(new URL(pathname + query, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { method: request.method, headers,
      body, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]) });
    if (!response.ok) {
      if (response.status === 409) {
        const detail = (await response.json()).detail;
        if (["Plan revision conflict", "PC revision conflict"].includes(detail)) return fail(409, detail);
      }
      return fail(response.status, undefined, response.headers.get("Retry-After"));
    }
    if (response.status === 204) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
