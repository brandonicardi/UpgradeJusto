import { signedProxyHeaders } from "./gateway";
import { shareTokenPattern } from "./shares";
import { readRequestBody, RequestBodyError } from "./request-body";
import { retryAfterHeaders } from "./retry-after";

export const publicHeaders = { "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate", "Pragma": "no-cache", "Expires": "0", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive" };
export function publicMethodNotAllowed() { return Response.json({ detail: "Request failed" }, { status: 405, headers: { ...publicHeaders, Allow: "GET" } }); }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function sharesProxy(request: Request, planId: string, shareId?: string): Promise<Response> {
  const fail = (status: number, retryAfter: string | null = null) => Response.json({ detail: status === 503 ? "Service unavailable" : "Request failed" }, { status, headers: { "Cache-Control": "no-store", ...retryAfterHeaders(status, retryAfter) } });
  if (!uuid.test(planId) || (shareId !== undefined && !uuid.test(shareId))) return fail(422);
  if (!(shareId ? ["DELETE"] : ["GET", "POST"]).includes(request.method)) return fail(405);
  if (new URL(request.url).search) return fail(422);
  const path = `/api/plans/${planId.toLowerCase()}/shares${shareId ? `/${shareId.toLowerCase()}` : ""}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, path, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) { const value = request.headers.get(key); if (value !== null) headers.set(key, value); }
  try {
    const body = request.method === "POST" ? await readRequestBody(request) : undefined;
    const response = await fetch(new URL(path, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) return fail(response.status, response.headers.get("Retry-After"));
    if (response.status === 204) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}

export async function publicShareProxy(request: Request, token: string): Promise<Response> {
  const fail = (status: number, retryAfter: string | null = null) => Response.json({ detail: status === 404 ? "Shared plan not found" : status === 503 ? "Service unavailable" : "Request failed" }, { status, headers: { ...publicHeaders, ...retryAfterHeaders(status, retryAfter) } });
  if (request.method !== "GET") return fail(405);
  if (!shareTokenPattern.test(token) || new URL(request.url).search) return fail(404);
  const path = `/api/shared-plans/${token}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), "GET", path, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  try {
    // No Cookie, Authorization, CSRF, Origin or Referer forwarded on public reads.
    const response = await fetch(new URL(path, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { headers: signed, cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return fail(response.status === 404 ? 404 : response.status === 429 ? 429 : 503, response.headers.get("Retry-After"));
    return Response.json(await response.json(), { headers: publicHeaders });
  } catch { return fail(503); }
}
