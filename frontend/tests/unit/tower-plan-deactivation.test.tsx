import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TowerPlanDeactivation from "../../components/tower-plan-deactivation";

describe("borrar un plan: pide confirmación y no promete nada de más", () => {
  it("explica qué pasa y requiere confirmación explícita", () => {
    const html = renderToStaticMarkup(<TowerPlanDeactivation busy={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(html).toContain("Borrar este plan lo saca de tu lista"); expect(html).toContain("Tu PC guardada no cambia");
    expect(html).toMatch(/type="checkbox"[^>]*required=""/);
    expect(html).not.toContain('checked=""');
    expect(html).toContain("Quiero borrar este plan"); expect(html).toContain("Borrar el plan"); expect(html).toContain("Mejor no");
    expect(html).not.toMatch(/baja|historial|físico|revisiones/i); expect(html).not.toContain("href=");
  });
  it("deshabilita checkbox y botones durante la operación", () => {
    const html = renderToStaticMarkup(<TowerPlanDeactivation busy onConfirm={() => {}} onCancel={() => {}} />);
    expect(html).toMatch(/type="checkbox"[^>]*required=""[^>]*disabled=""/);
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});
