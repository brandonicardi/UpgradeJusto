import { sessionChangedEvent } from "./session-role";
export type PublicUser = { id: string; email: string };

export function authError(status: number, retryAfter: string | null = null): string {
  switch (status) {
    case 400: return "No se pudo leer la solicitud. Revisá los datos antes de volver a enviarla.";
    case 408: return "La solicitud se interrumpió o excedió el tiempo disponible. No se reintentó automáticamente.";
    case 413: return "La solicitud supera el tamaño permitido. Reducí los datos antes de volver a enviarla.";
    case 401: return "Email o contraseña incorrectos, o sesión vencida. Volvé a iniciar sesión.";
    case 403: return "No se pudo validar la solicitud. Volvé a intentarlo para renovar la protección de sesión.";
    case 409: return "Ese email ya está registrado. Podés iniciar sesión.";
    case 422: return "Revisá el email y la contraseña según los requisitos indicados.";
    case 429: return retryAfter && /^\d{1,8}$/.test(retryAfter) ? `Demasiados intentos. Esperá ${Number(retryAfter)} segundos antes de volver a intentar.` : "Demasiados intentos. Esperá antes de volver a intentar.";
    case 503: return "El servicio de cuentas no está disponible. Intentá más tarde.";
    default: return "No se pudo completar la solicitud. Intentá más tarde.";
  }
}

export async function authRequest(action: string, payload?: { email: string; password: string }): Promise<Response> {
  const options: RequestInit = { credentials: "same-origin", cache: "no-store" };
  if (payload || action === "logout") {
    const csrf = await fetch("/api/auth/csrf", options);
    if (!csrf.ok) throw new Error(authError(csrf.status, csrf.headers.get("Retry-After")));
    const data: unknown = await csrf.json();
    if (!data || typeof data !== "object" || !("csrf_token" in data) || typeof data.csrf_token !== "string") throw new Error(authError(503));
    options.method = "POST";
    options.headers = { "Content-Type": "application/json", "X-CSRF-Token": data.csrf_token };
    if (payload) options.body = JSON.stringify(payload);
  }
  const response = await fetch(`/api/auth/${action}`, options);
  if (!response.ok) throw new Error(authError(response.status, response.headers.get("Retry-After")));
  if (["login", "logout", "register"].includes(action) && typeof window !== "undefined") window.dispatchEvent(new Event(sessionChangedEvent));
  return response;
}
