// «Lo que guardaste» en Tu cuenta: solo cuenta lo que devuelven los listados de la API.
// Si un listado falla, ese dato queda como desconocido (nunca como cero).
export type Stash = { pcs: { total: number; names: string[] } | null; plans: number | null; chats: number | null };
export type StashTile = { href: string; count: string; text: string };

type PageLike = { total?: unknown; items?: unknown };

async function page(path: string, signal: AbortSignal | undefined, request: typeof fetch): Promise<PageLike | null> {
  try {
    const response = await request(path, { credentials: "same-origin", cache: "no-store", signal });
    if (!response.ok) return null;
    const data = await response.json() as PageLike;
    return Number.isSafeInteger(data.total) && (data.total as number) >= 0 ? data : null;
  } catch { return null; }
}

export async function loadStash(signal?: AbortSignal, request: typeof fetch = fetch): Promise<Stash> {
  const [pcs, plans, chats] = await Promise.all([
    page("/api/towers?page=1&page_size=20", signal, request),
    page("/api/tower-plans?page=1&page_size=1", signal, request),
    page("/api/conversations?page=1&page_size=1", signal, request),
  ]);
  const names = pcs && Array.isArray(pcs.items) ? pcs.items.map(item => (item as { name?: unknown })?.name).filter((name): name is string => typeof name === "string" && name.trim() !== "") : [];
  return { pcs: pcs ? { total: pcs.total as number, names } : null, plans: plans ? plans.total as number : null, chats: chats ? chats.total as number : null };
}

const NO_DATA = "No pudimos consultarlo ahora.";
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export function stashTiles(stash: Stash): StashTile[] {
  const pcs = stash.pcs;
  const shown = pcs ? pcs.names.slice(0, 2).join(", ") : "";
  return [
    { href: "/pcs", count: pcs ? String(pcs.total) : "–", text: pcs ? `${plural(pcs.total, "PC", "PCs")}${shown ? ` · ${shown}` : ""}` : `PCs · ${NO_DATA}` },
    { href: "/tower-plans", count: stash.plans === null ? "–" : String(stash.plans), text: stash.plans === null ? `Planes · ${NO_DATA}` : plural(stash.plans, "Plan guardado", "Planes guardados") },
    { href: "/chat", count: stash.chats === null ? "–" : String(stash.chats), text: stash.chats === null ? `Charlas · ${NO_DATA}` : plural(stash.chats, "Charla con el asistente", "Charlas con el asistente") },
  ];
}
