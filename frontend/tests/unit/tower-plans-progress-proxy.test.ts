import { afterEach, describe, expect, it, vi } from "vitest";
import { towerPlansProxy } from "../../lib/tower-plans-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
import { PUT, DELETE } from "../../app/api/tower-plans/[id]/stages/[stageKey]/progress/route";

const id = "12345678-1234-1234-1234-123456789abc", key = "a".repeat(63) + "0", secret = "s".repeat(32);
const path = `/api/tower-plans/${id}/stages/${key}/progress`;
function input(method: string, body?: BodyInit, query = "") {
  return new Request(`http://localhost${path}${query}`, { method, body, headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", Cookie: "uj_session=abc", "X-CSRF-Token": "synthetic", "X-UJ-Client-IP": "6.6.6.6" }, duplex: "half" } as RequestInit);
}
const confirmed = { kind: "tower_plan_progress", plan_id: id, revision: 1, progress: { [key]: "2026-11-05T10:00:00Z" } };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("proxy del progreso del plan: lista cerrada", () => {
  it.each(["PUT", "DELETE"])("%s llega firmado a la ruta exacta, con CSRF y cookie, sin cuerpo", async method => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const request = vi.fn().mockImplementation(async () => Response.json(confirmed)); vi.stubGlobal("fetch", request);
    const response = await towerPlansProxy(input(method, '{"user_id":"other"}'), id, "progress", key);
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(await response.json()).toEqual(confirmed);
    const [url, options] = request.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe(path); expect(new URL(String(url)).search).toBe(""); expect(options.method).toBe(method); expect(options.body).toBeUndefined();
    expect(options.headers.get("Origin")).toBe("http://127.0.0.1:3000"); expect(options.headers.get("Cookie")).toBe("uj_session=abc"); expect(options.headers.get("X-CSRF-Token")).toBe("synthetic");
    expect(options.headers.get("X-UJ-Client-IP")).toBe("127.0.0.1");
    expect(options.headers.get("X-UJ-Proxy-Signature")).toBe(signedProxyHeaders("127.0.0.1", method, path, secret, Number(options.headers.get("X-UJ-Proxy-Timestamp")) * 1000)!["X-UJ-Proxy-Signature"]);
    expect(JSON.stringify([...options.headers.entries()])).not.toContain("user_id");
  });
  it.each(["GET", "POST", "PATCH"])("%s sobre la ruta de progreso responde 405 sin llamar al servidor", async method => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await towerPlansProxy(input(method, method === "GET" ? undefined : "{}"), id, "progress", key)).status).toBe(405); expect(request).not.toHaveBeenCalled();
  });
  it.each([["mayúsculas", "A".repeat(64)], ["63 caracteres", "a".repeat(63)], ["65 caracteres", "a".repeat(65)], ["no hexadecimal", "g".repeat(64)], ["recorrido de ruta", "../".repeat(21) + "a"], ["vacía", ""]])("clave de etapa inválida (%s) → 422 sin fetch", async (_name, bad) => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await towerPlansProxy(input("PUT"), id, "progress", bad)).status).toBe(422);
    expect((await towerPlansProxy(input("DELETE"), id, "progress", bad)).status).toBe(422);
    expect(request).not.toHaveBeenCalled();
  });
  it("id inválido o clave ausente → 422 sin fetch", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await towerPlansProxy(input("PUT"), id.toUpperCase(), "progress", key)).status).toBe(422);
    expect((await towerPlansProxy(input("PUT"), id, "progress")).status).toBe(422);
    expect((await towerPlansProxy(input("PUT"), undefined, "progress", key)).status).toBe(422);
    expect(request).not.toHaveBeenCalled();
  });
  it("user_id o cualquier otra query → 422 sin fetch", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const request = vi.fn(); vi.stubGlobal("fetch", request);
    for (const query of ["?user_id=other", "?x=1"]) expect((await towerPlansProxy(input("PUT", undefined, query), id, "progress", key)).status).toBe(422);
    expect(request).not.toHaveBeenCalled();
  });
  it("sin UJ_PROXY_SECRET → 503 sin fetch", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", ""); const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect((await towerPlansProxy(input("PUT"), id, "progress", key)).status).toBe(503); expect(request).not.toHaveBeenCalled();
  });
  it("una respuesta de error no filtra detalle del servidor", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const request = vi.fn().mockResolvedValue(Response.json({ detail: "private owner data" }, { status: 403 })); vi.stubGlobal("fetch", request);
    const response = await towerPlansProxy(input("PUT"), id, "progress", key);
    expect(response.status).toBe(403); expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(await response.text()).not.toContain("private");
  });
  it("la ruta de App Router exporta PUT y DELETE y delega con la clave", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", secret); const request = vi.fn().mockImplementation(async () => Response.json(confirmed)); vi.stubGlobal("fetch", request);
    const context = { params: Promise.resolve({ id, stageKey: key }) };
    expect((await PUT(input("PUT"), context)).status).toBe(200); expect((await DELETE(input("DELETE"), context)).status).toBe(200);
    expect(request.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([path, path]);
  });
  it("la firma solo cubre PUT|DELETE de la ruta exacta", () => {
    for (const method of ["PUT", "DELETE"]) expect(signedProxyHeaders("127.0.0.1", method, path, secret)).not.toBeNull();
    for (const method of ["GET", "POST", "PATCH"]) expect(signedProxyHeaders("127.0.0.1", method, path, secret)).toBeNull();
    for (const bad of [`/api/tower-plans/${id}/stages/${key.toUpperCase()}/progress`, `/api/tower-plans/${id}/stages/${key.slice(1)}/progress`, `/api/tower-plans/${id}/stages/${key}/progress/extra`, `/api/tower-plans/${id}/stages/${key}`, `/api/tower-plans/${id.toUpperCase()}/stages/${key}/progress`]) expect(signedProxyHeaders("127.0.0.1", "PUT", bad, secret)).toBeNull();
  });
});
