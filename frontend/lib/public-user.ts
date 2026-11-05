export type PublicUser = { id: string; email: string; display_name?: string | null } | { id: string; email: string | null; auth_provider: "google"; display_name: string | null };
export function publicUser(value: unknown): PublicUser {
  if (!value || typeof value !== "object") throw new Error("Invalid public user");
  const data = value as Record<string, unknown>;
  if (typeof data.id !== "string") throw new Error("Invalid public user");
  if (data.auth_provider === "google") {
    if ((data.email !== null && typeof data.email !== "string") || (data.display_name !== null && typeof data.display_name !== "string")) throw new Error("Invalid public user");
    return { id: data.id, email: data.email, auth_provider: "google", display_name: data.display_name };
  }
  if (typeof data.email !== "string") throw new Error("Invalid public user");
  // Las cuentas locales también pueden tener nombre; si no viene, el usuario público queda como antes.
  if (typeof data.display_name === "string") return { id: data.id, email: data.email, display_name: data.display_name };
  return { id: data.id, email: data.email };
}
