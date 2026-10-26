import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("contrato de arranque E2E local de producción", () => {
  it("desactiva logging Next dev para no registrar capacidades bearer y conserva poweredByHeader", () => {
    expect(nextConfig.logging).toBe(false);
    expect(nextConfig.poweredByHeader).toBe(false);
  });
  it("usa start con custom server, sin dev ni reutilización de procesos", () => {
    // Static guard: importing Playwright config into Vitest would initialize another runner.
    const config = readFileSync(new URL("../../playwright.config.ts", import.meta.url), "utf8");
    const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    expect(config).toContain('command: "npm run start"');
    expect(config).not.toContain('command: "npm run dev"');
    expect(config.match(/reuseExistingServer: false/g)).toHaveLength(2);
    expect(config).toContain("--no-proxy-headers");
    expect(config).toContain("--no-access-log");
    expect(config).toContain("../.local/ms-playwright");
    expect(manifest.scripts.start).toBe("node server.mjs");
  });

  it("el gate auth no importa diagnósticos ni permite retorno anticipado", () => {
    const auth = readFileSync(new URL("../e2e/auth.spec.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("../../playwright.config.ts", import.meta.url), "utf8");
    expect(config).toContain('testDir: "./tests/e2e"');
    expect(config).not.toContain("hydration-diagnostic");
    expect(auth).not.toContain("process.env");
    expect(auth).not.toContain("diagnoseHydration");
    expect(auth).not.toContain("hydration-diagnostic");
    expect(auth).not.toMatch(/\breturn\b/);
    expect(auth).toContain('mutation("register")');
    expect(auth).toContain('mutation("login")');
    expect(auth).toContain('mutation("logout")');
    expect(auth).toContain("expect(await sessionStatus()).toBe(401)");
  });
});
