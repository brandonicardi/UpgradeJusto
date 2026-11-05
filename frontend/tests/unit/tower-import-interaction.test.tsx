// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import ImportTower from "../../app/pcs/import/proposal";
import LegacyImportPC from "../../app/pcs/import/legacy-proposal";
import type { Extraction } from "../../lib/curation";
import type { TowerExtraction } from "../../lib/tower-extraction";
import { emptyTower, towerKeys, type Tower } from "../../lib/towers";
import { button, byLabel, click, mount, settle, type, unmountAll } from "./support/dom";

const text = "Tengo un SSD de prueba y no conozco el resto.";
const confirmPath = "/api/towers/extract/confirm";
const extraction: TowerExtraction = (() => {
  const proposal = { ...emptyTower(), name: "Torre extraída", lines: [{ line_id: null, category: "storage" as const, component_id: null, declared_model: "SSD de prueba", quantity: 1 }] };
  proposal.category_status.storage = "present";
  return {
    proposal, missing_fields: [], warnings: [], catalog_revision: "revision-de-prueba", requires_confirmation: true,
    evidence: towerKeys.map(category => ({ category, status: category === "storage" ? "present" as const : "unknown" as const, absence_excerpt: null, lines: category === "storage" ? [{ proposal_line_index: 0, component_id: null, declared_model: "SSD de prueba", quantity: 1, excerpt: "un SSD de prueba", quantity_excerpt: null, candidate_ids: [], resolution: "declared" as const }] : [] })),
  };
})();
const savedTower: Tower = { ...extraction.proposal, id: "12345678-1234-1234-1234-123456789abc", revision: 1, origin_schema: 2, lines: [{ ...extraction.proposal.lines[0], line_id: "22222222-2222-4222-8222-222222222222" }] };

function stubApi() {
  const fetchMock = vi.fn<typeof fetch>(async input => {
    const url = String(input);
    if (url === "/api/auth/csrf") return Response.json({ csrf_token: "token-de-prueba" });
    if (url === "/api/towers/extract") return Response.json(extraction);
    if (url === confirmPath) return Response.json(savedTower, { status: 201 });
    return Response.json({ detail: "no disponible" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, posts: (path: string) => fetchMock.mock.calls.filter(call => String(call[0]) === path) };
}
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

const textarea = (host: HTMLElement) => byLabel(host, "Texto de la PC") as HTMLTextAreaElement;
const heading = () => document.activeElement?.textContent;
async function toStep2(host: HTMLElement) {
  await type(textarea(host), text);
  await click(button(host, "Extraer propuesta")); await settle();
}
const confirmForm = (host: HTMLElement) => host.querySelector('form[aria-label="Guardar tu PC"]') as HTMLFormElement;
const saveButton = (host: HTMLElement) => button(confirmForm(host), "Confirmar y guardar mi torre") as HTMLButtonElement;
const consent = (host: HTMLElement) => byLabel(confirmForm(host), "Revisé esta propuesta") as HTMLInputElement;

describe("Agregar por lista: interacción real", () => {
  it("extraer muestra la propuesta editable en el paso 2 y no envía ninguna confirmación", async () => {
    const api = stubApi(); const host = await mount(createElement(ImportTower));
    expect(host.querySelector('li[aria-current="step"]')?.textContent).toContain("Pegá tu lista");
    await toStep2(host);
    expect(host.querySelector('form[aria-label="Propuesta editable de torre"]')).not.toBeNull();
    expect(host.querySelector('li[aria-current="step"]')?.textContent).toContain("Revisá lo que entendimos");
    expect(host.textContent).toContain("Paso 2 de 3"); expect(host.textContent).toContain("Todavía no se guardó nada");
    expect(host.querySelectorAll("section[aria-label='Evidencia de extracción de torre'] h3")).toHaveLength(9);
    expect(byLabel(host, "Nombre de PC")).toBeNull();
    expect(api.posts(confirmPath)).toHaveLength(0); expect(host.querySelector('section[aria-label="Torre guardada"]')).toBeNull();
    expect(heading()).toBe("Revisá lo que entendimos");
  });
  it("sin marcar la casilla el botón está deshabilitado y no se envía nada", async () => {
    const api = stubApi(); const host = await mount(createElement(ImportTower)); await toStep2(host);
    await click(button(host, "Seguir al paso 3"));
    expect(host.textContent).toContain("Paso 3 de 3"); expect(heading()).toBe("Guardala");
    expect(consent(host).checked).toBe(false); expect(saveButton(host).disabled).toBe(true);
    expect(host.textContent).toContain("Marcá la confirmación para guardar");
    await click(saveButton(host));
    await act(async () => { confirmForm(host).requestSubmit(); }); await settle();
    expect(api.posts(confirmPath)).toHaveLength(0); expect(host.querySelector('section[aria-label="Torre guardada"]')).toBeNull();
  });
  it("corregir una línea desmarca la confirmación y el botón explica que hay que volver a confirmar", async () => {
    const api = stubApi(); const host = await mount(createElement(ImportTower)); await toStep2(host);
    await click(button(host, "Seguir al paso 3")); await click(consent(host));
    expect(consent(host).checked).toBe(true); expect(saveButton(host).disabled).toBe(false);
    await click(button(host, "Volver a revisar")); expect(host.textContent).toContain("Paso 2 de 3"); expect(heading()).toBe("Revisá lo que entendimos");
    await type(byLabel(host, "Cantidad explícita 1"), "2");
    await click(button(host, "Seguir al paso 3"));
    expect(consent(host).checked).toBe(false); expect(saveButton(host).disabled).toBe(true);
    expect(host.textContent).toContain("Revisaste cambios: volvé a confirmar");
    expect(api.posts(confirmPath)).toHaveLength(0);
  });
  it("marcar la casilla y confirmar envía un solo POST con confirmed: true y muestra la torre guardada", async () => {
    const api = stubApi(); const host = await mount(createElement(ImportTower)); await toStep2(host);
    await click(button(host, "Seguir al paso 3"));
    await type(byLabel(confirmForm(host), "Nombre de tu PC"), "Mi torre nueva");
    await click(consent(host)); await click(saveButton(host)); await settle();
    const sent = api.posts(confirmPath);
    expect(sent).toHaveLength(1);
    const body = JSON.parse(sent[0][1]!.body as string);
    expect(body.confirmed).toBe(true); expect(body.proposal.name).toBe("Mi torre nueva"); expect(body.catalog_revision).toBe("revision-de-prueba");
    expect(body).not.toHaveProperty("user_id");
    const region = host.querySelector('section[aria-label="Torre guardada"]');
    expect(region).not.toBeNull(); expect(region!.textContent).toContain(savedTower.name);
    expect(confirmForm(host)).toBeNull(); expect(api.posts(confirmPath)).toHaveLength(1);
  });
  it("«Volver a pegar» desde el paso 2 vuelve al paso 1 y conserva el texto escrito", async () => {
    const api = stubApi(); const host = await mount(createElement(ImportTower)); await toStep2(host);
    await click(button(host, "Volver a pegar"));
    expect(host.textContent).toContain("Paso 1 de 3"); expect(host.querySelector('form[aria-label="Propuesta editable de torre"]')).toBeNull();
    expect(textarea(host).value).toBe(text); expect(heading()).toBe("Pegá lo que sepas de tu PC");
    expect(api.posts(confirmPath)).toHaveLength(0);
  });
});

const legacyExtraction: Extraction = {
  proposal: { name: "PC histórica", components: [], context: { bios_version: null, notes: null } } as unknown as Extraction["proposal"],
  evidence: ["cpu", "motherboard", "ram", "gpu", "psu", "storage"].map(field => ({ field: field as Extraction["evidence"][number]["field"], origin: "unknown" as const, excerpt: null, candidate_ids: [] })),
  warnings: [], dataset_version: "dataset-de-prueba",
};
describe("Importación histórica: interacción real", () => {
  async function toLegacyReview() {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/csrf") return Response.json({ csrf_token: "token-de-prueba" });
      if (url === "/api/pcs/extract") return Response.json(legacyExtraction);
      return Response.json({ detail: "no disponible" }, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const host = await mount(createElement(LegacyImportPC, { catalog: null }));
    await type(host.querySelector("textarea"), text);
    await act(async () => { host.querySelector("form")!.requestSubmit(); }); await settle();
    return { host, saves: () => fetchMock.mock.calls.filter(call => String(call[0]) === "/api/pcs/extract/confirm") };
  }
  it("sin marcar la casilla el botón está deshabilitado y no hay POST de confirmación", async () => {
    const { host, saves } = await toLegacyReview();
    const form = host.querySelector('form[aria-label="Propuesta editable"]') as HTMLFormElement; expect(form).not.toBeNull();
    const save = button(form, "Confirmar y guardar") as HTMLButtonElement; expect(save.disabled).toBe(true);
    await click(save); await act(async () => { form.requestSubmit(); }); await settle();
    expect(saves()).toHaveLength(0);
  });
  it("«Cancelar propuesta» vuelve al formulario de texto sin ningún POST", async () => {
    const { host, saves } = await toLegacyReview();
    await click(button(host, "Cancelar propuesta"));
    expect(host.querySelector('form[aria-label="Propuesta editable"]')).toBeNull();
    expect(host.querySelector("textarea")).not.toBeNull(); expect(button(host, "Extraer propuesta")).not.toBeNull();
    expect(saves()).toHaveLength(0);
  });
});
