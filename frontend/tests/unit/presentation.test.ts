import { describe, expect, it } from "vitest";
import { productName, money, historicalPrice } from "../../lib/presentation";
import { productVisualManifest } from "../../lib/product-visuals";
import type { Component } from "../../lib/catalog";
describe("presentación sin inventar datos", () => {
  it("conserva variante e identificación completa sin deducir hardware", () => {
    expect(productName("AMD Ryzen 7 5700X 100-100000926WOF")).toEqual({ title: "AMD Ryzen 7 5700X", sku: "100-100000926WOF" });
    expect(productName("Kingston referencia publicada")).toEqual({ title: "Kingston referencia publicada", sku: null });
    expect(Object.keys(productVisualManifest)).toHaveLength(14);
    expect(productVisualManifest.P17.kind).toBe("category-illustration");
    expect(productVisualManifest.P18.kind).toBe("category-illustration");
  });
  it("selecciona precio documentado sin convertir divisas ni actualidad", () => {
    const part = { prices: [{ amount: "1", currency: "USD", date: "2026-10-26", source: "test" }, { amount: "766417.98", currency: "ARS", date: "2026-10-20", source: "test" }] } as Component;
    expect(historicalPrice(part)?.currency).toBe("ARS");
    expect(money("766417.98", "ARS")).toContain("766.417,98");
    expect(historicalPrice({ ...part, prices: [] })).toBeNull();
  });
});
