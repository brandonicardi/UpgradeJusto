import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { safeSource, type CatalogPage } from "../../lib/catalog";
import { displayRetailDate, formatRetailARS } from "../../lib/retail-presentation";

const api = "http://127.0.0.1:8000/api/catalog/components";
test.use({ trace: "off", screenshot: "off", video: "off" });

test("raíz, filtros AND, paginación y detalle con evidencia real", async ({ page, request }) => {
  const response = await request.get(`${api}?page_size=50`);
  expect(response.ok()).toBeTruthy();
  const data: CatalogPage = await response.json();
  expect(data.total).toBeGreaterThan(0);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu PC puede dar más.");
  await page.getByRole("main").getByRole("link", { name: "Explorar el catálogo", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Todos los componentes");
  await expect(page.locator(".results-count")).toContainText("componentes");
  await expect(page.locator(".results-count")).not.toContainText(data.dataset_version);
  await expect(page.locator("article[data-component-id]")).toHaveCount(12);
  await page.getByRole("link", { name: "Página siguiente" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("article[data-component-id]")).toHaveCount(12);

  const piece = data.items.find(item => item.prices.length > 0)!;
  expect(piece).toBeTruthy();
  await page.goto(`/catalog?category=${piece.category}`);
  await page.getByRole("searchbox", { name: "Buscar componentes" }).fill(piece.name);
  await page.getByRole("searchbox", { name: "Buscar componentes" }).press("Enter");
  const filtered = await request.get(`${api}?category=${piece.category}&q=${encodeURIComponent(piece.name)}&page_size=12`);
  const expected: CatalogPage = await filtered.json();
  await expect(page.locator("article[data-component-id]")).toHaveCount(expected.items.length);
  await expect(page).not.toHaveURL(/page=2/);
  await page.locator(`article[data-component-id="${piece.id}"] > a`).click();
  // La ficha muestra el nombre completo (con la variante), no el título recortado.
  await expect(page.getByRole("heading", { level: 1, name: piece.name, exact: true })).toHaveText(piece.name);
  // La ficha no tiene región con el id: se comprueba la dirección y que el encabezado de la ficha sea el de la pieza.
  await expect(page).toHaveURL(url => url.pathname === `/catalog/${encodeURIComponent(piece.id)}`);
  await expect(page.locator(".piece-hero").getByRole("heading", { level: 1 })).toHaveText(piece.name);
  const details = (name: string) => page.locator("details").filter({ has: page.getByText(name, { exact: true }) });
  await page.getByText("Versión del catálogo", { exact: true }).click();
  await expect(details("Versión del catálogo").getByText(data.dataset_version, { exact: true })).toBeVisible();
  // Foto real de la tienda o, sin foto, la ilustración de la categoría con su aviso.
  await expect(page.locator(".piece-hero .tower-product-photo").getByRole("img").first()).toBeVisible();
  await expectOffers(page, request, piece.id);
  await page.getByText("Procedencia y fuentes", { exact: true }).click();
  for (const source of piece.sources) {
    const safe = safeSource(source.url);
    const link = details("Procedencia y fuentes").getByRole("link", { name: source.id, exact: true }).first();
    if (safe) { await expect(link).toBeVisible(); await expect(link).toHaveAttribute("href", safe); }
    else await expect(details("Procedencia y fuentes").getByText(source.id, { exact: true }).first()).toBeVisible();
  }

  const unknown = data.items.find(item => Object.values(item.attributes).includes(null));
  expect(unknown, "Dataset debe exponer desconocidos documentados").toBeTruthy();
  await page.goto(`/catalog/${unknown!.id}`);
  await page.getByText("Atributos completos", { exact: true }).click();
  await expect(details("Atributos completos").getByText("Falta un dato", { exact: true }).first()).toBeVisible();
  const unpriced = data.items.find(item => !item.prices.length);
  expect(unpriced).toBeTruthy();
  await page.goto(`/catalog/${unpriced!.id}`);
  await expectOffers(page, request, unpriced!.id);
});

// «Dónde la vimos y a cuánto»: una fila por oferta en pesos que devuelve la API de la pieza; sin ofertas, el aviso «Sin precio».
async function expectOffers(page: Page, request: APIRequestContext, id: string) {
  const reply = await request.get(`${api}/${encodeURIComponent(id)}`);
  expect(reply.ok()).toBeTruthy();
  const detail: { offers?: { component_id: string; currency: string; store: string; amount: string | null; observed_at: string }[] } = await reply.json();
  const offers = (detail.offers ?? []).filter(offer => offer.component_id === id && offer.currency === "ARS");
  const section = page.locator("section.piece-block").filter({ has: page.getByRole("heading", { name: "Dónde la vimos y a cuánto", exact: true }) });
  await expect(section).toBeVisible();
  await expect(section.locator("tbody tr")).toHaveCount(offers.length);
  if (!offers.length) await expect(section.getByText("Sin precio. No tenemos ofertas publicadas todavía.", { exact: true })).toBeVisible();
  for (const [index, offer] of offers.entries()) {
    const cells = section.locator("tbody tr").nth(index).locator("td");
    await expect(cells.nth(0)).toContainText(offer.store === "compragamer" ? "Compra Gamer" : "Venex");
    await expect(cells.nth(1)).toHaveText(formatRetailARS(offer.amount));
    await expect(cells.nth(2)).toContainText(displayRetailDate(offer.observed_at));
  }
}

test("vacío, página fuera de rango y errores accesibles sin mocks", async ({ page }) => {
  await page.goto("/catalog?q=zzzzsinresultados31b");
  await expect(page.locator(".results-count")).toContainText("0 componentes");
  await expect(page.getByRole("heading", { name: "No encontramos componentes con esos filtros" })).toBeVisible();
  await page.goto("/catalog?page=10000");
  await expect(page.locator("article[data-component-id]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No hay componentes para mostrar" })).toBeVisible();
  await page.getByRole("link", { name: "Ir a la primera página" }).click();
  await expect(page.locator("article[data-component-id]")).toHaveCount(12);
  await page.goto("/catalog?category=invalid");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Revisá los filtros");
  await page.goto("/catalog/no-existe-sprint31b");
  await expect(page.getByRole("heading", { name: "Componente no encontrado" })).toBeVisible();
});
