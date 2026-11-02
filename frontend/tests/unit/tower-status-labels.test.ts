import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("etiqueta exacta del estado de categoría38", () => {
  it("asocia un label separado al select, sin opciones dentro del texto de etiqueta", () => {
    const source = readFileSync(new URL("../../app/pcs/pcs.tsx", import.meta.url), "utf8");
    expect(source).toContain('<label htmlFor={`tower-status-${category}`}>Estado de {towerCategories[category]}</label>');
    expect(source).toContain('<select id={`tower-status-${category}`}');
    expect(source).not.toContain('<label>Estado de {towerCategories[category]}<select');
  });
});
