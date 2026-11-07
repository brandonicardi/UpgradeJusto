import { isSharedPath } from "./shell-nav";

export function assistantAvailable(path: string) {
  return !["/chat", "/admin", "/account"].some(route => path === route || path.startsWith(`${route}/`)) && !isSharedPath(path) && path !== "/shared-tower-plans";
}
/** Only presentation: this value must never become message context. */
export function assistantScreen(path: string): { label: string; questions: string[] } {
  if (path.startsWith("/catalog/")) return { label: "Componente", questions: ["¿Qué datos necesito para saber si un componente encaja?", "¿Cómo comparo dos componentes?", "¿Qué tengo que revisar antes de comprar?"] };
  if (path === "/catalog") return { label: "Catálogo", questions: ["¿Cómo elijo una placa de video?", "¿Qué significa «Falta un dato»?", "¿Cómo comparo los precios?"] };
  if (path === "/build") return { label: "Armar una PC", questions: ["¿Por dónde empiezo a armar una PC?", "¿Cómo reparto mi presupuesto?", "¿Qué datos necesito para elegir la fuente?"] };
  if (/^\/(tower-plans|plans)(\/|$)/.test(path)) return { label: "Mi plan", questions: ["¿Cómo ordeno las mejoras de mi PC?", "¿Qué reviso antes de cada etapa?", "¿Cómo comparo el costo de dos alternativas?"] };
  if (/^\/pcs(\/|$)/.test(path)) return { label: "Mi PC", questions: ["¿Qué datos de mi PC tengo que completar?", "¿Por qué dice «Falta un dato»?", "¿Qué me conviene mejorar primero?"] };
  if (path === "/chat") return { label: "Asistente", questions: ["¿Qué me conviene mejorar primero?", "¿Cómo sé si un componente encaja?", "¿Qué datos necesitás de mi PC?"] };
  return { label: "Lo que te conviene", questions: ["¿Qué puedo mejorar con mi presupuesto?", "¿Qué datos necesito para comparar mejoras?", "¿Cómo sé qué conviene cambiar primero?"] };
}
