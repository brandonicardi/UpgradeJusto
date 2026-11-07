import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testMatch: "catalogo-datos.spec.ts", workers: 1, retries: 0, outputDir: "../.local/tiendas/catalog-data-runner", reporter: [["list"]], use: { ...base.use, trace: "off", video: "off", screenshot: "off" } });
