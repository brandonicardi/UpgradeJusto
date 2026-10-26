import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// This is a separate, explicit gate. It cannot silently pass without LIVE enabled,
// and never substitutes another test in the ordinary E2E suite.
if (process.env.UJ_TEST_ASSISTANT_LIVE !== "1") throw new Error("LIVE assistant gate requires UJ_TEST_ASSISTANT_LIVE=1 and real backend configuration from Build.");
export default defineConfig({
  ...base,
  testDir: "./tests/live",
  outputDir: "../.local/playwright-live-results",
  reporter: [["list"]],
  use: { ...base.use, trace: "off", screenshot: "off", video: "off" },
});
