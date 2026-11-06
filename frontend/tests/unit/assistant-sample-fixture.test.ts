import { describe, expect, it } from "vitest";
import sample from "../fixtures/assistant-sample-messages.json";
import type { Message, PageOf } from "../../lib/assistant";

describe("fixture de mensajes de muestra del asistente", () => {
  const page = sample as unknown as PageOf<Message>;
  it("tiene el formato de la API de mensajes", () => {
    expect(Object.keys(page).sort()).toEqual(["items", "page", "page_size", "total"]);
    expect(page.total).toBe(page.items.length);
    for (const message of page.items) {
      expect(Object.keys(message).sort()).toEqual(["citations", "content", "created_at", "id", "role", "sequence", "status"]);
      expect(["user", "assistant"]).toContain(message.role);
      expect(["pending", "completed", "failed", "interrupted"]).toContain(message.status);
      expect(Array.isArray(message.citations)).toBe(true);
      expect(Number.isNaN(Date.parse(message.created_at))).toBe(false);
    }
  });
  it("incluye Markdown del asistente para comprobar que no se ven asteriscos crudos", () => {
    const reply = page.items.find(message => message.role === "assistant")!;
    expect(reply.content).toMatch(/\*\*.+\*\*/);
    expect(reply.content).toMatch(/^## /m);
  });
});
