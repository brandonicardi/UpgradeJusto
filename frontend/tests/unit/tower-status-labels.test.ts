import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { towerStatusId } from "../../components/tower-inventory";

describe("etiqueta exacta del estado de categoría38", () => {
  it("asocia un label separado al select, sin opciones dentro del texto de etiqueta", () => {
    const source = readFileSync(new URL("../../app/pcs/mi-pc-editor.tsx", import.meta.url), "utf8");
    expect(towerStatusId("ram")).toBe("tower-status-ram");
    expect(source).toContain("<label htmlFor={towerStatusId(category)}>¿Qué tenés de esto?</label>");
    expect(source).toContain("<select id={towerStatusId(category)}");
    expect(source).not.toContain("<label>¿Qué tenés de esto?<select");
  });
});
