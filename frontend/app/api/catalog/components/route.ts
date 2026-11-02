import { towerCatalogProxy } from "../../../../lib/tower-catalog-proxy";
export const runtime = "nodejs";
export const GET = (request: Request) => towerCatalogProxy(request);
