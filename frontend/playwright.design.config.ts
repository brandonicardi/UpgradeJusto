import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// One object: defineConfig(base, overrides) concatenates webServer arrays.
export default defineConfig({
  ...base,
  testDir: "./tests/evidence",
  testMatch: ["design-reference.spec.ts", "visual-final.spec.ts"],
  workers: 1, retries: 0, fullyParallel: false,
  outputDir: "../.local/evidence/visual-delivery-v1/runner",
  reporter: [["list"]],
  use: { ...base.use, trace: "off", video: "off", screenshot: "off", viewport: { width: 1440, height: 1000 } },
  webServer: (Array.isArray(base.webServer) ? base.webServer : []).map(server => ({ ...server, env: { ...server.env, UJ_ADMIN_EMAIL: "", UJ_ADMIN_PASSWORD: "" } })),
});
