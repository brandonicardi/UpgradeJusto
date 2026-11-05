// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import PCs from "../../app/pcs/pcs";
import { emptyTower, type Tower } from "../../lib/towers";
import { button, byText, click, mount, settle, unmountAll } from "./support/dom";

const pc: Tower = {
  ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", revision: 3, origin_schema: 2, name: "Mi torre de prueba",
  category_status: { ...emptyTower().category_status, storage: "present" },
  lines: [{ line_id: "22222222-2222-4222-8222-222222222222", category: "storage", component_id: null, declared_model: "SSD de prueba", quantity: 1 }],
};
function stubApi(items: Tower[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/towers?")) return Response.json({ items, total: items.length, page: 1, page_size: 20 });
    if (url === `/api/towers/${pc.id}`) return Response.json(pc);
    return Response.json({ detail: "no disponible" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

async function openPc() {
  stubApi([pc]);
  const host = await mount(createElement(PCs)); await settle();
  await click(button(host, pc.name));
  return host;
}

describe("Mi PC: interacción real", () => {
  it("sin PCs guardadas muestra el estado vacío, sin PC de ejemplo ni botón presionado", async () => {
    stubApi([]);
    const host = await mount(createElement(PCs)); await settle();
    const empty = host.querySelector('section[aria-label="Todavía no tenés PCs"]');
    expect(empty).not.toBeNull();
    expect(button(empty!, "Crear a mano")).not.toBeNull();
    expect(byText(empty!, "a", "Pegar una lista")?.getAttribute("href")).toBe("/pcs/import");
    expect(host.querySelector('[aria-pressed="true"]')).toBeNull();
    expect(host.querySelector("article")).toBeNull();
    expect(host.textContent).not.toContain("Mi torre de prueba");
  });
  it("«Cambiar Almacenamiento» abre el editor y lleva el foco a tower-status-storage", async () => {
    const host = await openPc();
    expect(host.querySelector('form[aria-label="Editor de PC"]')).toBeNull();
    await click(button(host, "Cambiar Almacenamiento"));
    expect(host.querySelector('form[aria-label="Editor de PC"]')).not.toBeNull();
    expect(document.activeElement?.id).toBe("tower-status-storage");
  });
  it("«Completar Procesador» sobre una categoría desconocida lleva el foco a tower-status-cpu", async () => {
    const host = await openPc();
    await click(button(host, "Completar Procesador"));
    expect(document.activeElement?.id).toBe("tower-status-cpu");
    expect((document.activeElement as HTMLSelectElement).value).toBe("unknown");
  });
  it("el editor abierto no tiene ningún campo de lugares M.2", async () => {
    const host = await openPc();
    await click(button(host, "Cambiar Almacenamiento"));
    const editor = host.querySelector('form[aria-label="Editor de PC"]')!;
    expect(editor.textContent).not.toMatch(/M\.2|\bm2\b/i);
    for (const field of Array.from(editor.querySelectorAll("input,select,textarea"))) {
      expect(`${field.getAttribute("name")} ${field.getAttribute("id")} ${field.getAttribute("aria-label")}`).not.toMatch(/M\.2|\bm2\b/i);
    }
  });
});
