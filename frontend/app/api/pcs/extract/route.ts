import { curationProxy } from "../../../../lib/curation-proxy";
export const runtime = "nodejs";
export async function POST(request: Request) { return curationProxy(request, "/api/pcs/extract"); }
