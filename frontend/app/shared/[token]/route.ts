import { publicShareProxy, publicHeaders, publicMethodNotAllowed } from "../../../lib/shares-proxy";
import { sharedHtml, sharedStyleHash } from "../../../lib/shared-html";
import type { JsonValue } from "../../../lib/compatibility";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const response = await publicShareProxy(request, (await params).token);
  let snapshot: Record<string, JsonValue> | null = null;
  let status = response.status;
  if (response.ok) {
    try { snapshot = await response.json(); } catch { status = 503; }
  }
  return new Response(sharedHtml(snapshot, status === 503), { status, headers: { ...publicHeaders, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": `default-src 'none'; style-src 'sha256-${sharedStyleHash}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`, "X-Content-Type-Options": "nosniff" } });
}
export const HEAD = publicMethodNotAllowed;
export const OPTIONS = publicMethodNotAllowed;
export const POST = publicMethodNotAllowed;
export const PUT = publicMethodNotAllowed;
export const PATCH = publicMethodNotAllowed;
export const DELETE = publicMethodNotAllowed;
