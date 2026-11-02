import { towerRecommendationsProxy } from "../../../../../../lib/tower-recommendations-proxy";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return towerRecommendationsProxy(request, (await params).id);
}
