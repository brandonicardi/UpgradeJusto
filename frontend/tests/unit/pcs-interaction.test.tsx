// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import PCs from "../../app/pcs/pcs";
import { emptyTower, type Tower } from "../../lib/towers";
import { button, byLabel, byText, click, mount, settle, type, unmountAll } from "./support/dom";

const pc: Tower = {
  ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", revision: 3, origin_schema: 2, name: "Mi torre de prueba",
  category_status: { ...emptyTower().category_status, storage: "present", motherboard: "present" },
  // Una BIOS guardada antes de la nueva política: se conserva, pero nunca se pide ni se muestra como aprobación.
  context: { bios_version: "P1.20", notes: null, assembly_state: null },
  lines: [
    { line_id: "22222222-2222-4222-8222-222222222222", category: "storage", component_id: null, declared_model: "SSD de prueba", quantity: 1 },
    { line_id: "33333333-3333-4333-8333-333333333333", category: "motherboard", component_id: null, declared_model: "Placa de prueba", quantity: 1 },
  ],
};
const evaluacionBase = { verdict: "incompatible", rule_results: [{ rule_id: "T01", family: "cpu", state: "unknown", facts: [], evidence: [], conditions: [], missing_fields: ["cpu_support"] }, { rule_id: "T02", family: "ram", state: "pass", facts: [], evidence: [], conditions: [], missing_fields: [] }, { rule_id: "T04", family: "gpu", state: "fail", facts: [], evidence: [], conditions: [], missing_fields: [] }, { rule_id: "T11", family: "T11", state: "unknown", facts: [], evidence: [], conditions: [], missing_fields: ["case.presence"] }], rules_version: "cu05-tower-essential-engine-2", scope: { id: "cu05-tower-essential-2" } };
function stubApi(items: Tower[], extra: { evaluacion?: object; catalogo?: Record<string, object> } = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.startsWith("/api/towers?")) return Response.json({ items, total: items.length, page: 1, page_size: 20 });
    if (url === "/api/auth/csrf") return Response.json({ csrf_token: "token-de-prueba" });
    if (url === `/api/towers/${pc.id}/evaluate`) return Response.json(extra.evaluacion ?? evaluacionBase);
    if (url === "/api/towers" && init?.method === "POST") return Response.json({ ...JSON.parse(String(init.body)), id: pc.id, revision: 1, origin_schema: 2 }, { status: 201 });
    if (url === `/api/towers/${pc.id}` && init?.method === "PUT") return Response.json({ ...JSON.parse(String(init.body)), id: pc.id, revision: 4, origin_schema: 2 });
    if (url.startsWith("/api/catalog/components/")) {
      const id = decodeURIComponent(url.slice("/api/catalog/components/".length)), parte = extra.catalogo?.[id];
      return parte ? Response.json(parte) : Response.json({ detail: "no disponible" }, { status: 404 });
    }
    return Response.json({ detail: "no disponible" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

async function openPc(items: Tower[] = [pc], extra: { evaluacion?: object; catalogo?: Record<string, object> } = {}) {
  const api = stubApi(items, extra);
  const host = await mount(createElement(PCs)); await settle(); await settle(); await settle();
  return { host, api };
}
const editorForm = (host: HTMLElement) => host.querySelector("form.pcs-editor") as HTMLFormElement | null;

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
  it("con PCs guardadas abre la primera y muestra las nueve piezas con su estado", async () => {
    const { host } = await openPc();
    expect(host.querySelector("h1")?.textContent).toBe("Mi torre de prueba");
    expect(host.querySelectorAll("article.pcs-part")).toHaveLength(9);
    expect(host.querySelector('article[aria-label="Almacenamiento"]')?.getAttribute("data-estado")).toBe("revisar");
    expect(host.querySelector('article[aria-label="Procesador"]')?.getAttribute("data-estado")).toBe("vacia");
    expect(host.querySelector(".pcs-complete")?.textContent).toContain("2 de 7 piezas esenciales");
    expect(host.querySelector(".pcs-complete")?.textContent).toContain("Refrigeración y ventiladores: opcionales");
    expect(host.textContent).not.toMatch(/snapshot|revisión|schema|scope|coverage|PASS/i);
  });
  it("«¿Encaja todo entre sí?» muestra todas las reglas emitidas, con T11, su causa y sin decidir nada en pantalla", async () => {
    const { host } = await openPc();
    const filas = Array.from(host.querySelectorAll(".pcs-status-list li")).map(li => ({
      texto: li.querySelector(".pcs-status-label > span")?.textContent,
      motivo: li.querySelector(".pcs-status-why")?.textContent ?? null,
      estado: (li.lastElementChild as HTMLElement | null)?.textContent,
    }));
    expect(filas).toEqual([
      { texto: "Procesador y placa madre", motivo: "faltan datos de compatibilidad del procesador con la placa", estado: "Falta un dato" },
      { texto: "Memoria y placa madre", motivo: null, estado: "Encaja" },
      { texto: "Placa de video y gabinete", motivo: null, estado: "No encaja" },
      { texto: "Identificación y presencia", motivo: "no se identificó el gabinete", estado: "Falta un dato" },
    ]);
    expect(host.textContent).toContain("Hay piezas que no encajan entre sí");
  });
  it("una comprobación no evaluada se muestra «No evaluado» con la razón del servidor, nunca como aprobada", async () => {
    const evaluacion = { verdict: "requiere_verificacion", rule_results: [{ rule_id: "T01", family: "T01", state: "unknown", facts: [], evidence: [], conditions: [], missing_fields: ["cpu_support"] }, { rule_id: "T04", family: "T04", state: "not_applicable", facts: [], evidence: [], conditions: ["Espacio físico no evaluado: faltan medidas. Chequeá que entre en tu gabinete."], missing_fields: [] }], rules_version: "cu05-tower-essential-engine-2", scope: { id: "cu05-tower-essential-2" } };
    const { host } = await openPc([pc], { evaluacion });
    const fila = Array.from(host.querySelectorAll(".pcs-status-list li")).find(li => li.textContent?.includes("Placa de video y gabinete"))!;
    expect(fila.textContent).toContain("No evaluado");
    expect(fila.textContent).not.toContain("Encaja");
    expect(fila.textContent).toContain("Espacio físico no evaluado");
    expect(host.textContent).toContain("Chequeá que entre en tu gabinete");
    expect(host.textContent).toContain("Faltan datos técnicos del catálogo");
    expect(host.textContent).not.toContain("no encajan");
  });
  it("una pieza identificada sin datos técnicos dice por qué y no ofrece «Completar»", async () => {
    const conCatalogo: Tower = { ...pc, category_status: { ...pc.category_status, cpu: "present" }, lines: [...pc.lines, { line_id: "44444444-4444-4444-8444-444444444444", category: "cpu", component_id: "cg-1", declared_model: null, quantity: 1 }] };
    const { host } = await openPc([conCatalogo], { catalogo: { "cg-1": { id: "cg-1", category: "cpu", name: "Ryzen 7 5700G", attributes: {} } } });
    const tarjeta = host.querySelector('article[aria-label="Procesador"]')!;
    expect(tarjeta.getAttribute("data-estado")).toBe("sin_datos");
    expect(tarjeta.textContent).toContain("El catálogo todavía no tiene los datos técnicos de esta pieza");
    expect(button(tarjeta, "Ver por qué procesador")).not.toBeNull();
    expect(button(tarjeta, "Completar procesador")).toBeNull();
    expect(tarjeta.textContent).not.toMatch(/\bBIOS\b/);
  });
  it("«Completar» la placa madre abre el editor dentro de la grilla y lleva el foco al estado de la pieza", async () => {
    const { host } = await openPc();
    expect(editorForm(host)).toBeNull();
    await click(button(host, "Completar placa madre"));
    expect(editorForm(host)).not.toBeNull();
    expect(editorForm(host)!.previousElementSibling?.getAttribute("aria-label")).toBe("Placa madre");
    expect(document.activeElement?.id).toBe("tower-status-motherboard");
  });
  it("el editor de la placa ya no pide ni muestra la BIOS", async () => {
    const { host } = await openPc();
    await click(button(host, "Completar placa madre"));
    const editor = editorForm(host)!;
    expect(editor.textContent).not.toMatch(/\bBIOS\b/);
    expect(host.querySelector('input[placeholder="Por ejemplo: P2.30"]')).toBeNull();
  });
  it("«Completar almacenamiento» lleva el foco al estado de esa pieza", async () => {
    const { host } = await openPc();
    await click(button(host, "Completar almacenamiento"));
    expect(document.activeElement?.id).toBe("tower-status-storage");
  });
  it("el editor no tiene ningún campo de lugares M.2 (el dato no existe en la API)", async () => {
    const { host } = await openPc();
    await click(button(host, "Completar almacenamiento"));
    const editor = editorForm(host)!;
    expect(editor.textContent).not.toMatch(/M\.2|\bm2\b/i);
    for (const field of Array.from(editor.querySelectorAll("input,select,textarea"))) {
      expect(`${field.getAttribute("name")} ${field.getAttribute("id")} ${field.getAttribute("aria-label")}`).not.toMatch(/M\.2|\bm2\b/i);
    }
  });
  it("guardar una pieza envía un solo PUT con la revisión guardada, sin user_id y conservando la BIOS previa", async () => {
    const { host, api } = await openPc();
    await click(button(host, "Completar placa madre"));
    await type(byLabel(editorForm(host)!, "Modelo"), "Placa de prueba 2");
    await click(button(editorForm(host)!, "Guardar cambios"));
    const puts = api.mock.calls.filter(call => (call[1] as RequestInit | undefined)?.method === "PUT");
    expect(puts).toHaveLength(1);
    const body = JSON.parse(String((puts[0][1] as RequestInit).body));
    expect(body.revision).toBe(3);
    expect(body.context.bios_version).toBe("P1.20");
    expect(body.lines.find((line: { category: string }) => line.category === "motherboard").declared_model).toBe("Placa de prueba 2");
    expect(body).not.toHaveProperty("user_id");
    expect(editorForm(host)).toBeNull();
    expect(host.textContent).toContain("Guardamos tu placa madre");
  });
  it("cancelar el editor no envía nada", async () => {
    const { host, api } = await openPc();
    await click(button(host, "Completar placa madre"));
    await click(button(editorForm(host)!, "Cancelar"));
    expect(editorForm(host)).toBeNull();
    expect(api.mock.calls.filter(call => (call[1] as RequestInit | undefined)?.method === "PUT")).toHaveLength(0);
  });
  it("«Agregar otra PC» abre una PC nueva sin guardar nada hasta tocar «Guardar mi PC»", async () => {
    const { host, api } = await openPc();
    await click(button(host, "Agregar otra PC"));
    expect(host.querySelector("h1")?.textContent).toBe("Una PC nueva");
    expect((button(host, "Guardar mi PC") as HTMLButtonElement).disabled).toBe(true);
    expect(api.mock.calls.filter(call => String(call[0]) === "/api/towers" && (call[1] as RequestInit | undefined)?.method === "POST")).toHaveLength(0);
  });
  it("la creación deja declarar si la PC ya está armada y lo envía al guardar", async () => {
    const { host, api } = await openPc();
    await click(button(host, "Agregar otra PC"));
    await type(byLabel(host, "¿Cómo le decimos a esta PC?"), "La nueva");
    await type(byLabel(host, "¿Esta PC ya está armada y funcionando?"), "assembled");
    await click(button(host, "Guardar mi PC"));
    const posts = api.mock.calls.filter(call => String(call[0]) === "/api/towers" && (call[1] as RequestInit | undefined)?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String((posts[0][1] as RequestInit).body)).context.assembly_state).toBe("assembled");
  });
  it("la PC guardada cambia su declaración de armado con un PUT explícito", async () => {
    const { host, api } = await openPc();
    await type(byLabel(host, "¿Esta PC ya está armada y funcionando?"), "new");
    await click(button(host, "Guardar estado"));
    const puts = api.mock.calls.filter(call => (call[1] as RequestInit | undefined)?.method === "PUT");
    expect(puts).toHaveLength(1);
    expect(JSON.parse(String((puts[0][1] as RequestInit).body)).context.assembly_state).toBe("new");
  });
});
