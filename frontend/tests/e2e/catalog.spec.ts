import { expect, test } from "@playwright/test";
import type { CatalogPage } from "../../lib/catalog";

const api = "http://127.0.0.1:8000/api/catalog/components";

test("raíz, filtros AND, paginación y detalle con evidencia real", async ({ page, request }) => {
  const response = await request.get(`${api}?page_size=50`);
  expect(response.ok()).toBeTruthy();
  const data: CatalogPage = await response.json();
  expect(data.total).toBe(14);
  await page.goto("/");
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo de componentes");
  await page.getByLabel("Por página").selectOption("6");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator("article")).toHaveCount(6);
  await page.getByRole("link", { name: "Página siguiente" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("article")).toHaveCount(6);

  const piece = data.items.find(item => item.prices.length > 0)!;
  expect(piece).toBeTruthy();
  await page.getByLabel("Nombre", { exact: true }).fill(piece.name);
  await page.getByLabel("Categoría", { exact: true }).selectOption(piece.category);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  const filtered = await request.get(`${api}?category=${piece.category}&q=${encodeURIComponent(piece.name)}&page_size=6`);
  const expected: CatalogPage = await filtered.json();
  await expect(page.locator("article")).toHaveCount(expected.items.length);
  await expect(page).not.toHaveURL(/page=2/);
  await page.getByRole("link", { name: piece.name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(piece.name);
  await expect(page.getByText("Imagen no disponible", { exact: true })).toBeVisible();
  for (const price of piece.prices) {
    await expect(page.getByText(`${price.amount} ${price.currency}`, { exact: true })).toBeVisible();
    await expect(page.locator(`time[datetime="${price.date}"]`).first()).toBeVisible();
    await expect(page.getByText(`Procedencia: ${price.source}`, { exact: true }).first()).toBeVisible();
  }
  for (const source of piece.sources) await expect(page.getByRole("link", { name: `${source.id} — ${source.url}`, exact: false }).first()).toBeVisible();

  const unknown = data.items.find(item => Object.values(item.attributes).includes(null));
  expect(unknown, "Dataset debe exponer desconocidos documentados").toBeTruthy();
  await page.goto(`/catalog/${unknown!.id}`);
  await expect(page.getByText("Desconocido (sin evidencia documentada)", { exact: true }).first()).toBeVisible();
  const unpriced = data.items.find(item => !item.prices.length);
  expect(unpriced).toBeTruthy();
  await page.goto(`/catalog/${unpriced!.id}`);
  await expect(page.getByText("Precio desconocido: sin precio documentado.")).toBeVisible();
});

test("vacío, página fuera de rango y errores accesibles sin mocks", async ({ page }) => {
  await page.goto("/catalog?q=zzzzsinresultados31b");
  await expect(page.getByRole("status")).toContainText("0 componentes");
  await expect(page.getByRole("heading", { name: "No hay componentes en esta página" })).toBeVisible();
  await page.goto("/catalog?page=10000");
  await expect(page.locator("article")).toHaveCount(0);
  await page.getByRole("link", { name: "Ir a la primera página" }).click();
  await expect(page.locator("article")).toHaveCount(12);
  await page.goto("/catalog?category=invalid");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Revisá los filtros");
  await page.goto("/catalog/no-existe-sprint31b");
  await expect(page.getByRole("heading", { name: "Componente no encontrado" })).toBeVisible();
});
