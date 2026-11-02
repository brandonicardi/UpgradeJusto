import { towerPlansProxy } from "../../../../../../lib/tower-plans-proxy";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string; revision: string }> }) { const values = await params; return towerPlansProxy(request, values.id, "history", values.revision); }
