import { describe, expect, it } from "vitest";
import { pcFormInput, pcListQuery } from "../../lib/pcs";
import { signedProxyHeaders } from "../../lib/gateway";
import { pcsProxy } from "../../lib/pcs-proxy";

describe("CU03 lógica local aislada, no persistencia", () => {
  it("lista solo permite query paginada validada", () => {
    expect(pcListQuery(new URLSearchParams())).toBe("page=1&page_size=20");
    for (const query of ["owner_id=x", "page=0", "page_size=51", "page=1&page=2", "page=1.5"]) expect(() => pcListQuery(new URLSearchParams(query))).toThrow();
  });
  it("proxy rechaza 18 queries, incluidas claves desconocidas vacías, sin consultar backend", async () => {
    for (const query of ["owner_id", "owner_id=", "role=", "page=1&owner_id=", "page=", "page_size="]) {
      expect((await pcsProxy(new Request(`http://127.0.0.1:3000/api/pcs?${query}`))).status).toBe(422);
    }
    const id = "11111111-1111-1111-1111-111111111111";
    for (const [method, detail] of [["POST", false], ["GET", true], ["PUT", true], ["DELETE", true]] as const) {
      for (const query of ["owner_id", "owner_id=", "page=1"]) {
        const path = `/api/pcs${detail ? `/${id}` : ""}`;
        const response = await pcsProxy(new Request(`http://127.0.0.1:3000${path}?${query}`, { method }), detail ? id : undefined);
        expect(response.status).toBe(422);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
      }
    }
  });
  it("PC vacía y contexto null explícito; no owner cliente", () => {
    const form = new FormData(); form.set("name", " Mi PC "); form.set("owner_id", "untrusted");
    expect(pcFormInput(form)).toEqual({ name: "Mi PC", components: [], context: { bios_version: null, notes: null } });
  });
  it("RAM requiere cantidad explícita, cada PUT reemplaza el conjunto", () => {
    const form = new FormData(); form.set("name", "PC"); form.set("ram", "catalog-real-reference-provided-at-runtime");
    expect(() => pcFormInput(form)).toThrow();
    form.set("ram-quantity", "2");
    expect(pcFormInput(form).components[0].quantity).toBe(2);
    form.set("ram", ""); expect(pcFormInput(form).components).toEqual([]);
  });
  it("firma solo PCS raíz/UUID, sin query o rutas arbitrarias", () => {
    const fixture = "synthetic-unit-fixture-not-runtime-secret";
    expect(signedProxyHeaders("127.0.0.1", "GET", "/api/pcs", fixture)).not.toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "DELETE", "/api/pcs/11111111-1111-1111-1111-111111111111", fixture)).not.toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "GET", "/api/plans", fixture)).not.toBeNull();
    for (const path of ["/api/pcs/admin", "/api/pcs?owner=x", "/api/pcs/../auth", "/api/plans/admin", "/api/plans?owner=x", "/api/plans/../auth", "/api/plans/"]) expect(signedProxyHeaders("127.0.0.1", "GET", path, fixture)).toBeNull();
  });
});
