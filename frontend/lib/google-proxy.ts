import { signedProxyHeaders } from "./gateway";
import { readRequestBody, RequestBodyError, REQUEST_BODY_LIMITS } from "./request-body";
import { retryAfterHeaders } from "./retry-after";
import { publicUser } from "./public-user";

export type GoogleAction = "config" | "attempts" | "signin";
export async function googleProxy(request: Request, action: GoogleAction): Promise<Response> {
  const fail = (status: number, headers: HeadersInit = { "Cache-Control": "no-store" }) => Response.json({ detail: "Google sign-in request failed" }, { status, headers });
  if (!["config", "attempts", "signin"].includes(action)) return fail(404);
  if (request.method !== (action === "config" ? "GET" : "POST")) return fail(405);
  if (new URL(request.url).search) return fail(422);
  const pathname = action === "signin" ? "/api/auth/google" : `/api/auth/google/${action}`;
  const signed = signedProxyHeaders(request.headers.get("X-UJ-Socket-IP"), request.method, pathname, process.env.UJ_PROXY_SECRET);
  if (!signed) return fail(503);
  const headers = new Headers(signed);
  for (const key of ["Origin", "Cookie", "Content-Type", "X-CSRF-Token"]) { const value = request.headers.get(key); if (value !== null) headers.set(key, value); }
  try {
    let body: string | undefined;
    if (request.method === "POST") {
      body = await readRequestBody(request, REQUEST_BODY_LIMITS.auth);
      let value: unknown;
      try { value = body === "" ? {} : JSON.parse(body); } catch { return fail(400); }
      if (!value || typeof value !== "object" || Array.isArray(value)) return fail(422);
      const data = value as Record<string, unknown>, keys = Object.keys(data);
      if (action === "attempts" ? keys.length !== 0 : keys.length !== 2 || !keys.includes("attempt_id") || !keys.includes("credential") || typeof data.attempt_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.attempt_id) || typeof data.credential !== "string" || !data.credential.length) return fail(422);
    }
    const upstream = await fetch(new URL(pathname, process.env.CATALOG_API_URL || "http://127.0.0.1:8000"), { method: request.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    const outgoing = new Headers({ "Cache-Control": "no-store", ...retryAfterHeaders(upstream.status, upstream.headers.get("Retry-After")) });
    for (const cookie of upstream.headers.getSetCookie()) outgoing.append("Set-Cookie", cookie);
    if (!upstream.ok) return fail(upstream.status, outgoing);
    const data = await upstream.json();
    const result = action === "signin" ? publicUser(data) : action === "config" ? { enabled: data.enabled, client_id: data.client_id } : { attempt_id: data.attempt_id, nonce: data.nonce, expires_at: data.expires_at };
    return Response.json(result, { status: upstream.status, headers: outgoing });
  } catch (error) { return fail(error instanceof RequestBodyError ? error.status : 503); }
}
