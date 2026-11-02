import { defineConfig } from "@playwright/test";
import base from "./playwright.integral38.config";

// Public, observational BEFORE evidence only. Approved base/central/CU09 unchanged.
export default defineConfig({
  ...base,
  testMatch: "integral38-catalog-before.spec.ts",
  workers: 1, retries: 0, fullyParallel: false,
  outputDir: "../.local/integral38/catalog-before-runner",
  reporter: [["list"]],
  use: { ...base.use, trace: "off", video: "off", screenshot: "off" },
});
