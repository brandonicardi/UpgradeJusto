import { describe, expect, it } from "vitest";
import { cleanAssistantText, conversationDay } from "../../lib/assistant-presentation";

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

describe("cleanAssistantText", () => {
  it("quita las almohadillas de los títulos y deja el texto en negrita", () => {
    expect(cleanAssistantText("# Tu PC\n\nTexto")).toBe("**Tu PC**\n\nTexto");
  });
  it("cambia las viñetas con asterisco por guiones", () => {
    expect(cleanAssistantText("* Socket\n+ BIOS")).toBe("- Socket\n- BIOS");
  });
  it("conserva la negrita bien cerrada y ajusta los espacios dentro", () => {
    expect(cleanAssistantText("Esta pieza **Encaja**.")).toBe("Esta pieza **Encaja**.");
    expect(cleanAssistantText("Dato ** importante **.")).toBe("Dato **importante**.");
  });
  it("quita una negrita sin cerrar para que no queden asteriscos", () => {
    expect(cleanAssistantText("Falta **revisar la placa")).toBe("Falta revisar la placa");
  });
  it("reduce los saltos de línea de más", () => {
    expect(cleanAssistantText("A\r\n\r\n\r\n\r\nB")).toBe("A\n\nB");
  });
});
