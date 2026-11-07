import { defineConfig } from "@playwright/test";
import base from "./playwright.tiendas.config";

// One object: preserve both real servers and the inherited project browser cache.
// The approved entry configuration and its testMatch remain unchanged.
export default defineConfig({
  ...base,
  testMatch: "tiendas-central.spec.ts",
  outputDir: "../.local/tiendas/central-runner",
  use: { ...base.use, trace: "off", video: "off", screenshot: "off" },
});
