import type { Tower } from "./towers";

/** Solo se pueden usar en el chat las PCs en el formato vigente. */
export const chatEligible = (items: Tower[] | undefined) => (items ?? []).filter(pc => pc.origin_schema === 2 && pc.schema_version === 2);

export type PcChoice = "loading" | "none" | "auto" | "ask" | "settled";

/** Regla del chat: una PC se usa sola; con varias el asistente pregunta; sin PC se chatea igual. */
export function pcChoice(items: Tower[] | undefined, loaded: boolean, requestedId: string, declined: boolean): PcChoice {
  if (!loaded) return "loading";
  if (requestedId || declined) return "settled";
  const count = chatEligible(items).length;
  return count === 0 ? "none" : count === 1 ? "auto" : "ask";
}
