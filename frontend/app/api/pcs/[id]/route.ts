import { pcsProxy } from "../../../../lib/pcs-proxy";
export const runtime = "nodejs";
async function proxy(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return pcsProxy(request, (await params).id);
}
export const GET = proxy;
export const PUT = proxy;
export const DELETE = proxy;
