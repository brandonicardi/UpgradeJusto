import { signedProxyHeaders } from "../../../../lib/gateway";
import { readRequestBody, RequestBodyError, REQUEST_BODY_LIMITS } from "../../../../lib/request-body";
import { retryAfterHeaders } from "../../../../lib/retry-after";
import { publicUser } from "../../../../lib/public-user";

export const runtime = "nodejs";
const methods: Record<string, string> = { csrf: "GET", session: "GET", register: "POST", login: "POST", logout: "POST" };

async function proxy(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!Object.hasOwn(methods, action)) return new Response(null, { status: 404 });
  if (methods[action] !== request.method) return new Response(null, { status: 405, headers: { Allow: methods[action] } });
  if (new URL(request.url).search) return Response.json({ detail: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const pathname = `/api/auth/${action}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return Response.json({ detail: "Service unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const headers = new Headers(signed);
  // Preserve browser Origin verbatim. Backend validates the configured public origin.
  // Never substitute internal Origin or forward client-supplied identity/IP headers.
  for (const name of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  try {
    const body = request.method === "POST" ? await readRequestBody(request, REQUEST_BODY_LIMITS.auth) : undefined;
    const upstream = await fetch(new URL(pathname, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), {
      method: request.method, headers,
      body,
      cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
    });
    const outgoing = new Headers({ "Cache-Control": "no-store" });
    for (const cookie of upstream.headers.getSetCookie()) outgoing.append("Set-Cookie", cookie);
    for (const [name, value] of Object.entries(retryAfterHeaders(upstream.status, upstream.headers.get("Retry-After")))) outgoing.set(name, value);
    if (upstream.status === 204) return new Response(null, { status: 204, headers: outgoing });
    // Never reflect validation payloads, passwords or internal exceptions.
    if (!upstream.ok) return Response.json({ detail: "Request failed" }, { status: upstream.status, headers: outgoing });
    const data = await upstream.json();
    const result = action === "csrf" ? { csrf_token: data.csrf_token } : publicUser(data);
    return Response.json(result, { status: upstream.status, headers: outgoing });
  } catch (error) {
    return Response.json({ detail: error instanceof RequestBodyError ? "Request failed" : "Service unavailable" }, { status: error instanceof RequestBodyError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = proxy;
export const POST = proxy;
