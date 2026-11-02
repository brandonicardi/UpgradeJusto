import { towerExtractionProxy } from "../../../../lib/tower-extraction-proxy";
export const runtime = "nodejs";
export const POST = (request: Request) => towerExtractionProxy(request, "extract");
