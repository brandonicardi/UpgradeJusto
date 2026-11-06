import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));
import { purchaseAdd, purchaseBudget, purchaseInput, purchasePlan, purchaseSubtotal, purchaseUnselected, type PurchaseLine } from "../../lib/purchase-draft";
import type { TowerComponent } from "../../lib/tower-catalog";
import type { Tower } from "../../lib/towers";
import PurchaseBuilder from "../../components/purchase-builder";
import BeginnerEntry from "../../components/beginner-entry";
import PurchaseCostSummary, { PurchaseLineQuote } from "../../components/purchase-cost-summary";
import { TowerProductPhoto } from "../../components/tower-product-summary";
import { displayRetailDate } from "../../lib/retail-presentation";

// Synthetic parser/markup fixtures, not quote or compatibility evidence.
const part = (category: TowerComponent["category"], id = "synthetic") : TowerComponent => ({ id, category, name: "Pieza sintética sin atributos", attributes: {}, image: null, sources: [], prices: [], offers: [] });
const line = (category: TowerComponent["category"], amount: string | null = "10.00"): PurchaseLine => ({ part: part(category), quantity: 1, offer: { offer_id: "synthetic", store: "venex", product_id: "synthetic", component_id: "synthetic", variant_key: "synthetic", amount, currency: "ARS", condition: "cash", availability: "unknown", stock_quantity: null, source_url: "https://venex.com.ar/synthetic", observed_at: "2020-01-01T00:00:00Z", expires_at: "2020-01-02T00:00:00Z", status: "stale" } });
describe("purchase draft: explicit new configuration, not a fictitious existing PC", () => {
  it("starts truly empty with nine absent categories, no RAM/PSU/storage defaults", () => {
    const input = purchaseInput([]); expect(input.lines).toEqual([]); expect(Object.values(input.category_status)).toHaveLength(9); expect(Object.values(input.category_status).every(state => state === "absent")).toBe(true); expect(input.name).toContain("por comprar"); expect(purchaseSubtotal([], "cash").selected_subtotal_ars).toBeNull();
  });
  it("replaces RAM as whole set, adds only storage/fan, validates explicit quantities", () => {
    const first = line("ram"), second = { ...line("ram"), part: part("ram", "other"), quantity: 2 };
    const lines = purchaseAdd([first], second, "replace_category"); expect(lines).toHaveLength(1); expect(lines[0].quantity).toBe(2); expect(first.quantity).toBe(1);
    expect(() => purchaseAdd([first], second, "add_line")).toThrow(); expect(purchaseAdd([line("storage")], line("storage"), "add_line")).toHaveLength(2);
    expect(() => purchaseAdd([], { ...first, quantity: NaN }, "replace_category")).toThrow(); expect(() => purchaseAdd([], { ...first, quantity: 0 }, "replace_category")).toThrow();
  });
  it("counts only chosen purchases with exact decimals and partial/unknown not zero total", () => {
    const rich = { ...line("ram", "900719925474099300.19"), quantity: 2 };
    expect(purchaseSubtotal([rich], "cash").selected_subtotal_ars).toBe("1801439850948198600.38");
    const partial = purchaseSubtotal([line("cpu"), line("psu", null)], "cash"); expect(partial.known_subtotal_ars).toBe("10.00"); expect(partial.selected_subtotal_ars).toBeNull(); expect(partial.missing_lines).toBe(1);
    expect(purchaseSubtotal([line("cpu")], "list").selected_subtotal_ars).toBeNull();
    expect(purchaseSubtotal([{ ...line("cpu"), offer: { ...line("cpu").offer!, component_id: "another" } }], "cash").selected_subtotal_ars).toBeNull();
  });
  it("builds plan purchases from actual saved lines, without material or conserved-part inference", () => {
    const pc: Tower = { ...purchaseInput([line("cpu"), line("ram")]), id: "12345678-1234-1234-1234-123456789abc", revision: 1, origin_schema: 2 };
    const before = JSON.stringify(pc), plan = purchasePlan(pc, { objective: "gaming", workload: null, budget_ars: "1.00", price_condition: "cash", thermal_available: true }, "synthetic-catalog");
    expect(plan.stages[0].actions.map(action => action.category)).toEqual(["cpu", "ram"]); expect(plan.stages[0].materials).toEqual([]); expect(plan.expected_pc_revision).toBe(1); expect(plan.stages[0].actions.every(action => action.action === "replace_category" && action.line_id === null)).toBe(true); expect(JSON.stringify(pc)).toBe(before);
  });
  it("renders explicit consent/partial empty state and both real entry routes without autosave", () => {
    const html = renderToStaticMarkup(<PurchaseBuilder />); expect(html).toContain("Todavía no hay compras"); expect(html).toContain("Elegí tu primera pieza"); expect(html).not.toContain("0 líneas sin cotización"); expect(html).toContain("Guardar configuración propuesta"); expect(html).toContain("no una PC que ya poseo"); expect(html).not.toContain('checked=""'); expect(html).not.toContain("500W"); expect(html).not.toContain("500GB");
    const home = renderToStaticMarkup(<BeginnerEntry />); expect(home).toContain('href="/build"'); expect(home).toContain('href="/pcs"'); expect(home).toContain("Armá una desde cero"); expect(home).not.toContain("Precio guardado");
  });
  it("never presents one priced CPU as the whole build total and discloses unselected categories", () => {
    const lines = [line("cpu")], subtotal = purchaseSubtotal(lines, "cash"); expect(subtotal).not.toHaveProperty("total_ars"); expect(purchaseUnselected(lines)).toHaveLength(8);
    const html = renderToStaticMarkup(<PurchaseCostSummary lines={lines} condition="cash" budget="0.01" />);
    expect(html).toContain("Subtotal de compras seleccionadas"); expect(html).toContain("No es el total del armado"); expect(html).toContain("8 categorías no elegidas"); expect(html).toContain("algunas pueden no ser necesarias"); expect(html).toContain("Excedente conocido sobre presupuesto: ARS 9,99");
  });
  it("compares budget using exact cents; absent/zero/invalid budget is unknown and pending prices keep final balance unknown", () => {
    const subtotal = purchaseSubtotal([line("cpu"), line("psu", null)], "cash");
    expect(purchaseBudget(subtotal, "20")).toMatchObject({ budget_ars: "20.00", provisional_remaining_ars: "10.00", pending_prices: true });
    for (const budget of ["", "0", "0.00", "1e3", "1,00", "1.001"]) expect(purchaseBudget(subtotal, budget).budget_ars).toBeNull();
    const huge = purchaseSubtotal([line("cpu", "900719925474099300.19")], "cash"); expect(purchaseBudget(huge, "0.01").known_excess_ars).toBe("900719925474099300.18");
    const html = renderToStaticMarkup(<PurchaseCostSummary lines={[line("cpu"), line("psu", null)]} condition="cash" budget="20" />); expect(html).toContain("Saldo PROVISIONAL"); expect(html).toContain("Saldo definitivo desconocido");
  });
  it("retains source/store/condition/date and unknown amount outside the collapsed selector", () => {
    const html = renderToStaticMarkup(<PurchaseLineQuote line={line("cpu", null)} condition="cash" now={Date.parse("2026-10-27T00:00:00Z")} />);
    expect(html).toContain("Importe desconocido"); expect(html).toContain("Venex"); expect(html).toContain("Contado"); expect(html).toContain(displayRetailDate("2020-01-01T00:00:00Z")); expect(html).not.toContain("2020-01-01T00:00:00Z"); expect(html).toContain("Referencia histórica/no vigente"); expect(html).toContain('href="https://venex.com.ar/synthetic"'); expect(html).toContain('rel="noopener noreferrer"'); expect(html).not.toContain("ARS 0,00");
  });
  it("renders a real pending-photo label or explicit fallback, never an empty border", () => {
    const url = "https://imagenes.compragamer.com/productos/synthetic.jpg";
    const photo: TowerComponent = { ...part("cpu"), image: url, image_evidence: { url, alt: null, source_url: null, retrieved_at: null, rights_note: null, exact_variant: true, status: "verified" } };
    const pending = renderToStaticMarkup(<TowerProductPhoto part={photo} />); expect(pending).toContain('data-photo-state="loading"'); expect(pending).toContain("Cargando foto…"); expect(pending).toContain('class="photo-status"');
    const fallback = renderToStaticMarkup(<TowerProductPhoto part={part("cpu")} />); expect(fallback).toContain('data-photo-state="unavailable"'); expect(fallback).toContain("Sin foto");
  });
});
