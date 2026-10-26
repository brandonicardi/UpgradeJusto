import { describe, expect, it } from "vitest";
import { authError } from "../../lib/auth";

describe("CU01 mensajes locales (unitario, no integración)", () => {
  it.each([401, 403, 409, 422, 429, 503, 500])("presenta error seguro para %s", status => {
    expect(authError(status)).toBeTruthy();
  });
  it("muestra Retry-After numérico sin reflejar texto arbitrario", () => {
    expect(authError(429, "42")).toContain("42 segundos");
    expect(authError(429, "sensitive-arbitrary-value")).not.toContain("sensitive-arbitrary-value");
  });
});
