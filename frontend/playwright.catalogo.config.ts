import { defineConfig } from "@playwright/test";
import base from "./playwright.tiendas.config";

// Public, observational BEFORE evidence only. Approved base/central/CU09 unchanged.
export default defineConfig({
  ...base,
  testMatch: "tiendas-catalogo-antes.spec.ts",
  workers: 1, retries: 0, fullyParallel: false,
  outputDir: "../.local/tiendas/catalog-before-runner",
  reporter: [["list"]],
  use: { ...base.use, trace: "off", video: "off", screenshot: "off" },
});
