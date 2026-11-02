import { towersProxy } from "../../../lib/towers-proxy";
export const runtime = "nodejs";
export const GET = (request: Request) => towersProxy(request);
export const POST = (request: Request) => towersProxy(request);
