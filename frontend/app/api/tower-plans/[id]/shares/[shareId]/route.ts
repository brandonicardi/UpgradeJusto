import { towerShareProxy, shareResponseHeaders } from "../../../../../../lib/tower-share-proxy";
export const dynamic = "force-dynamic";
export const DELETE = towerShareProxy;
export function OPTIONS() { return new Response(null, { status: 405, headers: shareResponseHeaders }); }
