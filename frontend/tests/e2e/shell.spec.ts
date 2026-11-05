import { expect, test } from "@playwright/test";

test.describe("encabezado y navegación", () => {
  test("el enlace para saltar al contenido es lo primero que recibe el foco", async ({ page }) => {
    await page.goto("/pcs");
    await page.keyboard.press("Tab");
    const salto = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(salto).toBeFocused();
    await expect(salto).toHaveAttribute("href", "#contenido");
  });

  test("marca la página actual, con / como Mi PC", async ({ page }) => {
    await page.goto("/catalog");
    const principal = page.getByRole("navigation", { name: "Principal" });
    await expect(principal.getByRole("link", { name: "Catálogo" })).toHaveAttribute("aria-current", "page");
    await expect(principal.getByRole("link", { name: "Mi PC" })).not.toHaveAttribute("aria-current", "page");
    await page.goto("/");
    await expect(principal.getByRole("link", { name: "Mi PC" })).toHaveAttribute("aria-current", "page");
  });

  test("un plan compartido no tiene encabezado ni navegación", async ({ page }) => {
    await page.goto("/shared-tower-plans/algo");
    await expect(page.locator("main#contenido")).toBeVisible();
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator("nav")).toHaveCount(0);
  });

  test.describe("en celular", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("el menú se abre con el botón y Escape lo cierra devolviendo el foco", async ({ page }) => {
      await page.goto("/pcs");
      const menu = page.getByRole("button", { name: "Menú" });
      const secundaria = page.locator("#secundaria");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await expect(secundaria).toBeVisible();
      expect((await secundaria.boundingBox())?.height ?? 0).toBeGreaterThan(0);
      await page.getByRole("link", { name: "Tu cuenta" }).focus();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(menu).toBeFocused();
    });
  });
});
