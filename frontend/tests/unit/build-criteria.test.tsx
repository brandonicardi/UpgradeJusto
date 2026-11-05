import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PurchaseBuilder from "../../components/purchase-builder";
import PurchaseCostSummary from "../../components/purchase-cost-summary";
import { BUILD_OBJECTIVES, emptyBuildCriteria, isBuildObjective, withBudget, withObjective, withWorkload } from "../../lib/build-criteria";
import { towerCategories, towerKeys } from "../../lib/towers";
import { purchaseBudget, purchaseSubtotal } from "../../lib/purchase-draft";

describe("criterios del armado: objetivo y presupuesto", () => {
  it("ofrece exactamente tres objetivos y ninguno de edición audiovisual", () => {
    expect(BUILD_OBJECTIVES.map(option => option.valor)).toEqual(["general", "gaming", "productivity"]);
    expect(isBuildObjective("video-editing")).toBe(false);
    expect(isBuildObjective("")).toBe(false);
    const html = renderToStaticMarkup(<PurchaseBuilder />);
    // Cada opción del selector de objetivo es un botón con aria-pressed; el armado vacío no tiene otros.
    expect(html.match(/aria-pressed=/g)).toHaveLength(3);
    expect(html).not.toMatch(/editar fotos|edición|video/i);
  });

  it("arranca con uso general marcado y sin trabajo elegido", () => {
    const html = renderToStaticMarkup(<PurchaseBuilder />);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Uso general/);
    expect(html).not.toContain("Trabajo del armado");
  });

  it("el trabajo solo existe para productividad y se descarta al cambiar de objetivo", () => {
    const productivity = withObjective(emptyBuildCriteria(), "productivity");
    expect(withWorkload(productivity, "blender-cpu").workload).toBe("blender-cpu");
    expect(withWorkload(productivity, "otro").workload).toBeNull();
    expect(withWorkload(emptyBuildCriteria(), "blender-cpu").workload).toBeNull();
    expect(withObjective(withWorkload(productivity, "blender-cpu"), "gaming")).toMatchObject({ objective: "gaming", workload: null });
  });

  it("conserva el monto decimal tal cual, sin redondear ni convertir a número", () => {
    for (const text of ["1234.56", "0.01", "999999999999.99", "900719925474099300.19"]) expect(withBudget(emptyBuildCriteria(), text).budget_ars).toBe(text);
    expect(withBudget(emptyBuildCriteria(), "1234.5").budget_ars).toBe("1234.5");
  });

  it("un presupuesto vacío sigue vacío y nunca se vuelve cero", () => {
    expect(emptyBuildCriteria().budget_ars).toBe("");
    expect(withBudget(withBudget(emptyBuildCriteria(), "500"), "").budget_ars).toBe("");
    expect(purchaseBudget(purchaseSubtotal([], "cash"), "").budget_ars).toBeNull();
  });

  it("el resumen muestra el decimal con sus centavos y lo vacío como desconocido", () => {
    const withBudgetHtml = renderToStaticMarkup(<PurchaseCostSummary lines={[]} condition="cash" budget="1234.56" />);
    expect(withBudgetHtml).toContain("Presupuesto: ARS 1.234,56");
    expect(withBudgetHtml).not.toContain("Ingresá tu presupuesto");
    const roundedHtml = renderToStaticMarkup(<PurchaseCostSummary lines={[]} condition="cash" budget="1234.5" />);
    expect(roundedHtml).toContain("Presupuesto: ARS 1.234,50");
    const emptyHtml = renderToStaticMarkup(<PurchaseCostSummary lines={[]} condition="cash" budget="" />);
    expect(emptyHtml).toContain("Ingresá tu presupuesto en pesos para comparar.");
    expect(emptyHtml).not.toMatch(/Presupuesto: ARS/);
    expect(emptyHtml).not.toContain("ARS 0,00");
  });
});

describe("armado vacío: manual, por comprar y sin veredictos", () => {
  const html = renderToStaticMarkup(<PurchaseBuilder />);

  it("muestra las nueve categorías, todas sin elegir", () => {
    expect(towerKeys).toHaveLength(9);
    for (const category of towerKeys) expect(html).toContain(`<h3>${towerCategories[category]}</h3>`);
    expect(html.match(/Todavía sin elegir/g)).toHaveLength(9);
    expect(html).not.toContain("Compra seleccionada");
  });

  it("rotula la lista y el resumen como armado manual, por comprar", () => {
    expect(html).toContain("Tu armado manual, por comprar");
    expect(html).toContain("Armado manual · por comprar");
    expect(html).toMatch(/aria-label="Resumen de compras"[^>]*><p[^>]*>Armado manual · por comprar/);
  });

  it("no inventa una PC automática, un total confirmado ni compatibilidad evaluada", () => {
    expect(html).toContain("Todavía no hay compras");
    expect(html).toContain("No es el total del armado");
    expect(html).toContain("9 categorías no elegidas");
    expect(html).not.toMatch(/Total de la propuesta|Total confirmado|Todo encaja|Encaja|No encaja|Falta un dato/);
    expect(html).not.toContain("Comprobar la configuración propuesta guardada");
    expect(html).not.toMatch(/ARS \d/);
    expect(html).not.toMatch(/Subtotal parcial|Saldo|Excedente/);
    expect(html).not.toContain('checked=""');
  });
});
