export class TowerShareError extends Error {
  constructor(public status: number, public retryAfter: string | null = null) { super(status === 409 ? "Conflicto de revisión. Revisá explícitamente; no se reenvía ni actualiza la revisión automáticamente." : status === 429 ? "Límite de solicitudes alcanzado. No se reintentó la operación." : status === 404 ? "Recurso no disponible para esta sesión." : status === 401 || status === 403 ? "Sesión o permisos insuficientes para esta operación." : "No se pudo confirmar la operación de compartir."); }
}
export async function towerShareRequest(path: string, method = "GET", body?: unknown, signal?: AbortSignal, dispatched?: () => void) {
  const headers = new Headers();
  const requestSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15000)]);
  if (method !== "GET") {
    const csrf = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin", signal: requestSignal });
    if (!csrf.ok) throw new TowerShareError(csrf.status);
    const token = await csrf.json(); if (typeof token.csrf_token !== "string") throw new TowerShareError(503);
    headers.set("X-CSRF-Token", token.csrf_token); headers.set("Content-Type", "application/json");
  }
  dispatched?.();
  const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", credentials: "same-origin", signal: requestSignal, redirect: "error" });
  if (!response.ok) { const retry = response.headers.get("Retry-After"); throw new TowerShareError(response.status, retry && /^\d{1,8}$/.test(retry) ? retry : null); }
  return response;
}
export function shareStateLabel(state: string) { return state === "active" ? "Activo" : state === "revoked" ? "Revocado" : state === "disabled_plan_deleted" ? "Deshabilitado por baja del plan" : "Estado no reconocido; no se confirma acceso"; }
export function shareCreateUncertain(dispatched: boolean, failure: unknown): boolean {
  return dispatched && (!(failure instanceof TowerShareError) || [408, 500, 502, 503, 504].includes(failure.status));
}
