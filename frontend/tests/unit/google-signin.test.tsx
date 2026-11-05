import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createGoogleSignIn, googleError, GIS_SCRIPT, type GIS, type GoogleState } from "../../lib/google-signin";
import { publicUser } from "../../lib/public-user";
import AccountProfile from "../../components/account-profile";

const id = "12345678-1234-1234-1234-123456789abc", now = Date.parse("2026-10-26T12:00:00Z");
function harness(signinStatus = 200) {
  const initialize = vi.fn<GIS["initialize"]>(), renderButton = vi.fn<GIS["renderButton"]>(), cancel = vi.fn();
  const sdk = { initialize, renderButton, cancel };
  const element = { replaceChildren: vi.fn() } as unknown as HTMLElement;
  const states = vi.fn<(state: GoogleState) => void>(), onUser = vi.fn(), changed = vi.fn();
  let attempts = 0;
  const request = vi.fn<typeof fetch>().mockImplementation(async path => {
    if (path === "/api/auth/csrf") return Response.json({ csrf_token: "synthetic-csrf" });
    if (path === "/api/auth/google/attempts") return Response.json({ attempt_id: id, nonce: `synthetic-nonce-${++attempts}`, expires_at: new Date(now + 300000).toISOString() });
    if (path === "/api/auth/google") return Response.json(signinStatus === 200 ? { id, email: null, auth_provider: "google", display_name: "Synthetic" } : { detail: "private verifier error" }, { status: signinStatus });
    throw new Error("Unexpected test request");
  });
  const controller = createGoogleSignIn({ sdk: () => sdk, onState: states, onUser, sessionChanged: changed, request, now: () => now });
  return { controller, request, initialize, renderButton, cancel, element, states, onUser, changed };
}
afterEach(() => vi.useRealTimers());
describe("GIS frontend: mocked SDK only, never proof of Google login", () => {
  it("initializes official button with server nonce and posts once, then refreshes CSRF/session visibility", async () => {
    const h = harness();
    try {
      expect(h.request).not.toHaveBeenCalled(); expect(GIS_SCRIPT).toBe("https://accounts.google.com/gsi/client");
      await h.controller.prepare("public-test-client", h.element);
      expect(h.initialize.mock.calls[0][0]).toMatchObject({ nonce: "synthetic-nonce-1", client_id: "public-test-client", auto_select: false });
      expect(h.renderButton).toHaveBeenCalledWith(h.element, { type: "standard", theme: "outline", size: "large", text: "signin_with" });
      const callback = h.initialize.mock.calls[0][0].callback;
      callback({ credential: "synthetic-id-token-not-real" }); callback({ credential: "must-not-be-sent" });
      await vi.waitFor(() => expect(h.onUser).toHaveBeenCalledTimes(1));
      expect(h.request.mock.calls.map(call => call[0])).toEqual(["/api/auth/csrf", "/api/auth/google/attempts", "/api/auth/google", "/api/auth/csrf"]);
      expect(h.changed).toHaveBeenCalledTimes(1); expect(h.states.mock.calls.at(-1)?.[0].phase).toBe("success");
      const posted = JSON.parse(h.request.mock.calls[2][1]!.body as string);
      expect(Object.keys(posted).sort()).toEqual(["attempt_id", "credential"]);
      expect(h.states.mock.calls.some(call => JSON.stringify(call).includes("synthetic-id-token"))).toBe(false);
    } finally { h.controller.dispose(); }
  });
  it.each([401, 409, 503])("failure%s clears callback; explicit retry creates fresh nonce without replay", async status => {
    const h = harness(status);
    try {
      await h.controller.prepare("public-test-client", h.element);
      const first = h.initialize.mock.calls[0][0].callback; first({ credential: "synthetic-first" });
      await vi.waitFor(() => expect(h.states.mock.calls.at(-1)?.[0].phase).toBe("error"));
      first({ credential: "never-replay" });
      await h.controller.prepare("public-test-client", h.element);
      expect(h.initialize.mock.calls[1][0].nonce).toBe("synthetic-nonce-2");
      expect(h.request.mock.calls.filter(call => call[0] === "/api/auth/google")).toHaveLength(1);
      expect(h.onUser).not.toHaveBeenCalled(); expect(JSON.stringify(h.states.mock.calls)).not.toContain("private verifier error");
    } finally { h.controller.dispose(); }
  });
  it("cancel/dispose ignores late SDK callbacks and disables concurrent prepares", async () => {
    const h = harness();
    await h.controller.prepare("public-test-client", h.element);
    await h.controller.prepare("public-test-client", h.element);
    expect(h.initialize).toHaveBeenCalledTimes(1);
    const late = h.initialize.mock.calls[0][0].callback;
    h.controller.cancel(); late({ credential: "never-send-after-cancel" }); h.controller.dispose();
    expect(h.request.mock.calls.filter(call => call[0] === "/api/auth/google")).toHaveLength(0);
    expect(h.onUser).not.toHaveBeenCalled(); expect(h.cancel).toHaveBeenCalled();
  });
  it("expires button without automatically issuing another attempt", async () => {
    vi.useFakeTimers(); const h = harness();
    try {
      await h.controller.prepare("public-test-client", h.element);
      await vi.advanceTimersByTimeAsync(300001);
      expect(h.states.mock.calls.at(-1)?.[0].phase).toBe("error");
      expect(h.request.mock.calls.filter(call => call[0] === "/api/auth/google/attempts")).toHaveLength(1);
    } finally { h.controller.dispose(); }
  });
  it("ignores a completed credential request after cancellation/unmount", async () => {
    const h = harness(); let finish: ((value: Response) => void) | undefined;
    h.request.mockImplementationOnce(async () => Response.json({ csrf_token: "synthetic" }))
      .mockImplementationOnce(async () => Response.json({ attempt_id: id, nonce: "synthetic", expires_at: new Date(now + 300000).toISOString() }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    await h.controller.prepare("public-test-client", h.element);
    h.initialize.mock.calls[0][0].callback({ credential: "synthetic-in-flight" });
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    h.controller.cancel(); h.controller.dispose(); finish!(Response.json({ id, email: null, auth_provider: "google", display_name: null }));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(h.onUser).not.toHaveBeenCalled(); expect(h.changed).not.toHaveBeenCalled();
    expect(h.request.mock.calls.filter(call => call[0] === "/api/auth/csrf")).toHaveLength(1);
  });
  it("public profile escapes text, preserves null email and strips authority/extras", () => {
    const user = publicUser({ id, email: null, auth_provider: "google", display_name: '<img src=x onerror="bad()">', roles: ["admin"], credential: "not-retained" });
    const html = renderToStaticMarkup(<AccountProfile user={user} />);
    expect(html).toContain("Email no disponible"); expect(html).toContain("&lt;img"); expect(html).not.toContain("<img");
    expect(html).toContain("Google"); expect(html).not.toMatch(/<input|<button|disabled/);
    expect(renderToStaticMarkup(<AccountProfile user={publicUser({ id, email: "synthetic@example.test" })} />)).not.toContain("Google");
    expect(user).not.toHaveProperty("roles"); expect(user).not.toHaveProperty("credential");
    // Cuentas locales: el nombre ahora es editable, así que se conserva; lo demás sigue sin pasar.
    expect(publicUser({ id, email: "synthetic@example.test", display_name: "Lu", roles: ["admin"] })).toEqual({ id, email: "synthetic@example.test", display_name: "Lu" });
    expect(publicUser({ id, email: "synthetic@example.test" })).toEqual({ id, email: "synthetic@example.test" });
    expect(googleError(429, "12")).toContain("12 segundos"); expect(googleError(429, "private arbitrary text")).not.toContain("private arbitrary text");
  });
});
