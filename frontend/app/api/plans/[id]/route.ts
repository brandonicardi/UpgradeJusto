import { plansProxy } from "../../../../lib/plans-proxy";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return plansProxy(request, (await params).id); }
export async function PUT(request: Request, { params }: Context) { return plansProxy(request, (await params).id); }
export async function DELETE(request: Request, { params }: Context) { return plansProxy(request, (await params).id); }
