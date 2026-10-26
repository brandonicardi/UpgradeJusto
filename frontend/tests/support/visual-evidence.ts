import { expect, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function evidenceDirectory() {
  const parent = path.resolve(process.cwd(), "../.local/evidence/visual-delivery-v1/final");
  await mkdir(parent, { recursive: true });
  const directory = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
  await mkdir(directory, { recursive: false });
  return directory;
}
export async function captureBoth(page: Page, directory: string, name: string, target?: Locator) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo({ top: 0, behavior: "instant" }); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Horizontal overflow in final evidence").toBe(true);
    const prefix = `${name}-${viewport.width}`;
    await page.screenshot({ path: path.join(directory, `${prefix}-viewport.png`), animations: "disabled" });
    await page.screenshot({ path: path.join(directory, `${prefix}-fullpage.png`), fullPage: true, animations: "disabled" });
    if (target) {
      await target.evaluate(element => element.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
      await page.screenshot({ path: path.join(directory, `${prefix}-resultado.png`), animations: "disabled" });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}
export async function evidenceApi(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(args.path, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(20000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}
export async function enterPrivateMessage(page: Page, text: string) {
  await page.getByLabel("Mensaje al asistente", { exact: true }).evaluate((field, value) => {
    if (!(field instanceof HTMLTextAreaElement)) throw new Error("Message field unavailable");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (!setter) throw new Error("Message field unavailable");
    setter.call(field, value); field.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
}
