import type { Category } from "./catalog";
import type { PCInput } from "./pcs";
export type Extraction = { proposal: PCInput; evidence: { field: Category; origin: "catalog" | "text" | "unknown" | "ambiguous"; excerpt: string | null; candidate_ids: string[] }[]; warnings: string[]; dataset_version: string };
export type Revision = { id: string; base_version: string | null; status: "draft" | "published"; active: boolean };
export type Collection = "components" | "prices" | "sources" | "cpu_support";
export type Row = { id: string; data: Record<string, unknown> };
export type AdminPage<T> = { items: T[]; total: number; limit: number; offset: number };
export class CurationError extends Error { constructor(public status: number, public fields: string[] = []) { super(curationError(status) + (fields.length ? ` Campos: ${fields.join(", ")}.` : "")); } }
export function curationError(status: number): string {
  switch (status) {
    case 400: return "No se pudo leer la solicitud. Revisá su contenido antes de enviarla otra vez.";
    case 408: return "La solicitud se interrumpió o excedió el tiempo disponible. No se reintentó.";
    case 413: return "La solicitud supera el tamaño permitido. Reducí el texto o los datos.";
    case 401: return "Necesitás iniciar sesión.";
    case 403: return "Acceso denegado por el servidor: sesión, CSRF o rol insuficiente.";
    case 404: return "Referencia no disponible.";
    case 409: return "Revisión obsoleta o publicada: revisá la versión activa y las referencias. No hubo remapeo automático.";
    case 422: return "Datos inválidos: revisá campos, tipos y referencias del contrato.";
    case 429: return "Límite de solicitudes o cuota alcanzado. No se reintentó la extracción.";
    case 502: return "El proveedor no entregó una propuesta válida.";
    case 504: return "El proveedor excedió el tiempo disponible.";
    default: return "Servicio no disponible. Si enviaste un guardado, el resultado puede ser incierto: revisá Mis PCs o las revisiones antes de reenviar. No se reintentó.";
  }
}
export async function curationRequest(path: string, method = "GET", body?: unknown): Promise<Response> {
  const headers = new Headers();
  if (method !== "GET") {
    const csrf = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
    if (!csrf.ok) throw new CurationError(csrf.status);
    const token = await csrf.json();
    if (typeof token.csrf_token !== "string") throw new CurationError(503);
    headers.set("X-CSRF-Token", token.csrf_token); headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try { response = await fetch(path, { method, headers, cache: "no-store", credentials: "same-origin", body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new CurationError(503); }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new CurationError(response.status, Array.isArray(error?.fields) ? error.fields.filter((x: unknown) => typeof x === "string") : []);
  }
  return response;
}
export const collectionKeys: Record<Collection, string[]> = {
  components: ["category", "name", "attributes", "sources"], prices: ["component_id", "amount", "currency", "date", "source"],
  sources: ["source_id", "url", "consulted_on", "locator"], cpu_support: ["cpu_component_id", "motherboard_component_id", "cpu_socket", "motherboard_socket", "applicable_revision", "row"],
};
export function parseAdminData(text: string, collection: Collection): Record<string, unknown> {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error("JSON inválido. Usá comillas dobles, sin comentarios ni código."); }
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some(key => !collectionKeys[collection].includes(key))) throw new Error("Objeto de datos con campos no admitidos. Consultá el contrato visible.");
  return data as Record<string, unknown>;
}
