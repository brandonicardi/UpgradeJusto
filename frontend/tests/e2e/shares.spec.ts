import { expect, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { test } from "./fixtures";
import { validPublicPath, type ShareCreated } from "../../lib/shares";
import type { PC, PCInput } from "../../lib/pcs";
import type { Plan, PlanInput } from "../../lib/plans";

// Set before any test/context: capability URLs must never enter captured artifacts.
test.use({ trace: "off", screenshot: "off", video: "off" });

async function login(page: Page) {
  await page.goto("/account");
  const statuses = await page.evaluate(async credentials => {
    const token = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const options = { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(credentials) };
    const register = await fetch("/api/auth/register", options), login = await fetch("/api/auth/login", options);
    return [register.status, login.status];
  }, { email: `share-${randomUUID()}@example.test`, password: randomUUID() });
  expect(statuses).toEqual([201, 200]);
}
async function api(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(20000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}
async function publicRead(path: string, method = "GET") {
  try {
    const response = await fetch(`http://127.0.0.1:3000/api/shared-plans/${path.slice("/shared/".length)}`, { method, cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15000) });
    return { status: response.status, text: await response.text(), cache: response.headers.get("cache-control") };
  } catch { throw new Error("Anonymous public API request failed; capability URL suppressed"); }
}
async function navigatePublic(page: Page, path: string): Promise<{ status: number; cache: string; referrer: string }> {
  try {
    // Avoid goto/reload call logs containing bearer URLs, even when navigation fails.
    const [response] = await Promise.all([
      page.waitForResponse(response => response.request().isNavigationRequest() && new URL(response.url()).pathname === path, { timeout: 15000 }),
      page.evaluate(value => location.assign(`http://127.0.0.1:3000${value}`), path),
    ]);
    return { status: response.status(), cache: response.headers()["cache-control"] ?? "", referrer: response.headers()["referrer-policy"] ?? "" };
  } catch { throw new Error("Anonymous page navigation failed; capability URL suppressed"); }
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

test("CU09 H: publicación confirmada, proyección anónima, aislamiento y revocación sin caché", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const ca = await newIsolatedContext(), cb = await newIsolatedContext(), cc = await newIsolatedContext();
  const a = await ca.newPage(), b = await cb.newPage(), anonymous = await cc.newPage();
  a.setDefaultTimeout(15000); b.setDefaultTimeout(15000);
  let pcId: string | null = null, planId: string | null = null, failed = false;
  try {
    await login(a); await login(b);
    const privateMarker = `private-note-${randomUUID()}`;
    const pcInput: PCInput = { name: `Private PC ${randomUUID()}`, components: [
      { category: "cpu", component_id: "P01", quantity: 1 }, { category: "motherboard", component_id: "P03", quantity: 1 }, { category: "ram", component_id: "P04", quantity: 2 },
    ], context: { bios_version: "P2.30", notes: privateMarker } };
    const createdPC = await api(a, "/pcs", "POST", pcInput); expect(createdPC.status).toBe(201); const pc = createdPC.data as PC; pcId = pc.id;
    const input: PlanInput = { name: `Private plan ${randomUUID()}`, pc_id: pc.id, expected_pc_revision: pc.revision, objective: "general", budget_ars: "999999999999.99", stages: [{ name: "RAM técnica", replacements: [{ category: "ram", candidates: [{ component_id: "P05", quantity: 1 }] }] }] };
    const createdPlan = await api(a, "/plans", "POST", input); expect(createdPlan.status).toBe(201); const plan = createdPlan.data as Plan; planId = plan.id;
    await a.goto("/plans"); await a.getByRole("button", { name: input.name, exact: true }).click();
    const panel = a.getByRole("region", { name: "Publicaciones del plan", exact: true });
    const publicationTitle = "Publicación técnica de prueba";
    await panel.getByLabel("Título público de publicación", { exact: true }).fill(publicationTitle);
    const publish = panel.getByRole("button", { name: "Publicar esta versión", exact: true }); await expect(publish).toBeDisabled();
    await panel.getByRole("form", { name: "Publicar snapshot", exact: true }).getByRole("checkbox").check();
    const waiting = a.waitForResponse(response => response.url().endsWith(`/api/plans/${plan.id}/shares`) && response.request().method() === "POST");
    await publish.click(); const published = await waiting; expect(published.status()).toBe(201);
    const share = await published.json() as ShareCreated;
    expect(validPublicPath(share.path)).toBe(true); // Boolean only, never print a bearer value.
    await expect(panel.getByRole("region", { name: "Enlace recién creado", exact: true })).toBeVisible();
    const publicResult = await publicRead(share.path); expect(publicResult.status).toBe(200); expect(publicResult.cache).toContain("no-store");
    expect((await publicRead(share.path, "POST")).status).toBe(405);
    for (const privateValue of [privateMarker, pc.id, plan.id, pcInput.name, input.name]) expect(publicResult.text.includes(privateValue)).toBe(false);
    expect(publicResult.text.includes('"owner_id"')).toBe(false); expect(publicResult.text.includes('"email"')).toBe(false);
    expect(publicResult.text.includes(publicationTitle)).toBe(true);
    const html = await navigatePublic(anonymous, share.path); expect(html.status).toBe(200); expect(html.cache).toContain("no-store"); expect(html.referrer).toBe("no-referrer");
    await expect(anonymous.getByRole("heading", { name: "Plan compartido", exact: true })).toBeVisible();
    await expect(anonymous.getByRole("main")).toContainText(publicationTitle);
    await expect(anonymous.getByRole("button")).toHaveCount(0); await expect(anonymous.locator("script,link,img,iframe,form")).toHaveCount(0);
    await expect(anonymous.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow,noarchive");
    const sharePath = `/plans/${plan.id}/shares`;
    expect((await api(b, sharePath)).status).toBe(404);
    expect((await api(b, sharePath, "POST", { expected_plan_revision: plan.revision, title: "Other" })).status).toBe(404);
    expect((await api(b, `${sharePath}/${share.id}`, "DELETE")).status).toBe(404);
    expect((await api(a, sharePath, "POST", { expected_plan_revision: plan.revision + 1, title: "Stale" })).status).toBe(409);
    const metadata = await api(a, sharePath); expect(metadata.status).toBe(200);
    const serialized = JSON.stringify(metadata.data);
    expect(serialized.includes(share.path)).toBe(false); expect(serialized.includes('"token"')).toBe(false); expect(serialized.includes('"path"')).toBe(false);
    // Recalculation changes private snapshot, not the already-published capability.
    expect((await api(a, `/plans/${plan.id}`, "PUT", { ...input, name: "Private renamed plan", revision: plan.revision })).status).toBe(200);
    expect(digest((await publicRead(share.path)).text)).toBe(digest(publicResult.text));
    // Token does not grant a session or private-plan permissions to this anonymous context.
    // Native request avoids relaxing the read-only page's connect-src CSP.
    const privateStatus = await fetch(`http://127.0.0.1:3000/api/plans/${plan.id}`, { credentials: "omit", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${share.path.slice("/shared/".length)}` } })
      .then(response => response.status).catch(() => { throw new Error("Private authorization proof failed; capability suppressed"); });
    expect(privateStatus).toBe(401);
    await panel.getByRole("button", { name: `Preparar revocación: ${publicationTitle}`, exact: true }).click();
    const revoke = panel.getByRole("form", { name: "Confirmar revocación", exact: true });
    await revoke.getByRole("checkbox").check(); await revoke.getByRole("button", { name: "Revocar publicación definitivamente", exact: true }).click();
    await expect(panel.getByRole("status", { name: "Estado de publicaciones", exact: true })).toContainText("Publicación revocada");
    expect((await publicRead(share.path)).status).toBe(404);
    const revokedHtml = await navigatePublic(anonymous, share.path); expect(revokedHtml.status).toBe(404); expect(revokedHtml.cache).toContain("no-store");
    await expect(anonymous.getByRole("heading", { name: "Publicación no disponible", exact: true })).toBeVisible();
    expect((await api(a, `${sharePath}/${share.id}`, "DELETE")).status).toBe(204);
    await a.reload(); await a.getByRole("button", { name: "Private renamed plan", exact: true }).click();
    await expect(a.getByRole("region", { name: "Enlace recién creado", exact: true })).toHaveCount(0);
  } catch (error) { failed = true; throw error; }
  finally {
    try {
      for (const path of [planId ? `/plans/${planId}` : null, pcId ? `/pcs/${pcId}` : null]) if (path) {
        const cleanup = await api(a, path, "DELETE"); if (![204, 404].includes(cleanup.status) && !failed) throw new Error("Own share fixtures cleanup failed");
      }
    } catch (error) { if (!failed) throw error; }
    finally { await Promise.allSettled([ca.close(), cb.close(), cc.close()]); }
  }
});
