import { extractionWaitMs } from "./extraction-wait";
import { adminGatewayPath, signedProxyHeaders } from "./gateway";
import { readRequestBody, RequestBodyError, REQUEST_BODY_LIMITS } from "./request-body";
import { retryAfterHeaders } from "./retry-after";

// No caller-controlled upstream paths; closed methods, collections and identifiers.
export async function curationProxy(request: Request, pathname: string): Promise<Response> {
  const fail = (status: number) => Response.json({ detail: "Solicitud no completada" }, { status, headers: { "Cache-Control": "no-store" } });
  const extraction = ["/api/pcs/extract", "/api/pcs/extract/confirm"].includes(pathname) && request.method === "POST";
  if (!extraction && !adminGatewayPath(pathname, request.method)) return fail(405);
  const url = new URL(request.url);
  if (url.search) {
    if (extraction || request.method !== "GET") return fail(422);
    for (const [key, value] of url.searchParams) {
      if (!["limit", "offset"].includes(key) || url.searchParams.getAll(key).length !== 1 || !/^\d{1,8}$/.test(value) || (key === "limit" && (Number(value) < 1 || Number(value) > 100))) return fail(422);
    }
  }
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) {
    const value = request.headers.get(key); if (value !== null) headers.set(key, value);
  }
  try {
    const body = ["POST", "PATCH"].includes(request.method) ? await readRequestBody(request, pathname === "/api/pcs/extract" ? REQUEST_BODY_LIMITS.extract : REQUEST_BODY_LIMITS.json) : undefined;
    const upstream = await fetch(new URL(pathname + url.search, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), {
      method: request.method, headers, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(extraction ? extractionWaitMs() : 15000)]), body,
    });
    if (!upstream.ok) {
      // Forward field locations only: never validation input, raw messages or bodies.
      let fields: string[] = [];
      if (upstream.status === 422) {
        const data = await upstream.json().catch(() => null);
        if (Array.isArray(data?.detail)) fields = data.detail.flatMap((item: { loc?: unknown }) => Array.isArray(item?.loc) ? [item.loc.filter((x: unknown) => typeof x === "number" || (typeof x === "string" && /^[a-z_]{1,40}$/.test(x))).join(".")] : []).slice(0, 20);
      }
      return Response.json({ detail: "Solicitud no completada", fields }, { status: upstream.status, headers: { "Cache-Control": "no-store", ...retryAfterHeaders(upstream.status, upstream.headers.get("Retry-After")) } });
    }
    if (upstream.status === 204) return new Response(null, { status: 204 });
    return Response.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
