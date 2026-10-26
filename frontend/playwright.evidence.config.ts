import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Build owns the exclusive runner and the fresh production build. Keep both
// real webServers and the project-local browser cache from the base config.
export default defineConfig(base, {
  testDir: "./tests/evidence",
  testMatch: ["current.spec.ts", "final.spec.ts"],
  workers: 1,
  retries: 0,
  fullyParallel: false,
  outputDir: "../.local/evidence/cu05-cu06-scope-v1/runner",
  reporter: [["list"]],
  use: {
    ...base.use,
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
