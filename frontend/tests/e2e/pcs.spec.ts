import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { randomUUID } from "node:crypto";
import type { CatalogPage } from "../../lib/catalog";
import type { PC, PCInput } from "../../lib/pcs";
import type { Tower, TowerInput } from "../../lib/towers";

test.use({ trace: "off", screenshot: "off", video: "off" });

async function authenticate(page: Page) {
  await page.goto("/account");
  const statuses = await page.evaluate(async credentials => {
    const csrf = async () => (await (await fetch("/api/auth/csrf", { cache: "no-store" })).json()).csrf_token as string;
    const token = await csrf();
    const registered = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(credentials) });
    const loggedIn = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(credentials) });
    const refreshed = await fetch("/api/auth/csrf", { cache: "no-store" });
    return [registered.status, loggedIn.status, refreshed.status];
  }, { email: `pcs-${randomUUID()}@example.test`, password: randomUUID() });
  expect(statuses).toEqual([201, 200, 200]);
}

async function api(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const response = await fetch("/api/auth/csrf", { cache: "no-store" });
      const token = await response.json();
      headers["X-CSRF-Token"] = token.csrf_token;
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/pcs${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(15000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

async function towerApi(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const response = await fetch("/api/auth/csrf", { cache: "no-store" });
      const token = await response.json();
      headers["X-CSRF-Token"] = token.csrf_token;
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/towers${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(15000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

test("CU03 CRUD real, revisión, contexto null y aislamiento de dos propietarios", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const contextA = await newIsolatedContext(), contextB = await newIsolatedContext();
  const a = await contextA.newPage(), b = await contextB.newPage();
  a.setDefaultTimeout(15000); b.setDefaultTimeout(15000);
  a.setDefaultNavigationTimeout(15000); b.setDefaultNavigationTimeout(15000);
  let ownId: string | null = null;
  let failed = false;
  try {
    await authenticate(a); await authenticate(b);
    // Este recorrido protege el flujo histórico de seis categorías (/pcs/legacy);
    // /pcs es el editor de torre y lo cubre towers38.spec.ts.
    await a.goto("/pcs/legacy"); await b.goto("/pcs/legacy");
    // El servidor de desarrollo hidrata después del primer render: esperar la lista real, no el esqueleto.
    await expect(a.getByRole("region", { name: "Lista de PCs", exact: true })).toContainText("No hay PCs guardadas", { timeout: 20000 });
    await expect(b.getByRole("region", { name: "Lista de PCs", exact: true })).toContainText("No hay PCs guardadas", { timeout: 20000 });
    // Public catalog reference fetch is Node-side, not a browser proxy escape.
    const refs = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=50");
    expect(refs.status).toBe(200);
    const catalog: CatalogPage = await refs.json();
    const ram = catalog.items.find(item => item.category === "ram");
    if (!ram) throw new Error("El catálogo real no ofrece referencia RAM para este recorrido");
    const name = `PC propia ${randomUUID()}`;
    await a.getByText("Gestionar mis configuraciones", { exact: true }).click();
    await a.getByRole("button", { name: "Nueva PC", exact: true }).click();
    await a.getByLabel("Nombre de PC", { exact: true }).fill(name);
    await a.getByLabel("Memoria RAM", { exact: true }).selectOption(ram.id);
    await a.getByLabel("Cantidad de módulos RAM idénticos", { exact: true }).fill("2");
    const createdResponse = a.waitForResponse(response => response.url() === "http://127.0.0.1:3000/api/pcs" && response.request().method() === "POST", { timeout: 15000 });
    await a.getByRole("button", { name: "Guardar PC", exact: true }).click();
    const created = await createdResponse;
    expect(created.status()).toBe(201);
    const initial: PC = await created.json(); ownId = initial.id;
    expect(initial.revision).toBe(1); expect(initial.context.notes).toBeNull();
    expect(initial.components).toEqual([{ category: "ram", component_id: ram.id, quantity: 2 }]);
    await expect(a.getByRole("region", { name: "Detalle de PC" })).toBeVisible();
    await a.reload();
    await expect(a.getByRole("button", { name, exact: true })).toBeVisible({ timeout: 20000 });
    await a.getByRole("button", { name, exact: true }).click();
    await a.getByText("Más opciones", { exact: true }).click();
    await expect(a.getByText("Sin notas declaradas", { exact: true })).toBeVisible();
    await a.getByRole("button", { name: "Editar PC", exact: true }).click();
    await a.getByLabel("Cantidad de módulos RAM idénticos", { exact: true }).fill("3");
    await a.getByLabel("Notas declaradas", { exact: true }).fill("Contexto parcial declarado, sin evaluación");
    await a.getByRole("button", { name: "Guardar PC", exact: true }).click();
    await a.getByText("Más opciones", { exact: true }).click();
    await expect(a.getByRole("region", { name: "Detalle de PC" }).getByText("Revisión 2", { exact: true })).toBeVisible();
    const currentReply = await api(a, `/${ownId}`); expect(currentReply.status).toBe(200);
    const current = currentReply.data as PC;
    expect(current.context.bios_version).toBeNull(); expect(current.components[0].quantity).toBe(3);
    const replacement: PCInput = { name, components: [], context: { bios_version: null, notes: null } };
    expect((await api(a, `/${ownId}`, "PUT", { ...replacement, revision: 1 })).status).toBe(409);

    // Foreign ID operations must not disclose existence or mutate A, even with valid B CSRF.
    for (const method of ["GET", "PUT", "DELETE"]) {
      expect((await api(b, `/${ownId}`, method, method === "PUT" ? { ...replacement, revision: current.revision } : undefined)).status).toBe(404);
    }
    const owner = await a.evaluate(async () => (await (await fetch("/api/auth/session", { cache: "no-store" })).json()).id as string);
    expect((await api(b, "", "POST", { ...replacement, owner_id: owner })).status).toBe(422);
    const listB = await api(b, "?page=1&page_size=20");
    expect(listB.status).toBe(200); expect((listB.data as { total: number }).total).toBe(0);
    expect((await api(a, `/${ownId}`)).data).toEqual(current);

    // A valid full replacement removes the entire RAM group and preserves explicit nulls.
    const replaced = await api(a, `/${ownId}`, "PUT", { ...replacement, revision: current.revision });
    expect(replaced.status).toBe(200); expect((replaced.data as PC).components).toEqual([]);
    await a.getByRole("button", { name: "Recargar detalle", exact: true }).click();
    await expect(a.getByRole("region", { name: "Detalle de PC", exact: true }).getByText("Sin componente declarado", { exact: true })).toHaveCount(6);
    await a.getByRole("button", { name: "Preparar borrado", exact: true }).click();
    expect((await api(a, `/${ownId}`)).status).toBe(200);
    await a.getByLabel("Confirmo eliminar esta PC", { exact: true }).check();
    await a.getByRole("button", { name: "Eliminar definitivamente", exact: true }).click();
    await expect(a.getByRole("status", { name: "Estado de PCs", exact: true })).toContainText("PC eliminada del servidor");
    expect((await api(a, `/${ownId}`)).status).toBe(404); ownId = null;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    // Only the PC created by this test, never shared accounts/catalog/admin endpoints.
    try {
      if (ownId) {
        const cleanup = await api(a, `/${ownId}`, "DELETE");
        if (![204, 404].includes(cleanup.status) && !failed) throw new Error("Own PC cleanup failed");
      }
    } catch (error) { if (!failed) throw error; }
    finally { await Promise.allSettled([contextA.close(), contextB.close()]); }
  }
});

test("CU03 Mi PC: no pide BIOS, guarda y persiste el estado de armado y la placa no queda incompleta por BIOS", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const context = await newIsolatedContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(15000);
  let id: string | null = null;
  let failed = false;
  try {
    await authenticate(page);
    await page.goto("/pcs");
    await expect(page.getByRole("region", { name: "Todavía no tenés PCs", exact: true })).toBeVisible({ timeout: 20000 });
    // La pantalla de Mi PC no pide BIOS en ningún lado.
    await expect(page.getByLabel(/BIOS/i)).toHaveCount(0);

    const name = `PC propia ${randomUUID()}`;
    await page.getByRole("button", { name: "Crear a mano", exact: true }).click();
    await page.getByLabel("¿Cómo le decimos a esta PC?", { exact: true }).fill(name);
    await page.getByLabel("¿Esta PC ya está armada y funcionando?", { exact: true }).selectOption("assembled");
    await expect(page.getByLabel(/BIOS/i)).toHaveCount(0);
    const createdResponse = page.waitForResponse(response => response.url() === "http://127.0.0.1:3000/api/towers" && response.request().method() === "POST", { timeout: 15000 });
    await page.getByRole("button", { name: "Guardar mi PC", exact: true }).click();
    const created = await createdResponse; expect(created.status()).toBe(201);
    const sent = created.request().postDataJSON() as TowerInput;
    expect(sent.context.assembly_state).toBe("assembled");
    expect(sent.context.bios_version).toBeNull();
    expect(sent).not.toHaveProperty("user_id");
    const initial = await created.json() as Tower; id = initial.id;
    expect(initial.revision).toBe(1);
    expect(initial.context.assembly_state).toBe("assembled");

    // El estado de armado se guarda como declaración explícita y sigue ahí al recargar.
    await page.reload();
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name, exact: true }).click();
    const selector = page.getByLabel("¿Esta PC ya está armada y funcionando?", { exact: true });
    await expect(selector).toHaveValue("assembled", { timeout: 20000 });

    await selector.selectOption("new");
    const updatedResponse = page.waitForResponse(response => response.url().endsWith(`/api/towers/${id}`) && response.request().method() === "PUT", { timeout: 15000 });
    await page.getByRole("button", { name: "Guardar estado", exact: true }).click();
    const updated = await updatedResponse; expect(updated.status()).toBe(200);
    const updateSent = updated.request().postDataJSON() as TowerInput & { revision: number };
    expect(updateSent.context.assembly_state).toBe("new");
    expect(updateSent).not.toHaveProperty("user_id");
    await page.reload();
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByLabel("¿Esta PC ya está armada y funcionando?", { exact: true })).toHaveValue("new", { timeout: 20000 });

    // Una placa real identificada no queda «incompleta» por BIOS: el dato no existe en la interfaz.
    const refs = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=50");
    expect(refs.status).toBe(200);
    const catalog: CatalogPage = await refs.json();
    const board = catalog.items.find(item => item.category === "motherboard");
    if (!board) throw new Error("El catálogo real no ofrece una placa madre para este recorrido");
    const currentReply = await towerApi(page, `/${id}`); expect(currentReply.status).toBe(200);
    const current = currentReply.data as Tower;
    const body: TowerInput & { revision: number } = {
      schema_version: 2,
      name: current.name,
      category_status: { ...current.category_status, motherboard: "present" },
      lines: [{ line_id: null, category: "motherboard", component_id: board.id, declared_model: null, quantity: 1 }],
      context: { bios_version: current.context.bios_version, notes: current.context.notes, assembly_state: current.context.assembly_state ?? null },
      revision: current.revision,
    };
    const replaced = await towerApi(page, `/${id}`, "PUT", body);
    expect(replaced.status).toBe(200);
    await page.reload();
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name, exact: true }).click();
    const boardCard = page.locator('article[aria-label="Placa madre"]');
    await expect(boardCard).toContainText(board.name, { timeout: 20000 });
    await expect(boardCard).not.toContainText(/BIOS/i);
    // Identificada por el catálogo: completa o a la espera de datos técnicos, nunca vacía por BIOS.
    await expect(boardCard).toHaveAttribute("data-estado", /completa|sin_datos/, { timeout: 20000 });
    await boardCard.getByRole("button").last().click();
    const editor = page.locator("form.pcs-editor");
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel(/BIOS/i)).toHaveCount(0);
    await expect(editor).not.toContainText(/\bBIOS\b/i);
    await editor.getByRole("button", { name: "Cerrar", exact: true }).click();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      if (id) {
        const cleanup = await towerApi(page, `/${id}`, "DELETE");
        if (![204, 404].includes(cleanup.status) && !failed) throw new Error("Own tower cleanup failed");
      }
    } catch (error) { if (!failed) throw error; }
    finally { await context.close(); }
  }
});
