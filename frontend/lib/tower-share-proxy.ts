import { signedProxyHeaders } from "./gateway";
import { readRequestBody, RequestBodyError, REQUEST_BODY_LIMITS } from "./request-body";
import { retryAfterHeaders } from "./retry-after";
import { parseCreatedShare, parsePublicTowerShare, parseShareList } from "./tower-share-dto";

export const shareResponseHeaders = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
const id = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function towerShareRoute(path: string, method: string): "public" | "private" | null {
  if (method === "GET" && /^\/api\/shared-tower-plans\/[A-Za-z0-9_-]{1,128}$/.test(path)) return "public";
  if ((["GET", "POST"].includes(method) && new RegExp(`^/api/tower-plans/${id}/shares$`).test(path)) || (method === "DELETE" && new RegExp(`^/api/tower-plans/${id}/shares/${id}$`).test(path))) return "private";
  return null;
}
export async function boundedShareJSON(response: Response, limit = 1048576): Promise<unknown> {
  const length = response.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error("Share response unavailable");
  if (!response.body) throw new Error("Share response unavailable");
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > limit) throw new Error("Share response unavailable"); chunks.push(next.value); }
    const bytes = new Uint8Array(size); let position = 0; for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
export async function towerShareProxy(request: Request): Promise<Response> {
  const fail = (status: number, retry: string | null = null) => Response.json({ detail: "Share request unavailable" }, { status, headers: { ...shareResponseHeaders, ...retryAfterHeaders(status, retry) } });
  const url = new URL(request.url), route = towerShareRoute(url.pathname, request.method);
  if (!route || url.search || url.hash || request.url.includes("%")) return fail(404);
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, url.pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  if (route === "private") for (const name of ["Cookie", "Origin", "Content-Type", "X-CSRF-Token"]) { const value = request.headers.get(name); if (value !== null) headers.set(name, value); }
  try {
    const body = request.method === "GET" ? undefined : await readRequestBody(request, REQUEST_BODY_LIMITS.json);
    const response = await fetch(new URL(url.pathname, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) { void response.body?.cancel().catch(() => undefined); const allowed = route === "public" ? [404, 429, 503] : [400, 401, 403, 404, 408, 409, 413, 422, 429, 503]; return fail(allowed.includes(response.status) ? response.status : 503, response.headers.get("Retry-After")); }
    if (request.method === "DELETE") return response.status === 204 ? new Response(null, { status: 204, headers: shareResponseHeaders }) : fail(503);
    const value = await boundedShareJSON(response, route === "public" ? 1048576 : 262144);
    const parsed = route === "public" ? parsePublicTowerShare(value) : request.method === "POST" ? parseCreatedShare(value) : parseShareList(value);
    if (request.method === "POST" && response.status !== 201) return fail(503);
    return Response.json(parsed, { status: response.status, headers: shareResponseHeaders });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
