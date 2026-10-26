import { defineConfig } from "@playwright/test";
import path from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(process.cwd(), "../.local/ms-playwright");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "../.local/playwright-results",
  reporter: [["list"], ["html", { outputFolder: "../.local/playwright-report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium", trace: "retain-on-failure" },
  webServer: [
    {
      command: `"${path.resolve(process.cwd(), "../backend/.venv/Scripts/python.exe")}" -m uvicorn upgradejusto.main:app --host 127.0.0.1 --port 8000 --loop asyncio --http h11 --no-proxy-headers --no-access-log`,
      cwd: path.resolve(process.cwd(), "../backend"),
      url: "http://127.0.0.1:8000/api/catalog/components",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      // Requires a fresh `npm run build` before this run (Build wrapper owns it).
      // Next dev React data can depend on its debug WebSocket; test proxy denies CONNECT.
      command: "npm run start",
      cwd: process.cwd(),
      url: "http://127.0.0.1:3000/catalog",
      reuseExistingServer: false,
      env: { CATALOG_API_URL: "http://127.0.0.1:8000", NEXT_TELEMETRY_DISABLED: "1" },
      timeout: 120000,
    },
  ],
});
