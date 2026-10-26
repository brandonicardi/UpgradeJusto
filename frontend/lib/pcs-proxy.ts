import { signedProxyHeaders } from "./gateway";
import { pcListQuery } from "./pcs";
import { readRequestBody, RequestBodyError } from "./request-body";
import { retryAfterHeaders } from "./retry-after";

export async function pcsProxy(request: Request, id?: string): Promise<Response> {
  const fail = (status: number, retryAfter: string | null = null) => Response.json({ detail: status === 503 ? "Service unavailable" : "Request failed" }, { status, headers: { "Cache-Control": "no-store", ...retryAfterHeaders(status, retryAfter) } });
  if (id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return fail(422);
  const allowed = id === undefined ? ["GET", "POST"] : ["GET", "PUT", "DELETE"];
  if (!allowed.includes(request.method)) return fail(405);
  const url = new URL(request.url);
  let query = "";
  try {
    if (id === undefined && request.method === "GET") query = `?${pcListQuery(url.searchParams)}`;
    else if (url.search) return fail(422);
  } catch { return fail(422); }
  const pathname = id === undefined ? "/api/pcs" : `/api/pcs/${id.toLowerCase()}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) {
    const value = request.headers.get(key);
    if (value !== null) headers.set(key, value);
  }
  try {
    const body = ["POST", "PUT"].includes(request.method) ? await readRequestBody(request) : undefined;
    const upstream = await fetch(new URL(pathname + query, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), {
      method: request.method, headers, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]), body,
    });
    if (!upstream.ok) return fail(upstream.status, upstream.headers.get("Retry-After"));
    if (upstream.status === 204) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return Response.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
