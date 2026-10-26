import { sharesProxy } from "../../../../../lib/shares-proxy";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return sharesProxy(request, (await params).id); }
export async function POST(request: Request, { params }: Context) { return sharesProxy(request, (await params).id); }
