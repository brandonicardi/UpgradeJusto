import { safeSource } from "./catalog";
import { assistantContext, type AssistantContext } from "./assistant-context";

export type Conversation = { id: string; title: string; created_at: string; updated_at: string };
export type PageOf<T> = { items: T[]; total: number; page: number; page_size: number };
export type Citation = { source_id: string; url: string; title: string; locator: string; excerpt: string };
export type Message = { id: string; sequence: number; role: "user" | "assistant"; content: string; status: "pending" | "completed" | "failed" | "interrupted"; citations: Citation[]; created_at: string };
export type StreamEvent = { type: "start" | "delta" | "tool_status" | "citation" | "done" | "error"; data: Record<string, unknown> };
const events = new Set(["start", "delta", "tool_status", "citation", "done", "error"]);

// Incremental SSE framing; no eval, HTML/Markdown interpretation or event logging.
export class SSEParser {
  private buffer = "";
  private type = "";
  private data: string[] = [];
  private size = 0;
  push(text: string): StreamEvent[] {
    this.buffer += text;
    const result: StreamEvent[] = [];
    let index: number;
    while ((index = this.buffer.search(/[\r\n]/)) >= 0) {
      if (this.buffer[index] === "\r" && index === this.buffer.length - 1) break;
      const line = this.buffer.slice(0, index);
      const width = this.buffer[index] === "\r" && this.buffer[index + 1] === "\n" ? 2 : 1;
      this.buffer = this.buffer.slice(index + width);
      if (!line) {
        if (this.data.length) {
          if (!events.has(this.type)) throw new Error("Tipo de evento SSE no reconocido.");
          let data: unknown;
          try { data = JSON.parse(this.data.join("\n")); } catch { throw new Error("Evento SSE inválido."); }
          if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Evento SSE inválido.");
          result.push({ type: this.type as StreamEvent["type"], data: data as Record<string, unknown> });
        }
        this.type = ""; this.data = []; this.size = 0;
      } else if (!line.startsWith(":")) {
        const colon = line.indexOf(":"), field = colon < 0 ? line : line.slice(0, colon);
        const raw = colon < 0 ? "" : line.slice(colon + 1), value = raw.startsWith(" ") ? raw.slice(1) : raw;
        this.size += line.length;
        if (this.size > 131072) throw new Error("Evento SSE supera el límite de lectura segura.");
        if (field === "event") this.type = value;
        if (field === "data") this.data.push(value);
      }
    }
    if (this.buffer.length > 131072) throw new Error("Evento SSE supera el límite de lectura segura.");
    return result;
  }
  get incomplete() { return !!this.buffer || this.data.length > 0; }
}

export async function readAssistantStream(body: ReadableStream<Uint8Array>, onEvent: (event: StreamEvent) => void, signal: AbortSignal): Promise<"completed" | "failed" | "interrupted"> {
  const reader = body.getReader(), decoder = new TextDecoder(), parser = new SSEParser();
  let terminal: "completed" | "failed" | "interrupted" | null = null, hadError = false;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (!signal.aborted) {
      const chunk = await reader.read();
      const decoded = chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
      for (const event of parser.push(decoded)) {
        if (terminal) throw new Error("Evento recibido después del cierre SSE.");
        if (event.type === "error") { hadError = true; }
        if (event.type === "done") {
          const status = event.data.status;
          if (!["completed", "failed", "interrupted"].includes(String(status))) throw new Error("Cierre SSE sin estado válido.");
          terminal = hadError ? "failed" : status as "completed" | "failed" | "interrupted";
        }
        onEvent(event);
      }
      if (chunk.done) break;
    }
    if (signal.aborted) return "interrupted";
    if (parser.incomplete) return "interrupted";
    return terminal ?? (hadError ? "failed" : "interrupted");
  } finally { signal.removeEventListener("abort", cancel); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

export function citationText(value: unknown): Citation | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  for (const key of ["source_id", "url", "title", "locator", "excerpt"]) if (typeof item[key] !== "string" || (item[key] as string).length > 8000) return null;
  try {
    const url = new URL(item.url as string), host = url.hostname.toLowerCase();
    if (!safeSource(url.href) || url.username || url.password || !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(host) || /\/(?:api|shared)(?:\/|$)/i.test(url.pathname)) return null;
    // Display only as text. No href, fetch, image or arbitrary URL execution.
    return { source_id: item.source_id as string, url: url.href, title: item.title as string, locator: item.locator as string, excerpt: item.excerpt as string };
  } catch { return null; }
}

export function messageInput(content: string, clientRequestId: string, context?: AssistantContext) {
  const text = content.trim();
  if (!text || text.length > 8000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientRequestId)) throw new Error("Mensaje de 1 a 8000 caracteres y UUID de solicitud requerido.");
  return { content: text, client_request_id: clientRequestId, ...(context === undefined ? {} : { context: assistantContext(context) }) };
}
export class AssistantError extends Error {
  constructor(public status: number, retryAfter: string | null = null) {
    super(status === 409 ? "Conflicto o solicitud ya procesada. Recuperá historial; no se reenviará ni cobrará automáticamente." : status === 401 ? "Iniciá sesión para usar tus conversaciones." : status === 404 ? "Conversación no disponible para esta sesión." : status === 422 ? "Revisá título, mensaje o paginación." : status === 429 ? `Límite de solicitudes o cuota alcanzado. ${retryAfter && /^\d{1,8}$/.test(retryAfter) ? `Esperá ${Number(retryAfter)} segundos. ` : ""}No se reintentó el turno.` : status === 413 ? "El mensaje supera el tamaño permitido. Reducilo antes de enviarlo." : status === 408 ? "La solicitud se interrumpió o excedió el tiempo disponible. Recuperá historial sin reenviar." : status === 400 ? "No se pudo leer la solicitud. Revisá los datos antes de enviarlos." : "Asistente no disponible. Puede haber texto parcial; recuperá historial sin reenviar.");
  }
}
export async function assistantRequest(path = "", method = "GET", body?: unknown, signal?: AbortSignal): Promise<Response> {
  const headers = new Headers();
  if (method !== "GET") {
    const csrf = await fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store", signal: signal ?? AbortSignal.timeout(15000) });
    if (!csrf.ok) throw new AssistantError(csrf.status, csrf.headers.get("Retry-After"));
    const token = await csrf.json();
    if (typeof token.csrf_token !== "string") throw new AssistantError(503);
    headers.set("Content-Type", "application/json"); headers.set("X-CSRF-Token", token.csrf_token);
  }
  const response = await fetch(`/api/conversations${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin", cache: "no-store", signal: signal ?? AbortSignal.timeout(15000) });
  if (!response.ok) throw new AssistantError(response.status, response.headers.get("Retry-After"));
  return response;
}
