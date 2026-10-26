import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
if (process.env.UJ_TEST_EXTRACTION_LIVE !== "1") throw new Error("CU02/CU10 LIVE requires UJ_TEST_EXTRACTION_LIVE=1. No fallback or skip.");
if (!process.env.UJ_ADMIN_EMAIL || !process.env.UJ_ADMIN_PASSWORD) throw new Error("Build must inject the existing test admin credentials into the test runner only.");
export default defineConfig({
  ...base,
  testDir: "./tests/curation",
  outputDir: "../.local/playwright-curation-results",
  reporter: [["list"]],
  use: { ...base.use, trace: "off", screenshot: "off", video: "off" },
  webServer: (Array.isArray(base.webServer) ? base.webServer : []).map(server => ({ ...server, env: { ...server.env, UJ_ADMIN_EMAIL: "", UJ_ADMIN_PASSWORD: "" } })),
});
