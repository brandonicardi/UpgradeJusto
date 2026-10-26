import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("configuración de evidencia sin iniciar Playwright", () => {
  it("usa un objeto y una sola colección de servidores heredados", () => {
    const source = readFileSync(new URL("../../playwright.design.config.ts", import.meta.url), "utf8");
    const code = source.replace(/\/\/[^\n]*/g, "");
    expect(code).toMatch(/export default defineConfig\(\{\s*\.\.\.base,/);
    expect(code).not.toMatch(/defineConfig\(\s*base\s*,/);
    expect(code.match(/^\s*webServer\s*:/gm)).toHaveLength(1);
    expect(code).toContain("base.webServer");
    expect(code).toContain('UJ_ADMIN_EMAIL: "", UJ_ADMIN_PASSWORD: ""');
    expect(code).toContain('trace: "off", video: "off", screenshot: "off"');
    const base = readFileSync(new URL("../../playwright.config.ts", import.meta.url), "utf8");
    expect(base.match(/reuseExistingServer:\s*false/g)).toHaveLength(2);
    expect(base).not.toMatch(/reuseExistingServer:\s*true/);
    expect(base).toContain(".local/ms-playwright");
  });
});
