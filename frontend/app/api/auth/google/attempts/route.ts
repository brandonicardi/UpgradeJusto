import { googleProxy } from "../../../../../lib/google-proxy";
export const runtime = "nodejs";
export const POST = (request: Request) => googleProxy(request, "attempts");
