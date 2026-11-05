import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "../../app/api/auth/[action]/route";
import { signedProxyHeaders } from "../../lib/gateway";

const secret = "s".repeat(32);
const id = "12345678-1234-1234-1234-123456789abc";
type Handler = typeof POST;
const handlers: Record<string, Handler> = { GET, POST, PATCH, DELETE };

function call(method: string, action: string, body?: string, query = "") {
  const request = new Request(`http://127.0.0.1:3000/api/auth/${action}${query}`, {
    method, body,
    headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://127.0.0.1:3000", Cookie: "uj_session=unit", "Content-Type": "application/json", "X-CSRF-Token": "unit-csrf", "X-UJ-User-Id": "forged", Authorization: "Bearer forged" },
    duplex: "half",
  } as RequestInit);
  return handlers[method](request, { params: Promise.resolve({ action }) });
}
function stubUpstream(status = 200, payload: unknown = { id, email: "lu@example.test", display_name: "Lu", roles: ["admin"] }) {
  vi.stubEnv("UJ_PROXY_SECRET", secret);
  const upstream = vi.fn(async () => status === 204 ? new Response(null, { status }) : Response.json(payload, { status }));
  vi.stubGlobal("fetch", upstream);
  return upstream;
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("proxy de cuenta: lista exacta, CSRF e identidad solo del servidor", () => {
  it.each([
    { method: "PATCH", action: "account", body: '{"display_name":"Lu"}', status: 200 },
    { method: "DELETE", action: "account", body: '{"confirmation":"BORRAR","password":"clave-actual-123"}', status: 204 },
    { method: "DELETE", action: "account", body: '{"confirmation":"BORRAR"}', status: 204 },
    { method: "POST", action: "password", body: '{"current_password":"clave-actual-123","new_password":"clave-nueva-456"}', status: 204 },
  ])("$method $action llega al backend con método, cuerpo, CSRF y firma", async ({ method, action, body, status }) => {
    const upstream = stubUpstream(status);
    const response = await call(method, action, body);
    expect(response.status).toBe(status); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(upstream).toHaveBeenCalledOnce();
    const [url, options] = upstream.mock.calls[0] as unknown as [URL, RequestInit];
    const headers = new Headers(options.headers);
    expect(url.pathname).toBe(`/api/auth/${action}`); expect(options.method).toBe(method); expect(options.body).toBe(body); expect(options.redirect).toBe("error");
    expect(headers.get("X-CSRF-Token")).toBe("unit-csrf"); expect(headers.get("Origin")).toBe("http://127.0.0.1:3000"); expect(headers.get("Cookie")).toBe("uj_session=unit");
    const expected = signedProxyHeaders("127.0.0.1", method, `/api/auth/${action}`, secret, Number(headers.get("X-UJ-Proxy-Timestamp")) * 1000)!;
    expect(headers.get("X-UJ-Proxy-Signature")).toBe(expected["X-UJ-Proxy-Signature"]);
    // Ninguna identidad sale del cliente: ni en el cuerpo ni en las cabeceras.
    expect(String(options.body)).not.toContain("user_id");
    expect([...headers.keys()].some(key => key.includes("user"))).toBe(false);
    expect(headers.get("Authorization")).toBeNull(); expect(headers.get("X-UJ-User-Id")).toBeNull();
  });

  it("la respuesta de PATCH account pasa por el usuario público (sin roles)", async () => {
    stubUpstream();
    const data = await (await call("PATCH", "account", '{"display_name":"Lu"}')).json();
    expect(data).toEqual({ id, email: "lu@example.test", display_name: "Lu" });
  });

  it.each([
    ["PATCH", "account", '{"display_name":"Lu","user_id":"otro"}'],
    ["PATCH", "account", '{"display_name":"Lu","email":"x@example.test"}'],
    ["PATCH", "account", '{"display_name":"Lu","id":"otro"}'],
    ["PATCH", "account", '{"nombre":"Lu"}'],
    ["PATCH", "account", '{"display_name":5}'],
    ["PATCH", "account", "{roto"],
    ["PATCH", "account", ""],
    ["PATCH", "account", "[]"],
    ["DELETE", "account", '{"confirmation":"BORRAR","user_id":"otro"}'],
    ["DELETE", "account", '{"password":"x"}'],
    ["DELETE", "account", ""],
    ["POST", "password", '{"current_password":"a","new_password":"b","user_id":"otro"}'],
    ["POST", "password", '{"new_password":"b"}'],
    ["POST", "password", "no es json"],
    ["POST", "password", ""],
  ])("rechaza con 400 y sin llamar al backend: %s %s %s", async (method, action, body) => {
    const upstream = stubUpstream();
    expect((await call(method, action, body)).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("405 con Allow correcto, 404 para acciones inventadas y 403 con query, sin llamar al backend", async () => {
    const upstream = stubUpstream();
    const wrongMethod = await call("POST", "account", '{"display_name":"Lu"}');
    expect(wrongMethod.status).toBe(405); expect(wrongMethod.headers.get("Allow")).toBe("PATCH, DELETE");
    const getPassword = await call("GET", "password");
    expect(getPassword.status).toBe(405); expect(getPassword.headers.get("Allow")).toBe("POST");
    expect((await call("DELETE", "login", "{}")).status).toBe(405);
    expect((await call("GET", "delete-everything")).status).toBe(404);
    expect((await call("PATCH", "__proto__", "{}")).status).toBe(404);
    expect((await call("PATCH", "account", '{"display_name":"Lu"}', "?user_id=otro")).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("las acciones existentes siguen funcionando (csrf GET)", async () => {
    const upstream = stubUpstream(200, { csrf_token: "tok", extra: "no" });
    const response = await call("GET", "csrf");
    expect(await response.json()).toEqual({ csrf_token: "tok" });
    expect((upstream.mock.calls[0] as unknown as [URL, RequestInit])[1].body).toBeUndefined();
  });

  it("errores del backend no reflejan su contenido", async () => {
    stubUpstream(401, { detail: "marca-privada" });
    const response = await call("POST", "password", '{"current_password":"a","new_password":"b"}');
    expect(response.status).toBe(401); expect(await response.text()).not.toContain("marca-privada");
  });
});
