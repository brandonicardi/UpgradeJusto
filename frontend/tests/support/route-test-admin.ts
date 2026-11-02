import { spawnSync } from "node:child_process";
import path from "node:path";

export function assertRouteAdminTestEnvironment() {
  let allowed = false;
  try {
    const database = process.env.DATABASE_URL, testDatabase = process.env.TEST_DATABASE_URL;
    const url = new URL(database ?? "");
    allowed = process.env.UJ_ENV === "test" && Boolean(database) && Boolean(testDatabase) && database === testDatabase && url.protocol === "postgresql+psycopg:" && url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/upgradejusto_test" && url.username === "upgradejusto_test_app" && !url.search && !url.hash && !url.href.includes("?") && !url.href.includes("#");
  } catch { /* Closed rejection; never include the connection string. */ }
  if (!allowed) throw new Error("route_admin_requires_exact_local_test_database");
}
export function bootstrapOwnRouteAdmin(email: string) {
  assertRouteAdminTestEnvironment();
  if (!/^routes-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@example\.test$/.test(email)) throw new Error("route_admin_requires_own_uuid_account");
  const root = path.resolve(process.cwd(), "..");
  const result = spawnSync(path.join(root, "backend/.venv/Scripts/python.exe"), [path.join(root, "scripts/bootstrap-admin.py"), "--email", email, "--confirm-project-test-account"], { cwd: root, env: process.env, timeout: 5000, stdio: "ignore", windowsHide: true, shell: false });
  if (result.error || result.status !== 0) throw new Error("route_admin_bootstrap_failed");
}
