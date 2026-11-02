import { towerShareProxy, shareResponseHeaders } from "../../../../../lib/tower-share-proxy";
export const dynamic = "force-dynamic";
export const GET = towerShareProxy;
export const POST = towerShareProxy;
export function HEAD() { return new Response(null, { status: 405, headers: shareResponseHeaders }); }
export function OPTIONS() { return new Response(null, { status: 405, headers: shareResponseHeaders }); }
