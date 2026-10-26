import { recommendationsProxy } from "../../../../../../lib/recommendations-proxy";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return recommendationsProxy(request, (await params).id);
}
