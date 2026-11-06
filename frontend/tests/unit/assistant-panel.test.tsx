// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import AssistantPanel from "../../components/assistant-panel";
import { click, mount, unmountAll } from "./support/dom";

const state = vi.hoisted(() => ({ pathname: "/pcs", authenticated: true, sessionChecking: false, access: "ready" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("../../components/assistant-provider", () => ({ useAssistant: () => state }));
vi.mock("../../components/assistant-workspace", () => ({ default: () => <p>Charla de prueba</p> }));
afterEach(async () => { await unmountAll(); state.pathname = "/pcs"; state.authenticated = true; state.sessionChecking = false; });

it("ofrece el disparador solo con sesión confirmada y ruta permitida", async () => {
  for (const pathname of ["/admin", "/account", "/chat", "/shared-tower-plans/token"]) {
    state.pathname = pathname;
    expect((await mount(<AssistantPanel />)).querySelector("button")).toBeNull();
  }
  state.pathname = "/pcs"; state.authenticated = false;
  expect((await mount(<AssistantPanel />)).querySelector("button")).toBeNull();
  state.authenticated = true; state.sessionChecking = true;
  expect((await mount(<AssistantPanel />)).querySelector("button")).toBeNull();
  state.sessionChecking = false;
  expect((await mount(<AssistantPanel />)).textContent).toContain("¿Dudas?");
});

it("abre con foco en el panel y Escape devuelve el foco al disparador", async () => {
  const host = await mount(<AssistantPanel />), trigger = host.querySelector("button")!;
  await click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(document.activeElement).toBe(host.querySelector('[role="dialog"]'));
  await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
