import { publicShareProxy, publicMethodNotAllowed } from "../../../../lib/shares-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) { return publicShareProxy(request, (await params).token); }
export const HEAD = publicMethodNotAllowed;
export const OPTIONS = publicMethodNotAllowed;
export const POST = publicMethodNotAllowed;
export const PUT = publicMethodNotAllowed;
export const PATCH = publicMethodNotAllowed;
export const DELETE = publicMethodNotAllowed;
