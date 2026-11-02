import { towerPlansProxy } from "../../../../lib/tower-plans-proxy";
export const runtime = "nodejs";
async function proxy(request: Request, { params }: { params: Promise<{ id: string }> }) { return towerPlansProxy(request, (await params).id); }
export const GET = proxy;
export const DELETE = proxy;
