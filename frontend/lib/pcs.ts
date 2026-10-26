import type { Category } from "./catalog";

export type PCGroup = { category: Category; component_id: string; quantity: number };
export type PCInput = { name: string; components: PCGroup[]; context: { bios_version: string | null; notes: string | null } };
export type PC = PCInput & { id: string; revision: number };
export type PCPage = { items: PC[]; total: number; page: number; page_size: number };
export const pcCategories: Category[] = ["cpu", "motherboard", "ram", "gpu", "psu", "case"];

export function pcListQuery(search: URLSearchParams): string {
  for (const key of search.keys()) if (!["page", "page_size"].includes(key) || search.getAll(key).length !== 1) throw new Error("Invalid query");
  const query = new URLSearchParams();
  for (const [key, fallback, max] of [["page", 1, 10000], ["page_size", 20, 50]] as const) {
    const value = search.get(key) ?? String(fallback);
    if (!/^[0-9]+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new Error("Invalid query");
    query.set(key, String(Number(value)));
  }
  return query.toString();
}

export function pcFormInput(form: FormData): PCInput {
  const name = String(form.get("name") ?? "").trim();
  if (!name || name.length > 100 || name.includes("\0")) throw new Error("Revisá el nombre: 1 a 100 caracteres, sin NUL.");
  const components: PCGroup[] = [];
  for (const category of pcCategories) {
    const id = String(form.get(category) ?? "");
    if (!id) continue;
    const raw = String(form.get("ram-quantity") ?? "");
    if (category === "ram" && (!/^[1-8]$/.test(raw))) throw new Error("Indicá explícitamente de 1 a 8 módulos RAM idénticos.");
    components.push({ category, component_id: id, quantity: category === "ram" ? Number(raw) : 1 });
  }
  function text(key: string, max: number) {
    const value = String(form.get(key) ?? "").trim();
    if (value.includes("\0") || value.length > max) throw new Error("Revisá los límites del contexto declarado.");
    return value || null;
  }
  return { name, components, context: { bios_version: text("bios_version", 100), notes: text("notes", 1000) } };
}

export function pcError(status: number): string {
  switch (status) {
    case 401: return "Necesitás iniciar sesión para gestionar tus PCs.";
    case 403: return "Solicitud no autorizada. Volvé a intentarlo para renovar CSRF.";
    case 404: return "PC no encontrada o no disponible para esta sesión.";
    case 409: return "La PC cambió en otra operación. Tus cambios no se guardaron. Recargá el detalle antes de editar de nuevo.";
    case 422: return "Datos inválidos. Revisá nombre, referencias del catálogo, cantidades y contexto.";
    case 429: return "Demasiadas solicitudes. Esperá antes de volver a intentar.";
    default: return "El servicio de PCs no está disponible. Intentá más tarde.";
  }
}

export async function pcRequest(path = "", method = "GET", data?: PCInput & { revision?: number }): Promise<Response> {
  const headers = new Headers();
  if (method !== "GET") {
    const csrf = await fetch("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
    if (!csrf.ok) throw new Error(pcError(csrf.status));
    const token = await csrf.json();
    if (typeof token.csrf_token !== "string") throw new Error(pcError(503));
    headers.set("X-CSRF-Token", token.csrf_token);
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/pcs${path}`, { method, headers, credentials: "same-origin", cache: "no-store", body: data ? JSON.stringify(data) : undefined });
  if (!response.ok) throw new Error(pcError(response.status));
  return response;
}
