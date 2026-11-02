import { towerCompatibilityProxy } from "../../../../../lib/tower-compatibility-proxy";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return towerCompatibilityProxy(request, (await params).id, "simulate");
}
