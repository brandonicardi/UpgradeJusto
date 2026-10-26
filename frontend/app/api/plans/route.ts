import { plansProxy } from "../../../lib/plans-proxy";
export const runtime = "nodejs";
export async function GET(request: Request) { return plansProxy(request); }
export async function POST(request: Request) { return plansProxy(request); }
