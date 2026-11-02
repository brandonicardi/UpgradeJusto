import { publicUser, type PublicUser } from "./public-user";

export const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
export type GoogleConfig = { enabled: boolean; client_id: string | null };
export type GoogleAttempt = { attempt_id: string; nonce: string; expires_at: string };
export type GIS = {
  initialize: (options: { client_id: string; nonce: string; auto_select: false; callback: (response: { credential?: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: { type: "standard"; theme: "outline"; size: "large"; text: "signin_with" }) => void;
  cancel: () => void;
};
export type GoogleState = { phase: "idle" | "preparing" | "ready" | "submitting" | "success" | "error"; message: string };
class GoogleSignInError extends Error {}
export function googleError(status: number, retryAfter: string | null = null): string {
  if (status === 429) return retryAfter && /^\d{1,8}$/.test(retryAfter) ? `Demasiados intentos. Esperá ${Number(retryAfter)} segundos antes de preparar otro acceso.` : "Demasiados intentos. Esperá antes de preparar otro acceso.";
  if (status === 403) return "No se pudo validar la protección de sesión. Prepará un acceso nuevo.";
  if (status === 401 || status === 409) return "El acceso de Google no pudo completarse o el intento ya no está disponible. Prepará un acceso nuevo.";
  if (status === 408 || status === 413) return "Solicitud interrumpida o demasiado grande. No se reenvió la credencial.";
  return "Acceso con Google no disponible. Podés usar tu cuenta local o preparar otro intento más tarde.";
}
async function checked(response: Response) {
  if (!response.ok) throw new GoogleSignInError(googleError(response.status, response.headers.get("Retry-After")));
  return response.json();
}
// One controller for the one GIS button on this page. Tokens exist only in the
// SDK callback's request, never in UI state, closures retained for retry or storage.
export function createGoogleSignIn(deps: { sdk: () => GIS | undefined; onState: (state: GoogleState) => void; onUser: (user: PublicUser) => void; sessionChanged: () => void; request?: typeof fetch; now?: () => number }) {
  const request = deps.request ?? fetch, now = deps.now ?? Date.now;
  let generation = 0, active: AbortController | null = null, sdk: GIS | undefined, target: HTMLElement | null = null;
  let phase: GoogleState["phase"] = "idle";
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const state = (next: GoogleState["phase"], message: string) => { phase = next; deps.onState({ phase: next, message }); };
  function clear() { generation++; active?.abort(); active = null; clearTimeout(expiryTimer); expiryTimer = undefined; sdk?.cancel(); target?.replaceChildren(); target = null; }
  async function csrf(signal: AbortSignal) {
    const data = await checked(await request("/api/auth/csrf", { credentials: "same-origin", cache: "no-store", signal }));
    if (typeof data.csrf_token !== "string") throw new GoogleSignInError(googleError(503));
    return data.csrf_token as string;
  }
  return {
    cancel() { clear(); state("idle", "Acceso cancelado. Para continuar, prepará un intento nuevo."); },
    dispose: clear,
    async prepare(clientId: string, element: HTMLElement) {
      if (["preparing", "ready", "submitting"].includes(phase)) return;
      clear(); const ticket = generation, controller = new AbortController(); active = controller; target = element;
      const current = () => ticket === generation && !controller.signal.aborted;
      state("preparing", "Preparando acceso con Google…");
      try {
        sdk = deps.sdk(); if (!sdk || !clientId) throw new GoogleSignInError(googleError(503));
        const token = await csrf(controller.signal);
        if (!current()) return;
        const attempt: GoogleAttempt = await checked(await request("/api/auth/google/attempts", { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: "{}" }));
        const expires = Date.parse(attempt.expires_at);
        if (!current()) return;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attempt.attempt_id) || typeof attempt.nonce !== "string" || !attempt.nonce || !Number.isFinite(expires) || expires <= now()) throw new GoogleSignInError(googleError(409));
        let submitted = false;
        const callback = async (response: { credential?: string }) => {
          if (!current() || submitted) return;
          submitted = true; clearTimeout(expiryTimer); expiryTimer = undefined; element.replaceChildren(); sdk?.cancel(); state("submitting", "Validando acceso en el servidor…");
          try {
            if (expires <= now() || typeof response.credential !== "string" || !response.credential) throw new GoogleSignInError(googleError(401));
            const user = publicUser(await checked(await request("/api/auth/google", { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify({ attempt_id: attempt.attempt_id, credential: response.credential }) })));
            if (!current()) return;
            await csrf(controller.signal);
            if (!current()) return;
            deps.sessionChanged(); state("success", "Sesión validada por el servidor. Podés continuar a tu PC."); deps.onUser(user);
          } catch (error) {
            if (current()) { clear(); state("error", error instanceof GoogleSignInError ? error.message : googleError(503)); }
          }
        };
        sdk.initialize({ client_id: clientId, nonce: attempt.nonce, auto_select: false, callback: response => { void callback(response); } });
        sdk.renderButton(element, { type: "standard", theme: "outline", size: "large", text: "signin_with" });
        state("ready", "Usá el botón oficial de Google para elegir una cuenta. Podés cancelar.");
        expiryTimer = setTimeout(() => { if (current() && !submitted) { clear(); state("error", "El intento venció. Prepará un acceso nuevo."); } }, Math.min(2147483647, Math.max(0, expires - now())));
      } catch (error) {
        if (current()) { clear(); state("error", error instanceof GoogleSignInError ? error.message : googleError(503)); }
      }
    },
  };
}
