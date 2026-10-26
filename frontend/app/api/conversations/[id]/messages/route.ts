import { assistantProxy } from "../../../../../lib/assistant-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return assistantProxy(request, (await params).id, true); }
export async function POST(request: Request, { params }: Context) { return assistantProxy(request, (await params).id, true); }
