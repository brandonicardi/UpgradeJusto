import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { assertRouteAdminTestEnvironment, bootstrapOwnRouteAdmin } from "../support/route-test-admin";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn(() => ({ status: 0 })) }));
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
