import { defineConfig } from "@playwright/test";
import base from "./playwright.integral38.config";

export default defineConfig({
  ...base,
  testMatch: ["v0-routes.spec.ts", "v0-integrated.spec.ts", "integral38-central.spec.ts"],
  timeout: 30000, workers: 1, retries: 0, fullyParallel: false,
  outputDir: "../.local/integral38/v0-routes/runner",
  reporter: [["list"]],
  use: { ...base.use, trace: "off", video: "off", screenshot: "off" },
});
