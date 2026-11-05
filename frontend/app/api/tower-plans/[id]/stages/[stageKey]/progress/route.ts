import { towerPlansProxy } from "../../../../../../../lib/tower-plans-proxy";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; stageKey: string }> };
export async function PUT(request: Request, { params }: Context) { const { id, stageKey } = await params; return towerPlansProxy(request, id, "progress", stageKey); }
export async function DELETE(request: Request, { params }: Context) { const { id, stageKey } = await params; return towerPlansProxy(request, id, "progress", stageKey); }
