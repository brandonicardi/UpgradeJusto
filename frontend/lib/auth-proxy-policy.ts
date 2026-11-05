/**
 * Política cerrada del proxy `/api/auth/[action]`: qué acciones existen, con qué método y qué
 * campos puede llevar el cuerpo. La identidad nunca viaja desde el cliente: cualquier campo fuera
 * de la lista blanca (`user_id`, `email`, `id`…) se rechaza antes de llamar al backend.
 */
export const AUTH_ACTION_METHODS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  csrf: ["GET"],
  session: ["GET"],
  register: ["POST"],
  login: ["POST"],
  logout: ["POST"],
  account: ["PATCH", "DELETE"],
  password: ["POST"],
});

type Campos = { required: readonly string[]; optional: readonly string[] };

const BODY_FIELDS: Readonly<Record<string, Readonly<Record<string, Campos>>>> = Object.freeze({
  account: {
    PATCH: { required: ["display_name"], optional: [] },
    DELETE: { required: ["confirmation"], optional: ["password"] },
  },
  password: { POST: { required: ["current_password", "new_password"], optional: [] } },
});

export function allowedMethods(action: string): readonly string[] | null {
  return Object.hasOwn(AUTH_ACTION_METHODS, action) ? AUTH_ACTION_METHODS[action] : null;
}

/** Acciones nuevas con cuerpo validado por lista blanca; login/register conservan su contrato. */
export function hasStrictBody(action: string, method: string): boolean {
  return Object.hasOwn(BODY_FIELDS, action) && Object.hasOwn(BODY_FIELDS[action], method);
}

/** `true` si el cuerpo es JSON objeto con todos los campos requeridos, solo permitidos y de tipo texto. */
export function isAllowedBody(action: string, method: string, raw: string): boolean {
  if (!hasStrictBody(action, method)) return true;
  const { required, optional } = BODY_FIELDS[action][method];
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return false; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.some((key) => !required.includes(key) && !optional.includes(key))) return false;
  if (required.some((key) => !keys.includes(key))) return false;
  return keys.every((key) => typeof (data as Record<string, unknown>)[key] === "string");
}
