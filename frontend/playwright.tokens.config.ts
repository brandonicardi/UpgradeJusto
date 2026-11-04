import { defineConfig } from "@playwright/test";
import path from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(process.cwd(), "../.local/ms-playwright");

// Captura de referencia del cambio `tokens-y-fuentes`. Solo levanta el frontend
// (sin backend): las pantallas muestran su estado de error, que es comparable.
// Requiere un `npm run build` previo.
export default defineConfig({
  testDir: "./tests/evidence",
  testMatch: ["tokens-sin-cambios.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "../.local/evidence/tokens/runner",
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm run start",
    cwd: process.cwd(),
    url: "http://127.0.0.1:3000/",
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
    timeout: 120000,
  },
});
