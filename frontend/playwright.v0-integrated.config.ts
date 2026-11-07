import { defineConfig } from "@playwright/test";
import base from "./playwright.tiendas.config";
export default defineConfig({ ...base, testMatch: "v0-integrated.spec.ts", workers: 1, retries: 0, outputDir: "../.local/tiendas/v0-integrated-runner", reporter: [["list"]], use: { ...base.use, trace: "off", video: "off", screenshot: "off" } });
