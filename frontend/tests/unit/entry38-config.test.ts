import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("gate de entrada38 sin arrancar servidores desde Vitest", () => {
  it("usa un objeto, un array heredado de servidores y ninguna captura automática", () => {
    const source = readFileSync(new URL("../../playwright.integral38.config.ts", import.meta.url), "utf8");
    expect(source).toMatch(/defineConfig\(\{\s*\.\.\.base,/);
    expect(source).not.toMatch(/defineConfig\(\s*base\s*,/);
    expect(source.match(/^\s*webServer\s*:/gm)).toHaveLength(1);
    expect(source).toContain('UJ_ADMIN_EMAIL: "", UJ_ADMIN_PASSWORD: ""');
    expect(source).toContain('testMatch: "beginner-entry.spec.ts"');
    expect(source).toContain('trace: "off", video: "off", screenshot: "off"');
    const base = readFileSync(new URL("../../playwright.config.ts", import.meta.url), "utf8");
    expect(base.match(/reuseExistingServer:\s*false/g)).toHaveLength(2);
    expect(base).toContain(".local/ms-playwright");
  });
});
