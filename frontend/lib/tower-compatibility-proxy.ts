import { signedProxyHeaders } from "./gateway";
import { towerUUID } from "./towers";
import { readRequestBody, RequestBodyError } from "./request-body";
import { retryAfterHeaders } from "./retry-after";

export async function towerCompatibilityProxy(request: Request, id: string, action: "evaluate" | "simulate"): Promise<Response> {
  const fail = (status: number, retry: string | null = null) => Response.json({ detail: "Tower evaluation request failed" }, { status, headers: { "Cache-Control": "no-store", ...retryAfterHeaders(status, retry) } });
  if (!towerUUID.test(id) || !["evaluate", "simulate"].includes(action) || new URL(request.url).search) return fail(422);
  if (request.method !== "POST") return fail(405);
  // Keep the literal accepted UUID path in the signature; no query or URL rewrite.
  const pathname = `/api/towers/${id}/${action}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), "POST", pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) { const value = request.headers.get(key); if (value !== null) headers.set(key, value); }
  try {
    const body = await readRequestBody(request);
    const response = await fetch(new URL(pathname, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { method: "POST", headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) return fail(response.status, response.headers.get("Retry-After"));
    return Response.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
