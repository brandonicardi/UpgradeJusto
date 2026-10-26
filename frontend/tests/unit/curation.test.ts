import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { adminGatewayPath, signedProxyHeaders } from "../../lib/gateway";
import { curationProxy } from "../../lib/curation-proxy";
import { CurationError, curationError, curationRequest, parseAdminData } from "../../lib/curation";
const id = "revision-11111111111141118111111111111111";
const row = "row-22222222222242228222222222222222";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("CU02/CU10 contrato cerrado", () => {
  it("firma extracción solo POST y rutas admin por método/IDs backend/colección", () => {
    const sign = (path: string, method: string) => signedProxyHeaders("127.0.0.1", method, path, "s".repeat(32));
    for (const path of ["/api/pcs/extract", "/api/pcs/extract/confirm"]) {
      expect(sign(path, "POST")).not.toBeNull(); expect(sign(path, "GET")).toBeNull(); expect(sign(path + "/extra", "POST")).toBeNull();
    }
    for (const revision of ["sprint31b-a-v1", id]) {
      for (const collection of ["components", "prices", "sources", "cpu_support"]) {
        const path = `/api/admin/revisions/${revision}/${collection}`;
        for (const method of ["GET", "POST"]) expect(sign(path, method)).not.toBeNull();
        for (const method of ["PATCH", "DELETE"]) expect(sign(`${path}/${row}`, method)).not.toBeNull();
      }
      expect(sign(`/api/admin/revisions/${revision}/publish`, "POST")).not.toBeNull();
      for (let n = 1; n <= 14; n++) {
        const path = `/api/admin/revisions/${revision}/components/P${String(n).padStart(2, "0")}`;
        expect(adminGatewayPath(path, "PATCH")).toBe(true);
        expect(sign(path, "DELETE")).not.toBeNull();
      }
    }
    for (const [path, method] of [[`/api/admin/revisions/${id}/sql`, "POST"], ["/api/admin/bootstrap", "POST"], [`/api/admin/revisions/${id}/publish`, "GET"], [`/api/admin/revisions/${id}/sources/${row}`, "POST"], ["/api/admin/revisions/not-uuid/prices", "GET"]]) expect(sign(path, method)).toBeNull();
  });
  it("rechaza IDs ajenos, traversal, encoding y métodos fuera del contrato", () => {
    const root = `/api/admin/revisions/${id}`;
    const paths = [
      "/api/admin/revisions/11111111-1111-4111-8111-111111111111/prices",
      "/api/admin/revisions/sprint31b-a-v2/prices",
      "/api/admin/revisions/revision-abc/prices",
      `${root}/components/P00`, `${root}/components/P15`, `${root}/components/P1`,
      ...["prices", "sources", "cpu_support"].map(collection => `${root}/${collection}/P01`),
      `${root}/sources/${id}`, `${root}/sources/row-abc`,
      `${root}/components/../prices`, `${root}/components/%2e%2e`,
      `${root}/components/${row}%2fextra`, `${root}/components/${row}%252fextra`,
      `${root}/components/${row}/extra`, `${root}/components/${row}\\extra`,
    ];
    for (const path of paths) {
      expect(adminGatewayPath(path, "PATCH")).toBe(false);
      expect(signedProxyHeaders("127.0.0.1", "PATCH", path, "s".repeat(32))).toBeNull();
    }
    for (const method of ["PUT", "HEAD", "OPTIONS", "get", "UNKNOWN"]) {
      expect(adminGatewayPath(`${root}/prices`, method)).toBe(false);
      expect(adminGatewayPath(`${root}/prices/${row}`, method)).toBe(false);
    }
  });
  it("rechaza campos superiores nuevos y JSON ejecutable sin interpretarlo", () => {
    expect(parseAdminData('{"amount":"100.00"}', "prices")).toEqual({ amount: "100.00" });
    for (const input of ['{"user_id":"x"}', '[]', 'null', 'process.exit()']) expect(() => parseAdminData(input, "sources")).toThrow();
    expect(curationError(409)).toContain("Revisión obsoleta");
    expect(curationError(503)).toContain("incierto");
  });
  it("proxy conserva 422 y campos pero no input, mensajes ni secretos", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    const upstream = vi.fn().mockResolvedValue(Response.json({ detail: [{ loc: ["body", "pc", "components", 0], msg: "secret input", input: "private" }] }, { status: 422 }));
    vi.stubGlobal("fetch", upstream);
    const response = await curationProxy(new Request("http://localhost/api/pcs/extract", { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1", "Origin": "http://localhost", "X-CSRF-Token": "csrf" }, body: '{"text":"CPU"}' }), "/api/pcs/extract");
    expect(response.status).toBe(422); expect(await response.json()).toEqual({ detail: "Solicitud no completada", fields: ["body.pc.components.0"] });
    expect(upstream.mock.calls[0][1].headers.get("X-CSRF-Token")).toBe("csrf");
  });
  it("rejette rutas/queries no permitidas antes de contactar upstream", async () => {
    const upstream = vi.fn(); vi.stubGlobal("fetch", upstream);
    expect((await curationProxy(new Request("http://localhost/api/admin/revisions?role=admin"), "/api/admin/revisions")).status).toBe(422);
    for (const query of ["limit=1&limit=2", "offset=0&offset=1"]) {
      const path = "/api/admin/revisions/sprint31b-a-v1/prices";
      expect((await curationProxy(new Request(`http://localhost${path}?${query}`), path)).status).toBe(422);
    }
    expect((await curationProxy(new Request("http://localhost/api/admin/bootstrap", { method: "POST" }), "/api/admin/bootstrap")).status).toBe(405);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("consulta precios seed con paginación sin cambiar firma ni query", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    vi.stubEnv("CATALOG_API_URL", "http://127.0.0.1:8000");
    const upstream = vi.fn().mockResolvedValue(Response.json({ items: [], total: 0, limit: 25, offset: 0 }));
    vi.stubGlobal("fetch", upstream);
    const path = "/api/admin/revisions/sprint31b-a-v1/prices";
    const response = await curationProxy(new Request(`http://localhost${path}?limit=25&offset=0`, { headers: { "X-UJ-Socket-IP": "127.0.0.1" } }), path);
    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][0].href).toBe(`http://127.0.0.1:8000${path}?limit=25&offset=0`);
    const headers = upstream.mock.calls[0][1].headers as Headers;
    const timestamp = Number(headers.get("X-UJ-Proxy-Timestamp")) * 1000;
    const expected = signedProxyHeaders("127.0.0.1", "GET", path, "s".repeat(32), timestamp);
    expect(headers.get("X-UJ-Proxy-Signature")).toBe(expected?.["X-UJ-Proxy-Signature"]);
  });
  it("ningún retry ante fallo de confirmación", async () => {
    const upstream = vi.fn().mockResolvedValueOnce(Response.json({ csrf_token: "csrf" })).mockRejectedValueOnce(new Error("network private body"));
    vi.stubGlobal("fetch", upstream);
    await expect(curationRequest("/api/pcs/extract/confirm", "POST", { confirmed: true })).rejects.toBeInstanceOf(CurationError);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it("cancelar descarta estado sin POST; envío protegido por lock y checkbox", () => {
    const source = readFileSync(new URL("../../app/pcs/import/proposal.tsx", import.meta.url), "utf8");
    expect(source).toContain('onClick={() => { setPreview(null); setError(""); setConfirmed(false); setBlocked(false); }}');
    expect(source).toContain("if (lock.current || !preview || !confirmed || blocked) return");
    expect(source).toContain("confirmed: true, pc, metadata:");
    expect(source).not.toContain("localStorage");
  });
});
