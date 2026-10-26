import { compatibilityProxy } from "../../../../../../lib/compatibility-proxy";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return compatibilityProxy(request, (await params).id, "simulate");
}
