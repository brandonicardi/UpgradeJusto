export const shareTokenPattern = /^[A-Za-z0-9_-]{43}$/;
export function validPublicPath(value: unknown): value is string {
  return typeof value === "string" && /^\/shared\/[A-Za-z0-9_-]{43}$/.test(value);
}
export type ShareMetadata = { id: string; plan_revision: number | string; title: string; created_at: string; revoked_at: string | null };
export type ShareCreated = Omit<ShareMetadata, "revoked_at"> & { path: string };
export function shareInput(revision: number, title: string) {
  const value = title.trim();
  if (!Number.isInteger(revision) || revision < 1 || !value || value.length > 100 || value.includes("\0")) throw new Error("Título público: 1 a 100 caracteres sin NUL; recargá la revisión del plan.");
  return { expected_plan_revision: revision, title: value };
}
export function shareError(status: number) {
  if (status === 409) return "El plan cambió. Recargá el snapshot antes de publicar su revisión.";
  if (status === 401) return "Iniciá sesión para gestionar publicaciones.";
  if (status === 403) return "Solicitud no autorizada. Renovación CSRF necesaria.";
  if (status === 404) return "Plan o publicación no disponible para esta sesión.";
  if (status === 422) return "Revisá el título y revisión de publicación.";
  return "Servicio de publicaciones no disponible. No se confirmó la operación.";
}
export async function shareRequest(planId: string, method = "GET", body?: { expected_plan_revision: number; title: string }, shareId?: string): Promise<Response> {
  const headers = new Headers();
  if (method !== "GET") {
    const csrf = await fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!csrf.ok) throw new Error(shareError(csrf.status));
    const token = await csrf.json();
    if (typeof token.csrf_token !== "string") throw new Error(shareError(503));
    headers.set("Content-Type", "application/json"); headers.set("X-CSRF-Token", token.csrf_token);
  }
  const response = await fetch(`/api/plans/${planId}/shares${shareId ? `/${shareId}` : ""}`, { method, headers, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000), body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(shareError(response.status));
  return response;
}
