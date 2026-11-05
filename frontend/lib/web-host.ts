export const DEFAULT_WEB_HOST = "127.0.0.1";
const ALLOWED_WEB_HOSTS = new Set(["127.0.0.1", "0.0.0.0"]);

export function resolveWebHost(env: Record<string, string | undefined>): string {
  const raw = env.UJ_WEB_HOST;
  if (raw === undefined) return DEFAULT_WEB_HOST;
  if (!ALLOWED_WEB_HOSTS.has(raw)) {
    throw new Error("UJ_WEB_HOST invalido: debe ser exactamente 127.0.0.1 o 0.0.0.0");
  }
  return raw;
}
