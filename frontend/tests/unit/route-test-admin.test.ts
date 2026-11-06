// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import Administration from "../../app/admin/page";
import { mount, unmountAll, click, button, byLabel } from "./support/dom";
import { spawnSync } from "node:child_process";
import { assertRouteAdminTestEnvironment, bootstrapOwnRouteAdmin } from "../support/route-test-admin";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn(() => ({ status: 0 })) }));
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });
it("admin distinguishes draft from published and requires explicit publication without unsupported metrics", async () => {
  const active = { id: "active", base_version: null, status: "published", active: true };
  const draft = { id: "draft", base_version: "active", status: "draft", active: false };
  let published = false;
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
    if (path.endsWith("/publish")) { published = true; return Response.json({ dataset_version: "draft" }); }
    if (init?.method === "POST") return Response.json(draft, { status: 201 });
    if (path.includes("/sources?")) return Response.json({ items: [], total: 0, offset: 0, limit: 25 });
    return Response.json({ items: published ? [{ ...draft, status: "published", active: true }] : [active, draft], total: 2, offset: 0, limit: 100 });
  });
  vi.stubGlobal("fetch", fetcher);
  const host = await mount(createElement(Administration));
  expect(host.textContent).not.toMatch(/PCs afectadas|Precios viejos|Publicar precio|Sin precio de los últimos/);
  await click(button(host, "Crear borrador desde activa"));
  expect(host.textContent).toContain("Guardado en borrador");
  expect(host.querySelectorAll("#admin-collection option")).toHaveLength(4);
  expect(button(host, "Publicar borrador")?.disabled).toBe(true);
  expect(published).toBe(false);
  await click(byLabel(host, "Confirmo publicar este borrador"));
  await click(button(host, "Publicar borrador"));
  expect(published).toBe(true); expect(host.textContent).toContain("Publicado · solo lectura");
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
