import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testMatch: "tower-shares38.spec.ts", workers: 1, retries: 0, outputDir: "../.local/playwright-tower-shares38-results", reporter: [["list"]], use: { ...base.use, trace: "off", screenshot: "off", video: "off" } });
