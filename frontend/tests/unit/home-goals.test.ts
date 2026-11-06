import { describe, expect, it } from "vitest";
import { convieneHref, goalByKey, homeBudget, homeGoals, parseConvieneQuery, validBudget } from "../../lib/home-goals";

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
    expect(validBudget(homeBudget.max)).toBe("1500000");
    for (const raw of ["99999", "1500001", "400000.50", "-1", "0", "abc", "", "4e5", "0400000", "99999999999", null, undefined]) expect(validBudget(raw as string)).toBeNull();
  });
  it("arma y vuelve a leer el enlace a «Lo que te conviene» sin mandar identidad", () => {
    const href = convieneHref("gaming", "400000");
    expect(href).toBe("/conviene?objetivo=gaming&presupuesto=400000");
    expect(href).not.toContain("user");
    const parsed = parseConvieneQuery(query(href.split("?")[1]));
    expect(parsed?.goal.objective).toBe("gaming"); expect(parsed?.budget).toBe("400000");
  });
  it("si falta o sobra algo no hay propuesta: se pide de nuevo", () => {
    expect(parseConvieneQuery(query(""))).toBeNull();
    expect(parseConvieneQuery(query("objetivo=gaming"))).toBeNull();
    expect(parseConvieneQuery(query("presupuesto=400000"))).toBeNull();
    expect(parseConvieneQuery(query("objetivo=gaming&presupuesto=12"))).toBeNull();
    expect(parseConvieneQuery(query("objetivo=cualquiera&presupuesto=400000"))).toBeNull();
  });
});
