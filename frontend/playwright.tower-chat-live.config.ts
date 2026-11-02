import { defineConfig } from "@playwright/test";
import base from "./playwright.live.config";

export default defineConfig({ ...base, testMatch: "tower-context.spec.ts", outputDir: "../.local/playwright-tower-chat-live-results", use: { ...base.use, trace: "off", screenshot: "off", video: "off" } });
