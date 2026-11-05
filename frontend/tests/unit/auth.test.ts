import { describe, expect, it } from "vitest";
import { authError } from "../../lib/auth";
import { PASSWORD_HELP, PASSWORD_MAX, PASSWORD_MIN, describeAccessError } from "../../lib/account-access";

describe("CU01 mensajes locales (unitario, no integración)", () => {
  it.each([401, 403, 409, 422, 429, 503, 500])("presenta error seguro para %s", status => {
    expect(authError(status)).toBeTruthy();
  });
  it("muestra Retry-After numérico sin reflejar texto arbitrario", () => {
    expect(authError(429, "42")).toContain("42 segundos");
    expect(authError(429, "sensitive-arbitrary-value")).not.toContain("sensitive-arbitrary-value");
  });
});

describe("avisos de acceso para la persona usuaria", () => {
  it("el rechazo de credenciales (401) al entrar no señala campos ni confirma que el correo exista", () => {
    const aviso = describeAccessError(authError(401), "login");
    expect(aviso.titulo).toBe("No pudimos entrar");
    expect(aviso.cuerpo).toContain("El correo o la contraseña no coinciden");
    expect(aviso.cuerpo).not.toMatch(/no existe|no está registrado/i);
  });
  it("un email ya registrado al crear la cuenta mantiene su mensaje", () => {
    expect(describeAccessError(authError(409), "register").cuerpo).toBe(authError(409));
  });
  it("la ayuda de contraseña de Crear cuenta indica el rango vigente", () => {
    expect(PASSWORD_HELP.register).toContain(`${PASSWORD_MIN}`);
    expect(PASSWORD_HELP.register).toContain(`${PASSWORD_MAX}`);
    expect([PASSWORD_MIN, PASSWORD_MAX]).toEqual([12, 128]);
  });
});
