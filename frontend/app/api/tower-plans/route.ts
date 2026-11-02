import { towerPlansProxy } from "../../../lib/tower-plans-proxy";
export const runtime = "nodejs";
export const GET = (request: Request) => towerPlansProxy(request);
export const POST = (request: Request) => towerPlansProxy(request);
