import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shareInput, validPublicPath } from "../../lib/shares";
import { sharesProxy, publicShareProxy, publicHeaders, publicMethodNotAllowed } from "../../lib/shares-proxy";
import { sharedHtml } from "../../lib/shared-html";
import { signedProxyHeaders } from "../../lib/gateway";

describe("CU09 H frontera y presentación local, sin simular persistencia final", () => {
  const id = "11111111-1111-1111-1111-111111111111", shareId = "22222222-2222-2222-2222-222222222222";
  const token = "a".repeat(43); // Explicit synthetic unit fixture, not a runtime capability.
  it("acepta solo path relativo cerrado y título público normalizado", () => {
    expect(validPublicPath(`/shared/${token}`)).toBe(true);
    for (const value of [`https://example.test/shared/${token}`, `/shared/${token}?x`, `/shared/${token}/`, "/shared/short"]) expect(validPublicPath(value)).toBe(false);
    expect(shareInput(2, " Public title ")).toEqual({ expected_plan_revision: 2, title: "Public title" });
    for (const title of ["", " ", "bad\0", "x".repeat(101)]) expect(() => shareInput(1, title)).toThrow();
  });
  it("firma público GET exacto y privados shares UUID con métodos cerrados", () => {
    const fixture = "synthetic-unit-fixture-not-runtime-secret", root = `/api/plans/${id}/shares`, pub = `/api/shared-plans/${token}`;
    for (const method of ["GET", "POST"]) expect(signedProxyHeaders("127.0.0.1", method, root, fixture)).not.toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "DELETE", `${root}/${shareId}`, fixture)).not.toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "GET", pub, fixture)).not.toBeNull();
    for (const [method, path] of [["POST", pub], ["GET", pub + "?owner="], ["GET", pub + "/extra"], ["GET", `${root}/${shareId}`], ["PUT", root], ["DELETE", root], ["POST", `${root}/${shareId}`], ["GET", "/api/shared-plans/short"]]) expect(signedProxyHeaders("127.0.0.1", method, path, fixture)).toBeNull();
  });
  it("queries/UUID/métodos públicos e inválidos fallan sin backend ni caché", async () => {
    for (const method of ["GET", "POST"]) expect((await sharesProxy(new Request("http://127.0.0.1:3000/?owner=", { method }), id)).status).toBe(422);
    expect((await sharesProxy(new Request("http://127.0.0.1:3000/"), "bad")).status).toBe(422);
    expect((await sharesProxy(new Request("http://127.0.0.1:3000/"), id, shareId)).status).toBe(405);
    const response = await publicShareProxy(new Request("http://127.0.0.1:3000/"), "invalid");
    expect(response.status).toBe(404); expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await publicShareProxy(new Request("http://127.0.0.1:3000/", { method: "POST" }), token)).status).toBe(405);
    expect(publicHeaders["Referrer-Policy"]).toBe("no-referrer"); expect(publicMethodNotAllowed().status).toBe(405);
  });
  it("HTML escapa proyección, omite campos privados, sin JS/links/recursos/acciones", () => {
    const html = sharedHtml({ title: "<script>unit</script>", status: "requires_verification", cost: { total_ars: null }, stages: [{ evaluation: { notes: "PRIVATE_MARKER", coverage: ["R10"] } }], owner_id: "PRIVATE_OWNER", pc_id: "PRIVATE_PC" });
    expect(html).toContain("&lt;script&gt;unit&lt;/script&gt;");
    expect(html).toContain("Desconocido (null), no es cero"); expect(html).toContain("R10");
    for (const value of ["PRIVATE_MARKER", "PRIVATE_OWNER", "PRIVATE_PC", "<script", "<button", "<form", "<a ", "<link", "<img"]) expect(html).not.toContain(value);
    expect(html).toContain('content="no-referrer"'); expect(html).toContain('content="noindex,nofollow,noarchive"');
  });
  it("público no propaga cookies y gate de navegador desactiva artefactos", () => {
    const source = readFileSync(new URL("../../lib/shares-proxy.ts", import.meta.url), "utf8").split("export async function publicShareProxy")[1];
    expect(source).toContain('credentials: "omit"'); expect(source).not.toContain('request.headers.get("Cookie")');
    const test = readFileSync(new URL("../e2e/shares.spec.ts", import.meta.url), "utf8");
    expect(test).toContain('test.use({ trace: "off", screenshot: "off", video: "off" })');
    expect(test).not.toContain("console.");
  });
});
