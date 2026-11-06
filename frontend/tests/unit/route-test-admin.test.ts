// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import Administration from "../../app/admin/page";
import { mount, unmountAll, click, type, button, byLabel } from "./support/dom";
import { spawnSync } from "node:child_process";
import { assertRouteAdminTestEnvironment, bootstrapOwnRouteAdmin } from "../support/route-test-admin";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn(() => ({ status: 0 })) }));

const dashboardFixture = () => ({
  dataset_version: "retail-" + "a".repeat(64),
  metrics: { components: 412, missing_data: 23, without_recent_price: 38, stores: 6 },
  missing_data: {
    items: [
      { component_id: "cg-case-1", category: "case", name: "Mid tower ATX", missing: ["gpu_limit_mm", "fan_positions"], affected_pcs: 14 },
    ],
    total: 23, limit: 100, offset: 0,
  },
  old_prices: {
    items: [
      { component_id: "cg-gpu-1", category: "gpu", name: "GeForce RTX 4060", amount: "371500.00", currency: "ARS", store: "compragamer", observed_at: "2026-10-12T12:00:00-03:00", days: 25 },
    ],
    total: 38, limit: 100, offset: 0,
  },
});

afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

it("muestra las métricas y los listados que devuelve el servidor", async () => {
  const fetcher = vi.fn(async (path: string) => {
    if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
    if (path.startsWith("/api/admin/dashboard")) return Response.json(dashboardFixture());
    if (path.startsWith("/api/admin/revisions")) return Response.json({ items: [], total: 0, offset: 0, limit: 100 });
    throw new Error("unexpected");
  });
  vi.stubGlobal("fetch", fetcher);
  const host = await mount(createElement(Administration));
  expect(host.textContent).toContain("412");
  expect(host.textContent).toContain("Con datos faltantes");
  expect(host.textContent).toContain("Sin precio de los últimos 7 días");
  expect(host.textContent).toContain("Tiendas que usamos como fuente");
  expect(host.textContent).toContain("Mid tower ATX");
  expect(host.textContent).toContain("Largo máximo de placa de video (mm)");
  expect(host.textContent).toContain("14 PCs");
  expect(button(host, "Completar")).not.toBeNull();
  await click(button(host, /Precios viejos/));
  expect(host.textContent).toContain("GeForce RTX 4060");
  expect(host.textContent).toContain("ARS $ 371.500");
  expect(host.textContent).toContain("Compra Gamer");
  expect(button(host, "Cargar precio")).not.toBeNull();
});

it("no muestra números si falla el pedido del tablero", async () => {
  const fetcher = vi.fn(async (path: string) => {
    if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
    if (path.startsWith("/api/admin/dashboard")) return Response.json({ detail: "denegado" }, { status: 403 });
    if (path.startsWith("/api/admin/revisions")) return Response.json({ items: [], total: 0, offset: 0, limit: 100 });
    throw new Error("unexpected");
  });
  vi.stubGlobal("fetch", fetcher);
  const host = await mount(createElement(Administration));
  expect(host.textContent).toContain("Acceso denegado");
  expect(host.querySelector(".admin-stats")).toBeNull();
  expect(host.textContent).not.toContain("412");
});

it("publica un precio solo después de confirmar, y «Cargar precio» completa la pieza", async () => {
  let pricePosts = 0;
  const fetcher = vi.fn(async (path: string) => {
    if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
    if (path.startsWith("/api/admin/dashboard")) return Response.json(dashboardFixture());
    if (path.startsWith("/api/admin/prices")) { pricePosts++; return Response.json({ dataset_version: "retail-new", component_id: "cg-gpu-1", store: "compragamer", amount: "400000.00", observed_at: "2026-11-06T12:00:00-03:00" }, { status: 201 }); }
    if (path.startsWith("/api/admin/revisions")) return Response.json({ items: [], total: 0, offset: 0, limit: 100 });
    throw new Error("unexpected");
  });
  vi.stubGlobal("fetch", fetcher);
  const host = await mount(createElement(Administration));
  await click(button(host, /Precios viejos/));
  await click(button(host, "Cargar precio"));
  const select = host.querySelector("#precio-pieza") as HTMLSelectElement;
  expect(select.value).toBe("cg-gpu-1");
  await type(byLabel(host, "Monto"), "400000");
  await type(byLabel(host, "Visto el"), "2026-11-02");
  await type(byLabel(host, "Enlace donde lo viste"), "https://compragamer.com/producto");
  expect(host.textContent).toContain("Resumen del precio");
  expect(button(host, "Publicar precio")?.disabled).toBe(true);
  expect(pricePosts).toBe(0);
  await click(byLabel(host, "Confirmo publicar este precio de contado."));
  const publish = button(host, "Publicar precio");
  expect(publish?.disabled).toBe(false);
  await click(publish);
  expect(pricePosts).toBe(1);
});

it("«Completar» abre la pieza sin crear borrador hasta confirmar", async () => {
  const draft = { id: "draft", base_version: "active", status: "draft", active: false };
  let revisionPosts = 0;
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
    if (path.startsWith("/api/admin/dashboard")) return Response.json(dashboardFixture());
    if (path.startsWith("/api/admin/revisions")) {
      if (init?.method === "POST") { revisionPosts++; return Response.json(draft, { status: 201 }); }
      if (path.includes("/components?")) return Response.json({ items: [{ id: "cg-case-1", data: { category: "case", name: "Mid tower ATX", attributes: { gpu_limit_mm: null }, sources: [] } }], total: 1, offset: 0, limit: 25 });
      return Response.json({ items: [{ id: "active", base_version: null, status: "published", active: true }], total: 1, offset: 0, limit: 100 });
    }
    throw new Error("unexpected");
  });
  vi.stubGlobal("fetch", fetcher);
  const host = await mount(createElement(Administration));
  await click(button(host, "Completar"));
  expect(revisionPosts).toBe(0);
  await click(button(host, "Crear borrador desde activa"));
  expect(revisionPosts).toBe(1);
  expect(host.textContent).toContain("Borrador creado. La pieza quedó abierta");
});

it("el editor de revisiones distingue borrador de publicado y exige publicación explícita", async () => {
  const active = { id: "active", base_version: null, status: "published", active: true };
  const draft = { id: "draft", base_version: "active", status: "draft", active: false };
  let published = false;
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
    if (path.startsWith("/api/admin/dashboard")) return Response.json(dashboardFixture());
    if (path.endsWith("/publish")) { published = true; return Response.json({ dataset_version: "draft" }); }
    if (init?.method === "POST") return Response.json(draft, { status: 201 });
    if (path.includes("/sources?")) return Response.json({ items: [], total: 0, offset: 0, limit: 25 });
    return Response.json({ items: published ? [{ ...draft, status: "published", active: true }] : [active, draft], total: 2, offset: 0, limit: 100 });
  });
  vi.stubGlobal("fetch", fetcher);
  const host = await mount(createElement(Administration));
  await click(button(host, "Crear borrador desde activa"));
  expect(host.textContent).toContain("Guardado en borrador");
  expect(host.querySelectorAll("#admin-collection option")).toHaveLength(4);
  expect(button(host, "Publicar borrador")?.disabled).toBe(true);
  expect(published).toBe(false);
  await click(byLabel(host, "Confirmo publicar este borrador"));
  await click(button(host, "Publicar borrador"));
  expect(published).toBe(true);
  expect(host.textContent).toContain("Publicado · solo lectura");
  expect(button(host, "Guardar fila en borrador")).toBeNull();
});

const email = "routes-12345678-1234-1234-1234-123456789abc@example.test";
const testDatabase = "postgresql+psycopg://upgradejusto_test_app@127.0.0.1:55433/upgradejusto_test";
describe("route admin TEST-only bootstrap guard", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("UJ_ENV", "test");
    vi.stubEnv("DATABASE_URL", testDatabase); vi.stubEnv("TEST_DATABASE_URL", testDatabase);
  });
  afterEach(() => { vi.unstubAllEnvs(); });
  it("rejects non-TEST before invoking any bootstrap", () => {
    vi.stubEnv("UJ_ENV", "development"); expect(() => bootstrapOwnRouteAdmin(email)).toThrow("exact_local_test_database"); expect(spawnSync).not.toHaveBeenCalled();
  });
  it("rejects wrong host, port, database, role, protocol, query or fragment even when both URLs match", () => {
    for (const url of [
      testDatabase.replace("127.0.0.1", "remote.invalid"), testDatabase.replace("127.0.0.1", "localhost"),
      testDatabase.replace(":55433", ":5432"), testDatabase.replace("/upgradejusto_test", "/upgradejusto"),
      testDatabase.replace("upgradejusto_test_app@", "test_app@"), testDatabase.replace("upgradejusto_test_app@", "upgradejusto_dev_app@"),
      testDatabase.replace("postgresql+psycopg:", "postgresql:"), testDatabase.replace("postgresql+psycopg:", "postgres:"),
      `${testDatabase}?sslmode=disable`, `${testDatabase}#fragment`, `${testDatabase}?`, `${testDatabase}#`, "invalid",
    ]) {
      vi.stubEnv("DATABASE_URL", url); vi.stubEnv("TEST_DATABASE_URL", url);
      expect(() => bootstrapOwnRouteAdmin(email)).toThrow("exact_local_test_database");
    }
    expect(spawnSync).not.toHaveBeenCalled();
  });
  it("requires nonempty exact DATABASE_URL and TEST_DATABASE_URL equality", () => {
    for (const [database, test] of [["", ""], [testDatabase, ""], ["", testDatabase], [testDatabase, `${testDatabase}?different`]]) {
      vi.stubEnv("DATABASE_URL", database); vi.stubEnv("TEST_DATABASE_URL", test);
      expect(() => bootstrapOwnRouteAdmin(email)).toThrow("exact_local_test_database");
    }
    expect(spawnSync).not.toHaveBeenCalled();
  });
  it("accepts the exact matching public TEST configuration", () => {
    expect(() => assertRouteAdminTestEnvironment()).not.toThrow(); expect(spawnSync).not.toHaveBeenCalled();
  });
  it("only permits own UUID test email and fixed shell-free CLI without raw output", () => {
    for (const value of ["person@example.test", "routes-12345678-1234-1234-1234-123456789abc@example.com", `${email} --other`]) expect(() => bootstrapOwnRouteAdmin(value)).toThrow("own_uuid_account");
    expect(spawnSync).not.toHaveBeenCalled(); bootstrapOwnRouteAdmin(email);
    expect(spawnSync).toHaveBeenCalledTimes(1);
    const [binary, args, options] = vi.mocked(spawnSync).mock.calls[0];
    expect(String(binary).replaceAll("\\", "/")).toMatch(/\/backend\/\.venv\/Scripts\/python\.exe$/);
    expect(args?.slice(1)).toEqual(["--email", email, "--confirm-project-test-account"]);
    expect(options).toMatchObject({ shell: false, stdio: "ignore", timeout: 5000, windowsHide: true });
  });
});
