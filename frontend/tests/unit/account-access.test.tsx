import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AccountAccess, { type AccountAccessProps } from "../../components/account-access";
import { authError } from "../../lib/auth";
import { describeAccessError, nextTab } from "../../lib/account-access";

const base: AccountAccessProps = {
  tab: "login",
  busy: false,
  locked: false,
  email: "",
  error: "",
  created: false,
  statusText: "",
  onTabChange: () => {},
  onEmailChange: () => {},
  onSubmit: () => {},
};

const render = (props: Partial<AccountAccessProps> = {}) => renderToStaticMarkup(<AccountAccess {...base} {...props} />);
const tabTag = (markup: string, label: string) =>
  new RegExp(`<button[^>]*role="tab"[^>]*>${label}</button>`).exec(markup)?.[0] ?? "";

describe("pestañas de acceso", () => {
  it("marca la pestaña activa y monta un solo formulario", () => {
    for (const [tab, activa, otra] of [["login", "Entrar", "Crear cuenta"], ["register", "Crear cuenta", "Entrar"]] as const) {
      const markup = render({ tab });
      expect(tabTag(markup, activa)).toContain('aria-selected="true"');
      expect(tabTag(markup, activa)).toContain('tabindex="0"');
      expect(tabTag(markup, otra)).toContain('aria-selected="false"');
      expect(tabTag(markup, otra)).toContain('tabindex="-1"');
      expect(markup.match(/role="tabpanel"/g)).toHaveLength(1);
      expect(markup.match(/<form/g)).toHaveLength(1);
      expect(markup).toContain('role="tablist"');
    }
  });

  it("las dos pestañas apuntan al único panel y este nombra a la pestaña activa", () => {
    for (const [tab, activa] of [["login", "login"], ["register", "register"]] as const) {
      const markup = render({ tab });
      const controls = [...markup.matchAll(/role="tab"[^>]*aria-controls="([^"]+)"/g)].map((m) => m[1]);
      expect(controls).toHaveLength(2);
      for (const control of controls) expect(markup.match(new RegExp(`id="${control}"`, "g"))).toHaveLength(1);
      expect(markup).toMatch(new RegExp(`role="tabpanel"[^>]*aria-labelledby="acceso-tab-${activa}"`));
    }
  });

  it("muestra la ayuda de 12 a 128 caracteres solo al crear la cuenta", () => {
    expect(render({ tab: "register" })).toContain("Entre 12 y 128 caracteres");
    expect(render({ tab: "login" })).not.toContain("128");
  });

  it("conserva el correo escrito al cambiar de pestaña", () => {
    expect(render({ tab: "login", email: "ana@correo.com" })).toContain('value="ana@correo.com"');
    expect(render({ tab: "register", email: "ana@correo.com" })).toContain('value="ana@correo.com"');
  });

  it("no precarga ninguna contraseña", () => {
    expect(render({ tab: "register", email: "ana@correo.com" })).not.toMatch(/type="password"[^>]*value=/);
  });

  it("bloquea el formulario mientras hay un intento en curso", () => {
    expect(render({ locked: true })).toContain("<fieldset disabled");
    expect(render()).not.toContain("<fieldset disabled");
  });

  it("con un intento de Google el formulario queda bloqueado y el acceso alternativo sigue visible", () => {
    const markup = render({ locked: true, alternative: <p>Acceso alternativo visible</p> });
    const fieldset = /<fieldset[^>]*>[\s\S]*<\/fieldset>/.exec(markup)?.[0] ?? "";
    expect(fieldset.startsWith("<fieldset disabled")).toBe(true);
    expect(fieldset).toContain('name="email"');
    expect(fieldset).toContain('name="password"');
    expect(fieldset).toContain('type="submit"');
    expect(markup).toContain("Acceso alternativo visible");
    expect(markup.indexOf("Acceso alternativo visible")).toBeGreaterThan(markup.indexOf("</fieldset>"));
  });

  it("separa el acceso alternativo con una «o» solo si existe", () => {
    expect(render({ alternative: <p>Otro</p> })).toMatch(/aria-hidden="true"[^>]*>o</);
    expect(render()).not.toMatch(/aria-hidden="true"[^>]*>o</);
  });
});

describe("teclado entre pestañas", () => {
  it("las flechas alternan entre Entrar y Crear cuenta", () => {
    expect(nextTab("login", "ArrowRight")).toBe("register");
    expect(nextTab("register", "ArrowRight")).toBe("login");
    expect(nextTab("login", "ArrowLeft")).toBe("register");
    expect(nextTab("register", "ArrowLeft")).toBe("login");
  });
  it("Inicio y Fin saltan a los extremos y otras teclas no navegan", () => {
    expect(nextTab("register", "Home")).toBe("login");
    expect(nextTab("login", "End")).toBe("register");
    expect(nextTab("login", "Tab")).toBeNull();
    expect(nextTab("login", "Enter")).toBeNull();
  });
});

describe("avisos de acceso", () => {
  it("las credenciales rechazadas dan un aviso general sin marcar campos", () => {
    const markup = render({ error: authError(401) });
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("No pudimos entrar");
    expect(markup).toContain("El correo o la contraseña no coinciden");
    expect(markup).not.toContain("aria-invalid");
    expect(markup).not.toContain("sesión vencida");
    expect(markup).not.toMatch(/no existe|no está registrado/i);
  });

  it("otros errores conservan su mensaje seguro con un título neutro", () => {
    expect(describeAccessError(authError(503), "login")).toEqual({ titulo: "No pudimos continuar", cuerpo: authError(503) });
    expect(describeAccessError(authError(401), "register").titulo).toBe("No pudimos continuar");
  });

  it("no muestra aviso de error si no hay error", () => {
    expect(render()).not.toContain('role="alert"');
  });

  it("la cuenta creada vuelve a Entrar con un aviso de estado, sin sesión abierta", () => {
    const markup = render({ tab: "login", created: true });
    expect(markup).toContain("Cuenta creada");
    expect(tabTag(markup, "Entrar")).toContain('aria-selected="true"');
    expect(markup).toContain('aria-label="Estado de cuenta"');
    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain("Conectado");
  });

  it("anuncia la cuenta creada una sola vez: el aviso visual queda oculto a lectores de pantalla", () => {
    const markup = render({ created: true });
    expect(markup).toContain("Cuenta creada. Ya podés entrar con tu email y tu contraseña.");
    expect(markup.match(/role="status"/g)).toHaveLength(2);
    expect(markup).toMatch(/aria-hidden="true"><div role="status"/);
    const region = /<div role="status" aria-label="Estado de cuenta"[\s\S]*?<\/div><\/div><\/div>/.exec(markup)?.[0] ?? "";
    expect(region).toContain('class="sr-only"');
  });

  it("sin cuenta recién creada no aparece el aviso", () => {
    expect(render()).not.toContain("Cuenta creada");
  });
});
