import { authError, type PublicUser } from "./auth";
import { PASSWORD_MAX, PASSWORD_MIN } from "./account-access";
import { publicUser } from "./public-user";

export const DISPLAY_NAME_MAX = 200;
export const DELETE_WORD = "BORRAR";

export function isGoogleUser(user: PublicUser): boolean {
  return "auth_provider" in user && user.auth_provider === "google";
}

export function normalizeDisplayName(raw: string): string {
  return raw.trim();
}

/** Texto del error junto al campo, o `null` si el nombre sirve. */
export function validateDisplayName(raw: string): string | null {
  const name = normalizeDisplayName(raw);
  if (!name) return "Escribí cómo querés que te llamemos.";
  if (name.length > DISPLAY_NAME_MAX) return `Usá hasta ${DISPLAY_NAME_MAX} caracteres.`;
  return null;
}

/** Texto del error junto al campo, o `null` si la contraseña nueva cumple el largo pedido. */
export function validateNewPassword(value: string): string | null {
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) return `La contraseña nueva tiene que tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`;
  return null;
}

/** La palabra de confirmación se compara recortada y en mayúsculas. */
export function canConfirmDelete(text: string): boolean {
  return text.trim().toUpperCase() === DELETE_WORD;
}

// Cuerpos exactos de cada pedido: nunca llevan identidad (`user_id`, `email`, `id`).
export function displayNameBody(raw: string): { display_name: string } {
  return { display_name: normalizeDisplayName(raw) };
}

export function passwordBody(current: string, next: string): { current_password: string; new_password: string } {
  return { current_password: current, new_password: next };
}

export function deleteBody(user: PublicUser, password: string): { confirmation: string; password?: string } {
  return isGoogleUser(user) ? { confirmation: DELETE_WORD } : { confirmation: DELETE_WORD, password };
}

export type AccountOperation = "name" | "password" | "delete";

export const GOOGLE_NO_PASSWORD = "Esta cuenta entra con Google y no tiene contraseña acá.";

/** Mensaje para personas; no revela datos de la cuenta ni detalles del servidor. */
export function describeAccountFailure(operation: AccountOperation, status: number, retryAfter: string | null = null): string {
  if (status === 429) return authError(429, retryAfter);
  if (operation === "name") {
    if (status === 400 || status === 422) return `Revisá el nombre: no puede quedar vacío ni pasar de ${DISPLAY_NAME_MAX} caracteres.`;
    if (status === 401) return "Tu sesión venció. Volvé a entrar para guardar el cambio.";
    return "No pudimos guardar el cambio. Probá de nuevo en un rato.";
  }
  if (operation === "password") {
    if (status === 409) return GOOGLE_NO_PASSWORD;
    if (status === 400 || status === 422) return `La contraseña nueva tiene que tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`;
    if (status === 401) return "No pudimos cambiar la contraseña. Revisá los datos y probá de nuevo.";
    return "No pudimos cambiar la contraseña. Probá de nuevo en un rato.";
  }
  if (status === 400) return `Escribí ${DELETE_WORD} para confirmar. No se borró nada.`;
  if (status === 401) return "No pudimos confirmar tu contraseña. Revisala y probá de nuevo. No se borró nada.";
  return "No pudimos borrar la cuenta. No se borró nada. Probá de nuevo en un rato.";
}

export class AccountSettingsError extends Error {
  constructor(public readonly operation: AccountOperation, public readonly status: number, retryAfter: string | null = null) {
    super(describeAccountFailure(operation, status, retryAfter));
  }
}

const REQUESTS: Record<AccountOperation, { method: string; path: string }> = {
  name: { method: "PATCH", path: "/api/auth/account" },
  password: { method: "POST", path: "/api/auth/password" },
  delete: { method: "DELETE", path: "/api/auth/account" },
};

/** Pide el token anti-falsificación y manda el cambio; la sesión viaja en la cookie. */
export async function sendAccountChange(operation: AccountOperation, body: object, request: typeof fetch = fetch): Promise<Response> {
  const options: RequestInit = { credentials: "same-origin", cache: "no-store" };
  let response: Response;
  try {
    const csrf = await request("/api/auth/csrf", options);
    if (!csrf.ok) throw new AccountSettingsError(operation, csrf.status, csrf.headers.get("Retry-After"));
    const data: unknown = await csrf.json();
    if (!data || typeof data !== "object" || !("csrf_token" in data) || typeof data.csrf_token !== "string") throw new AccountSettingsError(operation, 503);
    const { method, path } = REQUESTS[operation];
    response = await request(path, { ...options, method, headers: { "Content-Type": "application/json", "X-CSRF-Token": data.csrf_token }, body: JSON.stringify(body) });
  } catch (failure) {
    throw failure instanceof AccountSettingsError ? failure : new AccountSettingsError(operation, 503);
  }
  if (!response.ok) throw new AccountSettingsError(operation, response.status, response.headers.get("Retry-After"));
  return response;
}

/** Guarda el nombre y devuelve el usuario que respondió el servidor. */
export async function saveDisplayName(raw: string, request: typeof fetch = fetch): Promise<PublicUser> {
  const response = await sendAccountChange("name", displayNameBody(raw), request);
  try { return publicUser(await response.json()); } catch { throw new AccountSettingsError("name", 503); }
}
