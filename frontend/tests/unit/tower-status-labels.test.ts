import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { towerStatusId } from "../../components/tower-inventory";

describe("etiqueta exacta del estado de categoría38", () => {
  it("asocia un label separado al select, sin opciones dentro del texto de etiqueta", () => {
    const source = readFileSync(new URL("../../app/pcs/pcs.tsx", import.meta.url), "utf8");
    expect(towerStatusId("ram")).toBe("tower-status-ram");
    expect(source).toContain('<label htmlFor={towerStatusId(category)}>Estado de {towerCategories[category]}</label>');
    expect(source).toContain('<select id={towerStatusId(category)}');
    expect(source).not.toContain('<label>Estado de {towerCategories[category]}<select');
  });
});
