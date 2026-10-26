import { signedProxyHeaders } from "./gateway";
import { pcListQuery } from "./pcs";
import { readRequestBody, RequestBodyError, REQUEST_BODY_LIMITS } from "./request-body";
import { retryAfterHeaders } from "./retry-after";

export async function assistantProxy(request: Request, id?: string, messages = false): Promise<Response> {
  const baseHeaders = { "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" };
  const fail = (status: number, retryAfter: string | null = null) => Response.json({ detail: status === 503 ? "Service unavailable" : "Request failed" }, { status, headers: { ...baseHeaders, ...retryAfterHeaders(status, retryAfter) } });
  if (id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return fail(422);
  if (messages && !id) return fail(422);
  const allowed = messages || !id ? ["GET", "POST"] : ["GET", "DELETE"];
  if (!allowed.includes(request.method)) return fail(405);
  const url = new URL(request.url);
  let query = "";
  try {
    if (request.method === "GET" && (!id || messages)) query = `?${pcListQuery(url.searchParams)}`;
    else if (url.search) return fail(422);
  } catch { return fail(422); }
  const pathname = `/api/conversations${id ? `/${id.toLowerCase()}` : ""}${messages ? "/messages" : ""}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) { const value = request.headers.get(key); if (value !== null) headers.set(key, value); }
  try {
    const streaming = messages && request.method === "POST";
    const body = request.method === "POST" ? await readRequestBody(request, streaming ? REQUEST_BODY_LIMITS.assistantMessage : REQUEST_BODY_LIMITS.json) : undefined;
    const response = await fetch(new URL(pathname + query, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), {
      method: request.method, headers, body,
      cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(streaming ? 105000 : 15000)]),
    });
    if (!response.ok) return fail(response.status, response.headers.get("Retry-After"));
    if (streaming) {
      if (!response.body || !response.headers.get("Content-Type")?.toLowerCase().startsWith("text/event-stream")) return fail(503);
      // Pass the upstream stream itself: no text()/json(), buffering, replay or retry.
      return new Response(response.body, { status: response.status, headers: { ...baseHeaders, "Content-Type": "text/event-stream; charset=utf-8" } });
    }
    if (response.status === 204) return new Response(null, { status: 204, headers: baseHeaders });
    return Response.json(await response.json(), { status: response.status, headers: baseHeaders });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
