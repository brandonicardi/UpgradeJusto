import { sharesProxy } from "../../../../../../lib/shares-proxy";
export const runtime = "nodejs";
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; shareId: string }> }) {
  const { id, shareId } = await params; return sharesProxy(request, id, shareId);
}
