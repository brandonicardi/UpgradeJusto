import { pcsProxy } from "../../../lib/pcs-proxy";
export const runtime = "nodejs";
export const GET = (request: Request) => pcsProxy(request);
export const POST = (request: Request) => pcsProxy(request);
