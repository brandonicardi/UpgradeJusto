import { curationProxy } from "../../../../lib/curation-proxy";
export const runtime = "nodejs";
async function proxy(request: Request, { params }: { params: Promise<{ segments: string[] }> }) {
  return curationProxy(request, `/api/admin/${(await params).segments.join("/")}`);
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
