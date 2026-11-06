import { describe, expect, it } from "vitest";
import { conversationDay } from "../../lib/assistant-presentation";

const ahora = new Date(2026, 10, 6, 15, 0);
const iso = (mes: number, dia: number, hora = 9) => new Date(2026, mes, dia, hora).toISOString();

describe("conversationDay", () => {
  it("dice Hoy y Ayer para los dos últimos días", () => {
    expect(conversationDay(iso(10, 6, 1), ahora)).toBe("Hoy");
    expect(conversationDay(iso(10, 5, 23), ahora)).toBe("Ayer");
  });
  it("usa día/mes para fechas más viejas, con ceros", () => {
    expect(conversationDay(iso(9, 24), ahora)).toBe("24/10");
    expect(conversationDay(iso(0, 3), ahora)).toBe("03/01");
  });
  it("no inventa un día si la fecha no es válida", () => {
    expect(conversationDay("no es una fecha", ahora)).toBe("");
  });
});
