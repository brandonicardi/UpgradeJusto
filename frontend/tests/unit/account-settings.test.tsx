import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DeleteView, NameSection, PasswordSection, type DeleteViewProps } from "../../components/account-settings";
import {
  AccountSettingsError, canConfirmDelete, deleteBody, describeAccountFailure, displayNameBody, normalizeDisplayName, passwordBody,
  saveDisplayName, sendAccountChange, validateDisplayName, validateNewPassword,
} from "../../lib/account-settings";
import { publicUser } from "../../lib/public-user";

const id = "12345678-1234-1234-1234-123456789abc";
const local = publicUser({ id, email: "lu@example.test", display_name: "Lu" });
const google = publicUser({ id, email: "g@example.test", auth_provider: "google", display_name: "Gabi" });
const noop = () => undefined;
function view(props: Partial<DeleteViewProps> = {}) {
  return renderToStaticMarkup(<DeleteView open word="" busy={false} error="" needsPassword onAsk={noop} onWord={noop} onCancel={noop} onSubmit={noop} {...props} />);
}
// Sin las clases de Tailwind (`disabled:…`), para mirar solo el atributo real.
const submitButton = (html: string) => (/<button[^>]*type="submit"[^>]*>/.exec(html)?.[0] ?? "").replace(/class="[^"]*"/, "");

describe("lógica de cuenta (funciones puras)", () => {
  it("normaliza y valida el nombre", () => {
    expect(normalizeDisplayName("  Lu  ")).toBe("Lu");
    expect(validateDisplayName("   ")).toMatch(/Escribí/); expect(validateDisplayName("")).not.toBeNull();
    expect(validateDisplayName("a".repeat(200))).toBeNull(); expect(validateDisplayName("a".repeat(201))).toMatch(/200/);
    expect(validateDisplayName(` ${"a".repeat(200)} `)).toBeNull();
  });
  it("valida la contraseña nueva entre 12 y 128", () => {
    expect(validateNewPassword("a".repeat(11))).toMatch(/12 y 128/); expect(validateNewPassword("a".repeat(12))).toBeNull();
    expect(validateNewPassword("a".repeat(128))).toBeNull(); expect(validateNewPassword("a".repeat(129))).not.toBeNull();
  });
  it("la compuerta de BORRAR recorta y no distingue mayúsculas, pero exige la palabra completa", () => {
    for (const ok of ["BORRAR", "borrar", " BORRAR ", "Borrar\n"]) expect(canConfirmDelete(ok)).toBe(true);
    for (const no of ["", "BORRA", "BORRARR", "BORRAR YA", "BOR RAR"]) expect(canConfirmDelete(no)).toBe(false);
  });
  it("los cuerpos llevan exactamente las claves permitidas, sin user_id", () => {
    expect(Object.keys(displayNameBody("  Lu "))).toEqual(["display_name"]); expect(displayNameBody("  Lu ").display_name).toBe("Lu");
    expect(Object.keys(passwordBody("a", "b")).sort()).toEqual(["current_password", "new_password"]);
    expect(Object.keys(deleteBody(local, "clave")).sort()).toEqual(["confirmation", "password"]);
    expect(Object.keys(deleteBody(google, "ignorada"))).toEqual(["confirmation"]); expect(deleteBody(google, "x").confirmation).toBe("BORRAR");
    for (const body of [displayNameBody("x"), passwordBody("a", "b"), deleteBody(local, "c"), deleteBody(google, "")]) expect(JSON.stringify(body)).not.toMatch(/user_id|"email"|"id"/);
  });
  it("los mensajes de error son claros y no revelan datos", () => {
    expect(describeAccountFailure("password", 409)).toBe("Esta cuenta entra con Google y no tiene contraseña acá.");
    expect(describeAccountFailure("password", 401)).not.toMatch(/incorrecta|no existe|email/i);
    expect(describeAccountFailure("delete", 401)).toMatch(/No se borró nada/); expect(describeAccountFailure("delete", 400)).toMatch(/BORRAR/);
    expect(describeAccountFailure("name", 500)).toMatch(/Probá de nuevo/);
    for (const op of ["name", "password", "delete"] as const) for (const status of [400, 401, 409, 422, 500, 503]) expect(describeAccountFailure(op, status)).not.toMatch(/snapshot|schema|scope|coverage|CSRF|status|HTTP/i);
  });
});

describe("pedidos de cuenta", () => {
  function harness(status = 200, payload: unknown = { id, email: "lu@example.test", display_name: "Nuevo" }) {
    return vi.fn<typeof fetch>().mockImplementation(async path => path === "/api/auth/csrf" ? Response.json({ csrf_token: "tok" }) : status === 204 ? new Response(null, { status }) : Response.json(payload, { status }));
  }
  it("pide el token y manda método, ruta y cuerpo exactos", async () => {
    const request = harness(204);
    await sendAccountChange("delete", deleteBody(local, "clave"), request);
    expect(request.mock.calls.map(call => call[0])).toEqual(["/api/auth/csrf", "/api/auth/account"]);
    const options = request.mock.calls[1][1]!;
    expect(options.method).toBe("DELETE"); expect(JSON.parse(options.body as string)).toEqual({ confirmation: "BORRAR", password: "clave" });
    expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe("tok"); expect(options.credentials).toBe("same-origin");
    await sendAccountChange("password", passwordBody("a", "b"), request); expect(request.mock.calls[3][0]).toBe("/api/auth/password"); expect(request.mock.calls[3][1]!.method).toBe("POST");
  });
  it("guarda el nombre con solo display_name y devuelve el usuario del servidor", async () => {
    const request = harness();
    const user = await saveDisplayName("  Nuevo ", request);
    expect(user.display_name).toBe("Nuevo");
    expect(request.mock.calls[1][1]!.method).toBe("PATCH"); expect(request.mock.calls[1][1]!.body).toBe('{"display_name":"Nuevo"}');
  });
  it.each([[401], [409], [500]])("el error %s se vuelve un mensaje para personas", async status => {
    await expect(sendAccountChange("password", passwordBody("a", "b"), harness(status))).rejects.toMatchObject({ status, message: describeAccountFailure("password", status) });
  });
  it("si la red falla, el mensaje no es técnico", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    const failure = await sendAccountChange("name", {}, request).catch(error => error);
    expect(failure).toBeInstanceOf(AccountSettingsError); expect(failure.message).not.toContain("fetch failed");
  });
});

describe("pantalla de cuenta (render)", () => {
  it("borrar: al inicio solo está el pedido, sin confirmación ni campos", () => {
    const html = view({ open: false });
    expect(html).toContain("Quiero borrar mi cuenta"); expect(html).not.toContain("Borrar todo"); expect(html).not.toContain("<input");
    expect(html).toContain("border-dashed border-no-encaja"); expect(html).toContain("text-no-encaja");
  });
  it("borrar: el botón está deshabilitado hasta escribir exactamente BORRAR", () => {
    for (const word of ["", "borra", "BORRARR"]) {
      const button = submitButton(view({ word }));
      expect(button).toContain("disabled"); expect(view({ word })).toContain("Escribí BORRAR para poder borrar");
    }
    for (const word of ["BORRAR", "borrar", "BORRAR "]) {
      const html = view({ word }); expect(submitButton(html)).not.toContain("disabled"); expect(html).toContain("Borrar todo");
    }
    expect(submitButton(view({ word: "BORRAR", busy: true }))).toMatch(/disabled=""[^>]*aria-busy="true"|aria-busy="true"[^>]*disabled=""/);
  });
  it("borrar: pide la contraseña solo en cuentas locales y ofrece cancelar", () => {
    expect(view()).toContain('type="password"'); expect(view()).toMatch(/autocomplete="current-password"/i);
    expect(view({ needsPassword: false })).not.toContain('type="password"'); expect(view()).toContain("Mejor no");
  });
  it("borrar: un error queda visible y avisa que no se borró nada", () => {
    const html = view({ error: describeAccountFailure("delete", 401) });
    expect(html).toContain('role="alert"'); expect(html).toContain("No se borró nada"); expect(html).toContain("No pudimos confirmar tu contraseña");
  });
  it("contraseña: ausente en cuentas de Google, presente con el rango real en las locales", () => {
    expect(renderToStaticMarkup(<PasswordSection user={google} />)).toBe("");
    const html = renderToStaticMarkup(<PasswordSection user={local} />);
    expect(html).toContain("La que usás ahora"); expect(html).toContain("La nueva"); expect(html).toContain("Entre 12 y 128 caracteres");
    expect(html).toMatch(/autocomplete="current-password"/i); expect(html).toMatch(/autocomplete="new-password"/i); expect(html).toContain("Cambiar contraseña");
    expect(html).not.toMatch(/ value=/);
  });
  it("datos: nombre precargado y escapado, correo de solo lectura, sin HTML reflejado", () => {
    const user = publicUser({ id, email: "lu@example.test", display_name: '<img src=x onerror="bad()">' });
    const html = renderToStaticMarkup(<NameSection user={user} onUser={noop} />);
    expect(html).toContain("&lt;img"); expect(html).not.toContain("<img"); expect(html).toMatch(/readonly/i);
    expect(html).toContain("Cómo te llamamos"); expect(html).toContain("Tu correo"); expect(html).toContain("Hasta 200 caracteres"); expect(html).toContain("Guardar");
    expect(renderToStaticMarkup(<NameSection user={publicUser({ id, email: "a@example.test" })} onUser={noop} />)).toContain('value=""');
  });
});
