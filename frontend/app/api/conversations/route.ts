import { assistantProxy } from "../../../lib/assistant-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return assistantProxy(request); }
export async function POST(request: Request) { return assistantProxy(request); }
