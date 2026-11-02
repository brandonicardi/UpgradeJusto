import { expect } from "@playwright/test";
import { test } from "../e2e/fixtures";
import { ownRouteSession, routeEvidence } from "../support/route-evidence";
import { evidenceApi } from "../support/visual-evidence";
import { parseCatalogTowerPage, catalogBoundOffers } from "../../lib/catalog-tower-consumer";
import { displayImage, formatRetailARS, retailSourceURL } from "../../lib/retail-presentation";
import { emptyTower, towerUUID, type Tower } from "../../lib/towers";
import type { Conversation, PageOf, Message } from "../../lib/assistant";
import type { AdminPage, Revision } from "../../lib/curation";
import { assertRouteAdminTestEnvironment, bootstrapOwnRouteAdmin } from "../support/route-test-admin";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const width of [1440, 390]) {
  test(`@v0-routes catálogo AFTER listado9 y detalle real ${width}`, async ({ newImageEvidenceContext }) => {
    await routeEvidence(await newImageEvidenceContext(), width, "catalog", async ({ page, phase, shot }) => {
      phase("catalog-list"); await page.goto("/catalog");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catálogo de componentes");
      await expect(page.getByRole("combobox", { name: "Categoría", exact: true }).locator('option:not([value=""])')).toHaveCount(9);
      await expect(page.getByRole("complementary", { name: "Ficha de la pieza seleccionada", exact: true })).toBeVisible();
      await shot("01-catalog-shell.png", page.locator("body"), true);
      phase("catalog-explicit-server-order"); await expect(page.getByRole("combobox", { name: "Orden", exact: true })).toHaveValue("retail_first");
      const response = await evidenceApi(page, "/api/catalog/components?page=1&page_size=12&sort=retail_first"); expect(response.status).toBe(200);
      const data = parseCatalogTowerPage(response.data);
      const candidate = data.items.find(part => displayImage(part) !== null && catalogBoundOffers(part).some(offer => offer.amount !== null && retailSourceURL(offer.source_url) !== null));
      expect(Boolean(candidate)).toBe(true); if (!candidate) throw new Error("catalog_prerequisite");
      phase("catalog-real-row");
      const row = page.locator("article[data-component-id]").filter({ has: page.locator(`a[href="/catalog/${candidate.id}"]`) });
      await expect(row.getByRole("heading", { level: 2 })).toHaveText(candidate.name);
      await row.scrollIntoViewIfNeeded();
      await expect.poll(() => row.locator(".tower-product-photo img").evaluateAll(images => images.some(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)), { timeout: 5000 }).toBe(true);
      await shot("02-catalog-real-row.png", row);
      phase("catalog-detail"); await row.getByRole("link", { name: candidate.name, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(candidate.name);
      await shot("03-detail-shell.png", page.locator("body"), true);
      const summary = page.getByRole("region", { name: "Resumen del componente", exact: true });
      await summary.scrollIntoViewIfNeeded();
      await expect.poll(() => summary.locator(".tower-product-photo img").evaluateAll(images => images.some(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)), { timeout: 5000 }).toBe(true);
      for (const offer of catalogBoundOffers(candidate)) {
        await expect(summary).toContainText(offer.amount === null ? "Importe desconocido" : formatRetailARS(offer.amount));
      }
      await expect(summary.locator("[data-retail-offer]")).toHaveCount(catalogBoundOffers(candidate).length);
      await shot("04-detail-photo-offers.png", summary);
    });
  });

  test(`@v0-routes cuenta propia PCs editor CU02 entrada sin proveedor ${width}`, async ({ newImageEvidenceContext }) => {
    await routeEvidence(await newImageEvidenceContext(), width, "account-pcs-import", async ({ page, phase, cleanup, shot }) => {
      phase("own-session"); await ownRouteSession(page);
      await page.goto("/account"); await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
      await shot("01-account-own-shell.png", page.locator("body"), true);
      phase("own-pc-fixture"); const input = emptyTower(); input.name = "Configuración propia de evidencia";
      const created = await evidenceApi(page, "/api/towers", "POST", input); expect(created.status).toBe(201); const own = created.data as Tower; expect(towerUUID.test(own.id)).toBe(true);
      cleanup(async () => { expect((await evidenceApi(page, `/api/towers/${own.id}`, "DELETE")).status).toBe(204); });
      phase("pc-list"); await page.goto("/pcs"); await expect(page.getByRole("button", { name: input.name, exact: true })).toBeEnabled();
      await shot("02-pcs-list-shell.png", page.locator("body"), true);
      await page.getByRole("button", { name: input.name, exact: true }).click(); await page.getByRole("button", { name: "Editar PC", exact: true }).click();
      const editor = page.getByRole("form", { name: "Editor de PC", exact: true });
      phase("pc-editor"); await expect(editor.getByLabel("Estado de Memoria RAM", { exact: true })).toHaveValue("unknown");
      await shot("03-pc-editor.png", editor); await shot("04-pc-editor-ram.png", editor.getByLabel("Estado de Memoria RAM", { exact: true }));
      phase("import-input-only"); await page.goto("/pcs/import");
      const form = page.getByRole("form", { name: "Extraer torre desde texto", exact: true }); await expect(form).toBeVisible();
      await form.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true }).fill("PC de evidencia propia. Modelo y cantidades por confirmar.");
      await expect(page.getByRole("form", { name: "Propuesta editable de torre", exact: true })).toHaveCount(0);
      await shot("05-cu02-input-no-provider.png", page.getByRole("heading", { level: 1 }));
    });
  });

  test(`@v0-routes chat historial propio vacío y contexto sin LIVE ${width}`, async ({ newImageEvidenceContext }) => {
    await routeEvidence(await newImageEvidenceContext(), width, "chat-empty", async ({ page, phase, cleanup, shot }) => {
      phase("own-session"); await ownRouteSession(page);
      const input = emptyTower(); input.name = "Torre propia para contexto";
      const created = await evidenceApi(page, "/api/towers", "POST", input); expect(created.status).toBe(201); const own = created.data as Tower; expect(towerUUID.test(own.id)).toBe(true);
      cleanup(async () => { expect((await evidenceApi(page, `/api/towers/${own.id}`, "DELETE")).status).toBe(204); });
      const reply = await evidenceApi(page, "/api/conversations", "POST", { title: "Conversación propia sin mensajes" }); expect(reply.status).toBe(201); const conversation = reply.data as Conversation; expect(towerUUID.test(conversation.id)).toBe(true);
      cleanup(async () => { expect((await evidenceApi(page, `/api/conversations/${conversation.id}`, "DELETE")).status).toBe(204); });
      phase("chat-shell"); await page.goto("/chat"); await expect(page.getByRole("button", { name: conversation.title, exact: true })).toBeEnabled();
      await shot("01-chat-shell.png", page.locator("body"), true);
      await page.getByRole("button", { name: conversation.title, exact: true }).click();
      const history = page.getByRole("region", { name: "Historial persistido", exact: true }); await expect(history).toBeVisible();
      phase("empty-persisted-history"); const messages = await evidenceApi(page, `/api/conversations/${conversation.id}/messages?page=1&page_size=20`); expect(messages.status).toBe(200); expect((messages.data as PageOf<Message>).total).toBe(0);
      await expect(history.locator("ol > li")).toHaveCount(0); await shot("02-chat-history-empty.png", history);
      phase("own-context"); const context = page.getByRole("region", { name: "Contexto de torre por turno", exact: true });
      await expect(context.getByRole("combobox", { name: "Torre propia para este turno", exact: true }).locator(`option[value="${own.id}"]`)).toHaveCount(1);
      await context.getByRole("combobox", { name: "Torre propia para este turno", exact: true }).selectOption(own.id);
      await expect(context.getByRole("region", { name: "Torre seleccionada para este turno", exact: true })).toBeVisible();
      await shot("03-chat-context-own.png", context);
    });
  });

  test(`@v0-routes admin rol servidor existente solo lectura ${width}`, async ({ newImageEvidenceContext }) => {
    await routeEvidence(await newImageEvidenceContext(), width, "admin-readonly", async ({ page, phase, shot }) => {
      phase("own-admin-exact-test-guard"); assertRouteAdminTestEnvironment();
      const credentials = await ownRouteSession(page); bootstrapOwnRouteAdmin(credentials.email);
      expect((await evidenceApi(page, "/api/auth/login", "POST", credentials)).status).toBe(200);
      phase("server-role-and-active-pagination"); let active: Revision | undefined;
      for (let offset = 0; ; offset += 100) {
        const reply = await evidenceApi(page, `/api/admin/revisions?limit=100&offset=${offset}`); expect(reply.status).toBe(200);
        const data = reply.data as AdminPage<Revision>; active = data.items.find(item => item.active && item.status === "published");
        if (active || offset + data.limit >= data.total) break;
      }
      expect(Boolean(active)).toBe(true); if (!active) throw new Error("active_revision_required");
      await page.goto("/admin"); const revisions = page.getByRole("region", { name: "Revisiones del catálogo", exact: true }); await expect(revisions).toBeVisible();
      phase("admin-shell"); await shot("01-admin-shell.png", page.locator("body"), true);
      phase("admin-ui-pagination"); const target = revisions.locator(`button[data-revision-id="${active.id}"]`);
      while (!await target.count()) {
        const next = revisions.getByRole("button", { name: "Más revisiones", exact: true }); await expect(next).toBeEnabled();
        const response = page.waitForResponse(reply => new URL(reply.url()).pathname === "/api/admin/revisions" && reply.request().method() === "GET"); void response.catch(() => undefined);
        await next.click(); expect((await response).status()).toBe(200); await expect(page.getByRole("button", { name: "Consultar revisiones", exact: true })).toBeEnabled();
      }
      await target.click(); const detail = page.getByRole("region", { name: "Detalle de revisión", exact: true });
      await expect(detail).toContainText("Solo lectura"); await expect(detail.getByRole("combobox", { name: "Colección", exact: true })).toBeEnabled();
      await shot("02-admin-active-readonly.png", detail);
    });
  });
}
