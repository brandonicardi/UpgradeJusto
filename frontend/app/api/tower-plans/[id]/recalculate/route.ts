import { towerPlansProxy } from "../../../../../lib/tower-plans-proxy";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { return towerPlansProxy(request, (await params).id, "recalculate"); }
