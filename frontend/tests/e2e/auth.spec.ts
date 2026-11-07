import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { randomUUID } from "node:crypto";

// Real backend only. No artifacts capturing credential-bearing requests.
test.use({ trace: "off", screenshot: "off", video: "off" });

test("registro no autentica; login persiste en recarga y logout revoca", async ({ page }) => {
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(8000);
  const origin = "http://127.0.0.1:3000";
  const email = `ui-${randomUUID()}@example.test`;
  const password = randomUUID();
  let googlePosts = 0;
  page.on("request", request => {
    if (request.method() === "POST" && ["/api/auth/google", "/api/auth/google/attempts"].includes(new URL(request.url()).pathname)) googlePosts++;
  });
  // Use the browser cookie jar and same-origin proxy, never the backend port for auth.
  const sessionStatus = () => page.evaluate(async () => (await fetch("/api/auth/session", {
    credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(3000),
  })).status);
  const mutation = (action: string) => page.waitForResponse(response =>
    response.url() === `${origin}/api/auth/${action}` && response.request().method() === "POST");
  // Uncontrolled input: avoid fill(value) call logs exposing the password on failure.
  const passwordLabel = /^(Tu contraseña|Elegí una contraseña)$/;
  const enterPassword = () => page.getByLabel(passwordLabel).evaluate((field, value) => {
    if (!(field instanceof HTMLInputElement)) throw new Error("Campo de contraseña no disponible");
    field.value = value;
  }, password);
  await page.goto("/account");
  await expect(page).toHaveURL(`${origin}/account`);
  // Fail on the actual gateway readiness status, not a later POST that CSRF prevents.
  const csrfStatus = await page.evaluate(async () => (await fetch("/api/auth/csrf", {
    credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(3000),
  })).status);
  expect(csrfStatus).toBe(200);
  // Missing CSRF must fail even when the browser supplies its legitimate Origin.
  const forbidden = await page.evaluate(async () => (await fetch("/api/auth/logout", {
    method: "POST", credentials: "same-origin", signal: AbortSignal.timeout(3000),
  })).status);
  expect(forbidden).toBe(403);
  // Teclado: la flecha derecha pasa de «Entrar» a «Crear cuenta» y muestra el registro.
  // Una contraseña escrita para entrar no puede pasar a la cuenta nueva al cambiar de pestaña.
  await page.getByLabel(passwordLabel).evaluate(field => {
    if (!(field instanceof HTMLInputElement)) throw new Error("Campo de contraseña no disponible");
    field.value = "texto-de-prueba";
  });
  await page.getByRole("tab", { name: "Entrar", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Crear cuenta", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel(passwordLabel)).toHaveValue("");
  await expect(page.getByRole("button", { name: "Crear mi cuenta", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Entrar", exact: true }).click();
  await page.getByRole("tab", { name: "Crear cuenta", exact: true }).click();
  await page.getByLabel("Tu correo", { exact: true }).fill(email);
  await enterPassword();
  const [registered] = await Promise.all([
    mutation("register"),
    page.getByRole("button", { name: "Crear mi cuenta", exact: true }).click(),
  ]);
  expect(registered.status()).toBe(201);
  expect(await registered.request().headerValue("origin")).toBe(origin);
  await expect(page.getByRole("status", { name: "Estado de cuenta", exact: true })).toContainText("Cuenta creada");
  expect(await sessionStatus()).toBe(401);
  await enterPassword();
  const [loggedIn] = await Promise.all([
    mutation("login"),
    page.getByRole("button", { name: "Entrar", exact: true }).click(),
  ]);
  expect(loggedIn.status()).toBe(200);
  expect(await loggedIn.request().headerValue("origin")).toBe(origin);
  await expect(page.getByRole("heading", { name: "Tus datos", exact: true })).toBeVisible();
  // The heading appears before the post-login CSRF refresh completes.
  await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeEnabled();
  // Check application errors, not framework announcements outside the main content.
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  expect(await sessionStatus()).toBe(200);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tus datos", exact: true })).toBeVisible();
  const [loggedOut] = await Promise.all([
    mutation("logout"),
    page.getByRole("button", { name: "Cerrar sesión", exact: true }).click(),
  ]);
  expect(loggedOut.status()).toBe(204);
  expect(await loggedOut.request().headerValue("origin")).toBe(origin);
  await expect(page.getByRole("status", { name: "Estado de cuenta", exact: true })).toContainText("Sesión cerrada en el servidor");
  expect(await sessionStatus()).toBe(401);
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Catálogo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Todos los componentes", exact: true })).toBeVisible();
  expect(googlePosts, "Local account flow must not issue Google attempts/credentials automatically").toBe(0);
});
