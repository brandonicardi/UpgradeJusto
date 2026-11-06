import { expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { test } from "./fixtures";
import { loginBasic } from "../support/basic-scope";
import { emptyTower, type Tower } from "../../lib/towers";
import { towerPlanInput, type TowerPlanRead } from "../../lib/tower-plans";
import type { TowerRecommendationPreview } from "../../lib/tower-recommendations";
import { parseCreatedShare, parsePublicTowerShare, parseShareList, shareTitles } from "../../lib/tower-share-dto";
test.use({ trace: "off", screenshot: "off", video: "off" });
async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => { const headers: Record<string, string> = {}; if (args.method !== "GET") { const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json(); headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json"; } const response = await fetch(args.path, { method: args.method, headers, cache: "no-store", body: args.body === undefined ? undefined : JSON.stringify(args.body) }); return { status: response.status, data: response.status === 204 ? null : await response.json(), noStore: response.headers.get("Cache-Control")?.includes("no-store") === true, referrer: response.headers.get("Referrer-Policy"), robots: response.headers.get("X-Robots-Tag") }; }, { path, method, body });
}
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
test("@tower-share38 propietario publica una vez → anónimo frozen → revoca →404 / B aislado", async ({ newIsolatedContext }) => {
  const ca = await newIsolatedContext(), cb = await newIsolatedContext(), cv = await newIsolatedContext();
  const a = await ca.newPage(), b = await cb.newPage(), visitor = await cv.newPage();
  let phase = "login", own: Tower | null = null, plan: TowerPlanRead | null = null, issued: ReturnType<typeof parseCreatedShare> | null = null, posts = 0, pcWrites = 0, cleanupFailed = false;
  try {
    await loginBasic(a); await loginBasic(b);
    phase = "real-plan-setup";
    const input = emptyTower(); input.name = "PC sintética para compartir"; input.category_status.cpu = "present"; input.category_status.gpu = "present"; input.lines = [{ line_id: null, category: "cpu", component_id: "P01", declared_model: null, quantity: 1 }, { line_id: null, category: "gpu", component_id: "P06", declared_model: null, quantity: 1 }];
    const createdPC = await api(a, "/api/towers", "POST", input); expect(createdPC.status).toBe(201); own = createdPC.data as Tower;
    const previewResponse = await api(a, `/api/towers/${own.id}/recommendations/preview`, "POST", { expected_pc_revision: own.revision, objective: "gaming", budget_ars: "0.01", price_condition: "cash", mode: "automatic", workload: null, materials: [], alternatives: [] }); expect(previewResponse.status).toBe(200); const preview = previewResponse.data as TowerRecommendationPreview; expect(preview.items.length > 0).toBe(true);
    const createdPlan = await api(a, "/api/tower-plans", "POST", towerPlanInput({ name: "Nombre privado no publicable", pc_id: own.id, expected_pc_revision: own.revision, expected_catalog_version: preview.items[0].versions.catalog, objective: "gaming", workload: null, budget_ars: "0.01", price_condition: "cash", stages: [{ name: "Nombre privado de etapa", budget_ars: "0.01", materials: [], actions: preview.items[0].actions }] }, randomUUID())); expect(createdPlan.status).toBe(201); plan = createdPlan.data as TowerPlanRead;
    const pcHash = hash(own), planHash = hash(plan.snapshot);
    a.on("request", request => { const path = new URL(request.url()).pathname; if (request.method() === "POST" && path === `/api/tower-plans/${plan?.id}/shares`) posts++; if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && path.startsWith("/api/towers")) pcWrites++; });
    phase = "owner-create-ui"; await a.goto(`/tower-plans/${plan.id}/shares`);
    const publish = a.getByRole("form", { name: "Publicar copia de torre", exact: true });
    await expect(publish.getByRole("checkbox")).toBeEnabled(); await expect(publish.getByRole("button")).toBeDisabled();
    await publish.getByRole("checkbox").check();
    const response = a.waitForResponse(response => new URL(response.url()).pathname === `/api/tower-plans/${plan?.id}/shares` && response.request().method() === "POST");
    await publish.getByRole("button", { name: "Crear enlace público una vez", exact: true }).click(); const created = await response; expect(created.status()).toBe(201); issued = parseCreatedShare(await created.json()); expect(posts).toBe(1);
    await expect(a.getByRole("region", { name: "Enlace recién creado", exact: true })).toBeVisible();
    const listed = await api(a, `/api/tower-plans/${plan.id}/shares`); expect(listed.status).toBe(200); expect(JSON.stringify(listed.data).includes(issued.token)).toBe(false);
    phase = "anonymous-view";
    const web = await visitor.goto(`/shared-tower-plans/${issued.token}`); expect(web?.status()).toBe(200); expect(web?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(visitor.getByRole("article", { name: "Plan de torre compartido", exact: true })).toBeVisible();
    const publicAPI = await api(visitor, `/api/shared-tower-plans/${issued.token}`); expect(publicAPI.status).toBe(200); expect(publicAPI.noStore).toBe(true); expect(publicAPI.referrer).toBe("no-referrer"); expect(publicAPI.robots).toBe("noindex, nofollow");
    const data = parsePublicTowerShare(publicAPI.data), frozen = hash(data); expect(Object.keys(data.base_configuration.category_status).length).toBe(9); expect(data.stages.every(stage => stage.evaluation.rule_results.length === 12)).toBe(true); expect(JSON.stringify(data).includes("Nombre privado")).toBe(false);
    await visitor.reload(); expect(hash(parsePublicTowerShare((await api(visitor, `/api/shared-tower-plans/${issued.token}`)).data)) === frozen).toBe(true);
    expect((await cv.cookies()).length).toBe(0);
    phase = "other-owner"; expect((await api(b, `/api/tower-plans/${plan.id}/shares`)).status).toBe(404); expect((await api(b, `/api/tower-plans/${plan.id}/shares/${issued.id}`, "DELETE", { expected_plan_revision: issued.plan_revision })).status).toBe(404);
    phase = "owner-revoke-ui"; await a.locator(`[data-share-id="${issued.id}"]`).getByRole("button").click(); const revoke = a.getByRole("form", { name: "Confirmar revocación de torre", exact: true }); await revoke.getByRole("checkbox").check(); const deleting = a.waitForResponse(response => response.request().method() === "DELETE" && new URL(response.url()).pathname.endsWith(`/shares/${issued?.id}`)); await revoke.getByRole("button", { name: "Revocar enlace", exact: true }).click(); expect((await deleting).status()).toBe(204);
    phase = "uniform-404"; const revoked = await api(visitor, `/api/shared-tower-plans/${issued.token}`), invalid = await api(visitor, "/api/shared-tower-plans/short"); expect(revoked.status).toBe(404); expect(invalid.status).toBe(404); expect(hash(revoked.data) === hash(invalid.data)).toBe(true); expect((await visitor.goto(`/shared-tower-plans/${issued.token}`))?.status()).toBe(404);
    const states = await api(a, `/api/tower-plans/${plan.id}/shares`); expect((states.data as { items: { effective_state: string }[] }).items[0].effective_state === "revoked").toBe(true);
    expect(hash((await api(a, `/api/towers/${own.id}`)).data) === pcHash).toBe(true); expect(hash(((await api(a, `/api/tower-plans/${plan.id}`)).data as TowerPlanRead).snapshot) === planHash).toBe(true); expect(posts).toBe(1); expect(pcWrites).toBe(0); phase = "complete";
  } catch { throw new Error(`phase=${phase}; error_enum=tower_share_gate; posts=${posts}; pc_writes=${pcWrites}`); }
  finally {
    try { if (plan && issued) cleanupFailed = ![204, 404].includes((await api(a, `/api/tower-plans/${plan.id}/shares/${issued.id}`, "DELETE", { expected_plan_revision: issued.plan_revision })).status); } catch { cleanupFailed = true; }
    try { if (plan) cleanupFailed = ![204, 404].includes((await api(a, `/api/tower-plans/${plan.id}`, "DELETE", { expected_plan_revision: plan.revision })).status) || cleanupFailed; } catch { cleanupFailed = true; }
    try { if (own) cleanupFailed = ![204, 404].includes((await api(a, `/api/towers/${own.id}`, "DELETE")).status) || cleanupFailed; } catch { cleanupFailed = true; }
    finally { await Promise.allSettled([ca.close(), cb.close(), cv.close()]); }
    if (cleanupFailed) throw new Error("phase=cleanup; error_enum=own_tower_share_resources");
  }
});

test("@tower-share38-revoke-switch confirmar A → preparar B exige consentimiento nuevo y revoca sólo B", async ({ newIsolatedContext }) => {
  const context = await newIsolatedContext(), a = await context.newPage();
  // Bound individual actions, not the30s journey, so finally can clean up.
  a.setDefaultTimeout(5000);
  let phase = "setup", own: Tower | null = null, plan: TowerPlanRead | null = null, posts = 0, pcWrites = 0, cleanupFailed = false;
  const issued: ReturnType<typeof parseCreatedShare>[] = [], deletes: { id: string; revision: unknown }[] = [];
  type Observation = Readonly<{ title_index: number; combobox_count: number; checkbox_count: number; selected_known: boolean | null; consent_before: boolean | null; consent_after: boolean | null }>;
  let observation: Observation = Object.freeze({ title_index: 0, combobox_count: 0, checkbox_count: 0, selected_known: null, consent_before: null, consent_after: null });
  let failure: { phase: string; posts: number; deletes: number; pc_writes: number; matcher: string | null; error_enum: string; observation: Observation } | null = null;
  let beforeCleanup = { posts: 0, deletes: 0, pc_writes: 0 };
  try {
    await loginBasic(a);
    const input = emptyTower(); input.name = "PC sintética de cambio de revocación"; input.category_status.cpu = "present"; input.category_status.gpu = "present"; input.lines = [{ line_id: null, category: "cpu", component_id: "P01", declared_model: null, quantity: 1 }, { line_id: null, category: "gpu", component_id: "P06", declared_model: null, quantity: 1 }];
    const createdPC = await api(a, "/api/towers", "POST", input); expect(createdPC.status).toBe(201); own = createdPC.data as Tower;
    const previewResponse = await api(a, `/api/towers/${own.id}/recommendations/preview`, "POST", { expected_pc_revision: own.revision, objective: "gaming", budget_ars: "0.01", price_condition: "cash", mode: "automatic", workload: null, materials: [], alternatives: [] }); expect(previewResponse.status).toBe(200); const preview = previewResponse.data as TowerRecommendationPreview; expect(preview.items.length > 0).toBe(true);
    const saved = await api(a, "/api/tower-plans", "POST", towerPlanInput({ name: "Plan privado de cambio de revocación", pc_id: own.id, expected_pc_revision: own.revision, expected_catalog_version: preview.items[0].versions.catalog, objective: "gaming", workload: null, budget_ars: "0.01", price_condition: "cash", stages: [{ name: "Etapa privada", budget_ars: "0.01", materials: [], actions: preview.items[0].actions }] }, randomUUID())); expect(saved.status).toBe(201); plan = saved.data as TowerPlanRead;
    const path = `/api/tower-plans/${plan.id}/shares`, pcHash = hash(own);
    a.on("request", request => { const target = new URL(request.url()).pathname; if (request.method() === "POST" && target === path) posts++; if (request.method() === "DELETE" && target.startsWith(`${path}/`)) { const body = request.postDataJSON() as { expected_plan_revision?: unknown }; deletes.push({ id: target.split("/").at(-1) ?? "", revision: body.expected_plan_revision }); } if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && target.startsWith("/api/towers")) pcWrites++; });
    phase = "open-owner-manager"; await a.goto(`/tower-plans/${plan.id}/shares`, { timeout: 5000 });
    const publish = a.getByRole("form", { name: "Publicar copia de torre", exact: true });
    for (const [index, title] of shareTitles.entries()) {
      const intent = index === 0 ? "first" : "second";
      observation = Object.freeze({ title_index: index + 1, combobox_count: 0, checkbox_count: 0, selected_known: null, consent_before: null, consent_after: null });
      phase = `prepare-${intent}-form`; await expect(publish).toHaveCount(1, { timeout: 5000 });
      const selector = publish.getByRole("combobox", { name: "Título público", exact: true }), checkbox = publish.getByRole("checkbox");
      phase = `prepare-${intent}-selector-count`; observation = Object.freeze({ ...observation, combobox_count: await selector.count() }); await expect(selector).toHaveCount(1, { timeout: 5000 });
      phase = `prepare-${intent}-checkbox-ready`; observation = Object.freeze({ ...observation, checkbox_count: await checkbox.count() }); await expect(checkbox).toHaveCount(1, { timeout: 5000 }); await expect(checkbox).toBeEnabled({ timeout: 5000 });
      phase = `prepare-${intent}-select-title`; await selector.selectOption(title, { timeout: 5000 });
      phase = `prepare-${intent}-verify-selected`; observation = Object.freeze({ ...observation, selected_known: (await selector.inputValue({ timeout: 5000 })) === title }); expect(observation.selected_known).toBe(true);
      phase = `prepare-${intent}-verify-consent-reset`; observation = Object.freeze({ ...observation, consent_before: await checkbox.isChecked() }); await expect(checkbox).not.toBeChecked({ timeout: 5000 });
      phase = `prepare-${intent}-check-consent`; await checkbox.check({ timeout: 5000 }); observation = Object.freeze({ ...observation, consent_after: await checkbox.isChecked() }); await expect(checkbox).toBeChecked({ timeout: 5000 });
      phase = `prepare-${intent}-arm-post`;
      const response = a.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === path, { timeout: 5000 });
      void response.catch(() => undefined); // Click failure must not leave an unhandled observer rejection.
      phase = `prepare-${intent}-click-create`; await publish.getByRole("button", { name: "Crear enlace público una vez", exact: true }).click({ timeout: 5000 });
      phase = `prepare-${intent}-await-post`; const created = await response;
      phase = `prepare-${intent}-assert-201`; expect(created.status()).toBe(201);
      phase = `prepare-${intent}-decode-created`; issued.push(parseCreatedShare(await created.json()));
      phase = `prepare-${intent}-assert-post-count`; expect(posts).toBe(index + 1);
    }
    phase = "prepare-A";
    const rowA = a.locator(`[data-share-id="${issued[0].id}"]`), rowB = a.locator(`[data-share-id="${issued[1].id}"]`);
    await rowA.getByRole("button").click(); const form = a.getByRole("form", { name: "Confirmar revocación de torre", exact: true }); await form.getByRole("checkbox").check(); await expect(form.getByRole("checkbox")).toBeChecked(); expect(deletes.length).toBe(0);
    phase = "switch-B-no-inherited-consent"; await rowB.getByRole("button").click(); await expect(form.getByRole("checkbox")).not.toBeChecked(); await expect(form.getByRole("button", { name: "Revocar enlace", exact: true })).toBeDisabled(); expect(deletes.length).toBe(0);
    await expect(form).toContainText(issued[1].title);
    phase = "explicit-confirm-B"; await form.getByRole("checkbox").check(); const deleting = a.waitForResponse(response => response.request().method() === "DELETE" && new URL(response.url()).pathname === `${path}/${issued[1].id}`, { timeout: 5000 }); void deleting.catch(() => undefined); phase = "click-revoke-B"; await form.getByRole("button", { name: "Revocar enlace", exact: true }).click(); phase = "await-revoke-B"; expect((await deleting).status()).toBe(204);
    expect(deletes.length).toBe(1); expect(deletes[0].id === issued[1].id).toBe(true); expect(deletes[0].revision === issued[1].plan_revision).toBe(true);
    phase = "A-active-B-revoked"; const listing = await api(a, path); expect(listing.status).toBe(200); const items = parseShareList(listing.data).items; expect(items.find(item => item.id === issued[0].id)?.effective_state === "active").toBe(true); expect(items.find(item => item.id === issued[1].id)?.effective_state === "revoked").toBe(true); expect(posts).toBe(2); expect(pcWrites).toBe(0);
    phase = "pc-revision-unchanged"; expect(hash((await api(a, `/api/towers/${own.id}`)).data) === pcHash).toBe(true); phase = "complete";
  } catch (error) {
    const data = error as { name?: unknown; matcherResult?: { name?: unknown } } | null;
    const candidate = data?.matcherResult?.name;
    const matcher = typeof candidate === "string" && ["toBe", "toHaveCount", "toBeEnabled", "toBeDisabled", "toBeChecked"].includes(candidate) ? candidate : null;
    const timeout = data?.name === "TimeoutError" || data?.name === "TestTimeoutError";
    failure = { phase, posts, deletes: deletes.length, pc_writes: pcWrites, matcher, error_enum: timeout ? "timeout" : matcher ? "assertion" : "test_failure", observation };
  }
  finally {
    beforeCleanup = { posts, deletes: deletes.length, pc_writes: pcWrites };
    for (const item of issued) try { if (plan) cleanupFailed = ![204, 404].includes((await api(a, `/api/tower-plans/${plan.id}/shares/${item.id}`, "DELETE", { expected_plan_revision: item.plan_revision })).status) || cleanupFailed; } catch { cleanupFailed = true; }
    try { if (plan) cleanupFailed = ![204, 404].includes((await api(a, `/api/tower-plans/${plan.id}`, "DELETE", { expected_plan_revision: plan.revision })).status) || cleanupFailed; } catch { cleanupFailed = true; }
    try { if (own) cleanupFailed = ![204, 404].includes((await api(a, `/api/towers/${own.id}`, "DELETE")).status) || cleanupFailed; } catch { cleanupFailed = true; }
    finally { try { await context.close(); } catch { cleanupFailed = true; } }
  }
  if (failure || cleanupFailed) throw new Error(JSON.stringify({ ...(failure ?? { phase: "cleanup", ...beforeCleanup, matcher: null, error_enum: "cleanup", observation }), cleanup: cleanupFailed ? "failed" : "completed" }));
});
