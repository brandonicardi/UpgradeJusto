import { googleProxy } from "../../../../../lib/google-proxy";
export const runtime = "nodejs";
export const GET = (request: Request) => googleProxy(request, "config");
