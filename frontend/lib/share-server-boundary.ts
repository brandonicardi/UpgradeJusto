import type { IncomingMessage, ServerResponse } from "node:http";

export const shareBoundaryHeaders = Object.freeze({ "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" });
export const SHARE_SERVER_READY = "UJ_SHARE_TEST_READY";
export const SHARE_SERVER_STOP = "UJ_SHARE_TEST_STOP";
export const SHARE_SERVER_CLOSED = "UJ_SHARE_TEST_GRACEFUL_COMPLETED";
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function classifyShareTarget(raw: string | undefined) {
  const target = raw ?? "", segments = target.split(/[?#]/, 1)[0].split("/");
  const decodePrefix = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
  // Decode only routing-prefix segments for classification, NEVER the bearer.
  // Do not mutate req.url, parse it with URL, normalize dot segments, or re-sign.
  const prefix: string[] = []; let publicShare = false;
  for (const segment of segments) {
    for (const part of decodePrefix(segment).split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") prefix.pop(); else prefix.push(part);
      if (prefix[0] === "shared-tower-plans" || (prefix[0] === "api" && prefix[1] === "shared-tower-plans")) { publicShare = true; break; }
    }
    if (publicShare) break; // Stop before decoding any actual capability segment.
  }
  const privateShare = new RegExp(`^/(?:api/)?tower-plans/${uuid}/shares(?:[/?#]|$)`).test(target);
  return { share: publicShare || privateShare, publicShare, canonical: /^\/(?:api\/)?shared-tower-plans\/[A-Za-z0-9_-]{1,128}$/.test(target) };
}
export function testShareServerControl(env: Readonly<Record<string, string | undefined>>): boolean {
  const flag = env.UJ_TEST_SHARE_SERVER_CONTROL;
  if (flag === undefined || flag === "0") return false;
  if (flag !== "1" || env.UJ_ENV !== "test" || !env.DATABASE_URL?.trim() || env.DATABASE_URL !== env.TEST_DATABASE_URL) throw new Error("Share TEST control unavailable");
  return true;
}
export function createShareRequestListener(handle: (request: IncomingMessage, response: ServerResponse) => unknown | Promise<unknown>, stamp: (request: IncomingMessage) => boolean) {
  const pending = new Set<Promise<void>>();
  const listener = (request: IncomingMessage, response: ServerResponse) => {
    const work = (async () => {
      const target = classifyShareTarget(request.url);
      if (target.share) for (const [name, value] of Object.entries(shareBoundaryHeaders)) response.setHeader(name, value);
      const fail = (status: number) => { if (!response.headersSent) { response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": target.share ? shareBoundaryHeaders["Cache-Control"] : "no-store" }); response.end(JSON.stringify({ detail: status === 404 ? "Share request unavailable" : "Service unavailable" })); } else response.destroy(); };
      try {
        if (!stamp(request)) { fail(503); return; }
        if (target.publicShare && (request.method !== "GET" || !target.canonical)) { fail(404); return; }
        await handle(request, response);
      } catch { fail(503); }
    })();
    pending.add(work); void work.then(() => pending.delete(work), () => pending.delete(work));
  };
  return { listener, pending: () => pending.size, async drain() { while (pending.size) await Promise.allSettled([...pending]); } };
}
