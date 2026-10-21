import { describe, expect, it } from "vitest";
import { parseQuery, queryString, safeSource } from "../../lib/catalog";

describe("contrato de filtros CU04", () => {
  it("conserva AND, normaliza búsqueda y codifica la paginación", () => {
    const query = parseQuery({ category: "gpu", q: "  ASUS & OC  ", page: "2", page_size: "6" });
    const params = new URLSearchParams(queryString(query, 3));
    expect(Object.fromEntries(params)).toEqual({ category: "gpu", q: "ASUS & OC", page: "3", page_size: "6" });
  });
  it("aplica defaults sin convertir desconocido en filtros", () => {
    expect(parseQuery({})).toEqual({ category: "", q: "", page: 1, page_size: 12 });
    expect(parseQuery({ q: "   " }).q).toBe("");
  });
  it.each([{ page: "0" }, { page: "10001" }, { page: "1.5" }, { page_size: "51" }, { page_size: "-1" }, { category: "toString" }, { category: "cooler" }, { q: "x".repeat(101) }])("rechaza parámetros fuera de contrato: %j", (input) => {
    expect(() => parseQuery(input)).toThrow();
  });
  it("acepta límites documentados", () => {
    expect(parseQuery({ page: "10000", page_size: "50", q: "x".repeat(100) }).page).toBe(10000);
  });
});

describe("fuentes externas", () => {
  it("permite HTTP(S), no ejecuta esquemas activos", () => {
    expect(safeSource("https://example.org/evidence")).toBe("https://example.org/evidence");
    expect(safeSource("javascript:alert(1)")).toBeNull();
    expect(safeSource("/relative")).toBeNull();
  });
});
