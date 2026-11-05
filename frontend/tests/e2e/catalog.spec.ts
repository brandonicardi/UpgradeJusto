import { expect, test } from "@playwright/test";
import type { CatalogPage } from "../../lib/catalog";
import { productName } from "../../lib/presentation";

const api = "http://127.0.0.1:8000/api/catalog/components";
test.use({ trace: "off", screenshot: "off", video: "off" });

test("raíz, filtros AND, paginación y detalle con evidencia real", async ({ page, request }) => {
  const response = await request.get(`${api}?page_size=50`);
  expect(response.ok()).toBeTruthy();
  const data: CatalogPage = await response.json();
  expect(data.total).toBeGreaterThan(0);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiero mejorar mi PC");
  await page.getByRole("main").getByRole("link", { name: "Explorar el catálogo", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo de componentes");
  await expect(page.locator(".results-count")).toContainText("Datos curados del catálogo");
  await expect(page.locator(".results-count")).not.toContainText(data.dataset_version);
  await page.getByLabel("Por página").selectOption("6");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator("article[data-component-id]")).toHaveCount(6);
  await page.getByRole("link", { name: "Página siguiente" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("article[data-component-id]")).toHaveCount(6);

  const piece = data.items.find(item => item.prices.length > 0)!;
  expect(piece).toBeTruthy();
  await page.getByLabel("Nombre", { exact: true }).fill(piece.name);
  await page.getByLabel("Categoría", { exact: true }).selectOption(piece.category);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  const filtered = await request.get(`${api}?category=${piece.category}&q=${encodeURIComponent(piece.name)}&page_size=6`);
  const expected: CatalogPage = await filtered.json();
  await expect(page.locator("article[data-component-id]")).toHaveCount(expected.items.length);
  await expect(page).not.toHaveURL(/page=2/);
  await page.locator("article[data-component-id]").getByRole("link", { name: piece.name, exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: piece.name })).toHaveText(productName(piece.name).title);
  await page.getByText("Identificación y versión del catálogo", { exact: true }).click();
  await expect(page.getByText(`Versión técnica del dataset: ${data.dataset_version}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Ilustración de categoría:/ })).toBeVisible();
  await page.getByText("Precios históricos y procedencia", { exact: true }).click();
  await page.getByText("Fuentes, licencias y revisiones", { exact: true }).click();
  for (const price of piece.prices) {
    await expect(page.getByText(`${price.amount} ${price.currency}`, { exact: true })).toBeVisible();
    await expect(page.locator(`time[datetime="${price.date}"]`).first()).toBeVisible();
    await expect(page.getByText(`Procedencia: ${price.source}`, { exact: true }).first()).toBeVisible();
  }
  for (const source of piece.sources) await expect(page.getByRole("link", { name: `${source.id} — ${source.url}`, exact: false }).first()).toBeVisible();

  const unknown = data.items.find(item => Object.values(item.attributes).includes(null));
  expect(unknown, "Dataset debe exponer desconocidos documentados").toBeTruthy();
  await page.goto(`/catalog/${unknown!.id}`);
  await page.getByText("Atributos documentados completos", { exact: true }).click();
  await expect(page.getByText("Desconocido (sin evidencia documentada)", { exact: true }).first()).toBeVisible();
  const unpriced = data.items.find(item => !item.prices.length);
  expect(unpriced).toBeTruthy();
  await page.goto(`/catalog/${unpriced!.id}`);
  await expect(page.getByRole("region", { name: "Resumen del componente", exact: true }).getByText("Precio desconocido: sin precio documentado.", { exact: true })).toBeVisible();
});

test("vacío, página fuera de rango y errores accesibles sin mocks", async ({ page }) => {
  await page.goto("/catalog?q=zzzzsinresultados31b");
  await expect(page.locator(".results-count")).toContainText("0 componentes");
  await expect(page.getByRole("heading", { name: "No encontramos piezas con esos filtros" })).toBeVisible();
  await page.goto("/catalog?page=10000");
  await expect(page.locator("article[data-component-id]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No hay piezas para mostrar" })).toBeVisible();
  await page.getByRole("link", { name: "Ir a la primera página" }).click();
  await expect(page.locator("article[data-component-id]")).toHaveCount(12);
  await page.goto("/catalog?category=invalid");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Revisá los filtros");
  await page.goto("/catalog/no-existe-sprint31b");
  await expect(page.getByRole("heading", { name: "Componente no encontrado" })).toBeVisible();
});
