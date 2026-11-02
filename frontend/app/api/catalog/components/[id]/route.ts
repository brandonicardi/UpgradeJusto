import { towerCatalogProxy } from "../../../../../lib/tower-catalog-proxy";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return towerCatalogProxy(request, (await params).id);
}
