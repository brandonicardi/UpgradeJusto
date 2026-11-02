import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TowerPlanDeactivation from "../../components/tower-plan-deactivation";

describe("baja lógica de plan: renderer real, sin promesa de borrado físico", () => {
  it("explica historial conservado y requiere confirmación explícita", () => {
    const html = renderToStaticMarkup(<TowerPlanDeactivation busy={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(html).toContain("Dar de baja el plan"); expect(html).toContain("El historial se conserva; no es borrado físico");
    expect(html).toContain("Esto no publica el historial ni ofrece restauración");
    expect(html).toMatch(/type="checkbox"[^>]*required=""/);
    expect(html).not.toContain('checked=""');
    expect(html).toContain("Confirmo dar de baja este plan"); expect(html).toContain("Cancelar baja del plan");
    expect(html).not.toContain("definitivamente"); expect(html).not.toContain("eliminar este plan y sus revisiones"); expect(html).not.toContain("href=");
  });
  it("deshabilita checkbox y botones durante la operación", () => {
    const html = renderToStaticMarkup(<TowerPlanDeactivation busy onConfirm={() => {}} onCancel={() => {}} />);
    expect(html).toMatch(/type="checkbox"[^>]*required=""[^>]*disabled=""/);
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});
