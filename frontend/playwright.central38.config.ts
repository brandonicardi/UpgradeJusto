import { defineConfig } from "@playwright/test";
import base from "./playwright.integral38.config";

// One object: preserve both real servers and the inherited project browser cache.
// The approved entry configuration and its testMatch remain unchanged.
export default defineConfig({
  ...base,
  testMatch: "integral38-central.spec.ts",
  outputDir: "../.local/integral38/central-runner",
  use: { ...base.use, trace: "off", video: "off", screenshot: "off" },
});
