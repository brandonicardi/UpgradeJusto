import { expect, type BrowserContext, type Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { evidenceApi } from "./visual-evidence";

export async function routeEvidence(context: BrowserContext, width: number, group: "catalog" | "account-pcs-import" | "chat-empty" | "admin-readonly", run: (evidence: {
  page: import("@playwright/test").Page;
  phase: (name: string) => void;
  cleanup: (action: () => Promise<void>) => void;
  shot: (file: string, anchor: Locator, top?: boolean) => Promise<void>;
}) => Promise<void>) {
  const parent = path.resolve(process.cwd(), "../.local/integral38/v0-routes"); await mkdir(parent, { recursive: true });
  const directory = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`); await mkdir(directory);
  const page = await context.newPage(); await page.setViewportSize({ width, height: width === 390 ? 844 : 900 }); page.setDefaultTimeout(5000);
  let phase = "setup", failed = false, cleanupFailed = false;
  const cleanup: (() => Promise<void>)[] = [], captures: { file: string; horizontal_overflow: boolean }[] = [];
  const writes = { extraction_posts: 0, message_posts: 0, admin_writes: 0 };
  page.on("request", request => {
    const pathname = new URL(request.url()).pathname, method = request.method();
    if (method === "POST" && /\/extract(?:ion|ions)?(?:\/|$)/.test(pathname)) writes.extraction_posts++;
    if (method === "POST" && /^\/api\/conversations\/[^/]+\/messages$/.test(pathname)) writes.message_posts++;
    if (!["GET", "HEAD"].includes(method) && pathname.startsWith("/api/admin/")) writes.admin_writes++;
  });
  try {
    await run({ page, phase: name => { phase = name; }, cleanup: action => cleanup.push(action), shot: async (file, anchor, top = false) => {
      await expect(anchor).toBeVisible();
      if (top) await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      else await anchor.evaluate(element => element.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
      await page.evaluate(async () => { await document.fonts.ready; });
      await expect.poll(() => page.locator(".tower-product-photo").evaluateAll(photos => photos.every(photo => {
        const box = photo.getBoundingClientRect();
        if (!box.width || !box.height || box.bottom <= 0 || box.top >= innerHeight) return true;
        const image = photo.querySelector("img");
        return image ? image.complete && image.naturalWidth > 0 && photo.getAttribute("data-photo-state") === "loaded" : photo.getAttribute("data-photo-state") === "unavailable";
      })), { timeout: 5000, message: "Published visible photos must really load; absent photos remain explicit" }).toBe(true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      await page.screenshot({ path: path.join(directory, file), animations: "disabled" }); captures.push({ file, horizontal_overflow: overflow });
      expect(overflow).toBe(false);
    } });
    expect(writes).toEqual({ extraction_posts: 0, message_posts: 0, admin_writes: 0 }); phase = "complete";
  } catch { failed = true; }
  finally {
    for (const action of cleanup.reverse()) try { await action(); } catch { cleanupFailed = true; }
    try { await writeFile(path.join(directory, "index.json"), JSON.stringify({ group, width, phase, state: failed || cleanupFailed ? "incomplete" : "complete", captures, writes, cleanup: cleanupFailed ? "failed" : "completed", reservations: ["cu02_input_only_no_recovered_proposal", "chat_empty_history_live_blocked", "cu09_separate_gate_deferred"] }, null, 2), { flag: "wx" }); }
    finally { await context.close(); }
  }
  if (failed || cleanupFailed) throw new Error(JSON.stringify({ group, width, phase, error_enum: cleanupFailed ? "route_cleanup" : "route_evidence", writes }));
}

export async function ownRouteSession(page: import("@playwright/test").Page) {
  await page.goto("/catalog");
  const credentials = { email: `routes-${randomUUID()}@example.test`, password: randomUUID() };
  expect((await evidenceApi(page, "/api/auth/register", "POST", credentials)).status).toBe(201);
  expect((await evidenceApi(page, "/api/auth/login", "POST", credentials)).status).toBe(200);
  return credentials;
}
