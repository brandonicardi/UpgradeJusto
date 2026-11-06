import { describe, expect, it } from "vitest";
import { buildHref, convieneHref, goalByKey, homeBudget, homeGoals, parseConvieneQuery, validBudget } from "../../lib/home-goals";

const query = (text: string) => new URLSearchParams(text);

describe("objetivo y presupuesto del inicio", () => {
  it("traduce cada frase de la gente a un objetivo que entiende la API", () => {
    expect(homeGoals.map(goal => [goal.text, goal.objective])).toEqual([
      ["Jugar mejor", "gaming"], ["Trabajar más rápido", "productivity"], ["Editar fotos y video", "productivity"], ["Que abra todo más rápido", "general"],
    ]);
    expect(goalByKey("gaming")?.text).toBe("Jugar mejor");
    expect(goalByKey("otra")).toBeNull();
    expect(goalByKey(null)).toBeNull();
  });
  it("el presupuesto es un entero en texto dentro del rango; lo demás se descarta", () => {
    expect(validBudget("400000")).toBe("400000");
    expect(validBudget(homeBudget.min)).toBe("100000");
    expect(validBudget(homeBudget.max)).toBe("5000000");
    // Cualquier importe positivo razonable (hasta 12 dígitos) se acepta, también fuera del rango visual.
    for (const raw of ["99999", "5000001", "999999999999"]) expect(validBudget(raw)).toBe(raw);
    for (const raw of ["0", "-1", "400000.50", "abc", "", "4e5", "0400000", "1234567890123", null, undefined]) expect(validBudget(raw as string)).toBeNull();
  });
  it("arma y vuelve a leer el enlace a «Lo que te conviene» sin mandar identidad", () => {
    const href = convieneHref("gaming", "400000");
    expect(href).toBe("/conviene?objetivo=gaming&presupuesto=400000");
    expect(href).not.toContain("user");
    const parsed = parseConvieneQuery(query(href.split("?")[1]));
    expect(parsed?.goal.objective).toBe("gaming"); expect(parsed?.budget).toBe("400000");
  });
  it("armar una primera PC usa el mismo objetivo y presupuesto, con la ruta de armado", () => {
    expect(buildHref("work", "600000")).toBe("/build?objetivo=work&presupuesto=600000");
  });
  it("si falta o sobra algo no hay propuesta: se pide de nuevo", () => {
    expect(parseConvieneQuery(query(""))).toBeNull();
    expect(parseConvieneQuery(query("objetivo=gaming"))).toBeNull();
    expect(parseConvieneQuery(query("presupuesto=400000"))).toBeNull();
    expect(parseConvieneQuery(query("objetivo=gaming&presupuesto=0"))).toBeNull();
    expect(parseConvieneQuery(query("objetivo=cualquiera&presupuesto=400000"))).toBeNull();
  });
});
