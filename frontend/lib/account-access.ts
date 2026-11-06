import { authError } from "./auth";

export type AccessTab = "login" | "register";

export const ACCESS_TABS: ReadonlyArray<{ id: AccessTab; etiqueta: string }> = [
  { id: "login", etiqueta: "Entrar" },
  { id: "register", etiqueta: "Crear cuenta" },
];

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export const PASSWORD_HELP: Record<AccessTab, string> = {
  login: "Tu contraseña no se almacena en este navegador.",
  register: `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres. Los espacios también cuentan.`,
};

/** Lo que pide el servidor (12 a 128 caracteres); no se inventan reglas que no se hacen cumplir. */
export const PASSWORD_RULE = `${PASSWORD_MIN} caracteres o más`;

export function createdNotice(name: string): { titulo: string; cuerpo: string } {
  const who = name.trim();
  return {
    titulo: who ? `¡Hola, ${who}! Ya tenés tu cuenta.` : "¡Cuenta creada!",
    cuerpo: "Ya podés entrar con tu correo y tu contraseña.",
  };
}

export const CREATED_NOTICE = createdNotice("");

export const createdAnnouncement = (name: string) => { const notice = createdNotice(name); return `${notice.titulo} ${notice.cuerpo}`; };

/** Un único panel (se monta un solo formulario) que ambas pestañas controlan. */
export const ACCESS_PANEL_ID = "acceso-panel";

export function accessIds(tab: AccessTab) {
  return { tab: `acceso-tab-${tab}`, panel: ACCESS_PANEL_ID };
}

/** Pestaña a la que mueven las flechas, Inicio y Fin; `null` si la tecla no navega. */
export function nextTab(current: AccessTab, key: string): AccessTab | null {
  const index = ACCESS_TABS.findIndex((tab) => tab.id === current);
  const last = ACCESS_TABS.length - 1;
  if (index < 0) return null;
  if (key === "ArrowRight") return ACCESS_TABS[index === last ? 0 : index + 1].id;
  if (key === "ArrowLeft") return ACCESS_TABS[index === 0 ? last : index - 1].id;
  if (key === "Home") return ACCESS_TABS[0].id;
  if (key === "End") return ACCESS_TABS[last].id;
  return null;
}

/**
 * Texto del aviso de error. Si el servidor rechazó las credenciales no se dice cuál campo falló
 * ni si el correo existe.
 */
export function describeAccessError(message: string, tab: AccessTab): { titulo: string; cuerpo: string } {
  if (tab === "login" && message === authError(401)) {
    return { titulo: "No pudimos entrar", cuerpo: "El correo o la contraseña no coinciden. Revisalos y probá otra vez." };
  }
  return { titulo: "No pudimos continuar", cuerpo: message };
}
