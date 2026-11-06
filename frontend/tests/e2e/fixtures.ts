import { test as base, type BrowserContext } from "@playwright/test";
import { applicationOrigin, createSocketProxy } from "../support/socket-proxy";
import { imageEvidenceBypass, imageEvidenceHeaders, imageEvidenceURL } from "../support/image-evidence-policy";

type LocalProxy = Awaited<ReturnType<typeof createSocketProxy>>;
let developmentServer: boolean | undefined;
/** El servidor de desarrollo necesita su WebSocket de HMR para hidratar. */
async function isDevelopmentServer() {
  if (developmentServer !== undefined) return developmentServer;
  try {
    const response = await fetch(`${applicationOrigin}/pcs`, { cache: "no-store" });
    developmentServer = response.ok && (await response.text()).includes("_development_");
  } catch { developmentServer = false; }
  return developmentServer;
}
export const test = base.extend<{ socketProxy: LocalProxy; newIsolatedContext: () => Promise<BrowserContext>; newImageEvidenceContext: () => Promise<BrowserContext> }>({
  socketProxy: async ({ browserName }, provide) => {
    if (browserName !== "chromium") throw new Error("Socket proxy fixture requires configured Chromium");
    const proxy = await createSocketProxy({ allowDevHmr: await isDevelopmentServer() });
    try { await provide(proxy); }
    finally {
      await proxy.close();
      if (!proxy.stats.forwarded || !proxy.stats.connected || !proxy.stats.sourceVerified) throw new Error("Browser did not use the test-owned source socket; no direct fallback");
    }
  },
  context: async ({ browser, socketProxy }, provide) => {
    const context = await browser.newContext({ baseURL: applicationOrigin, proxy: { server: socketProxy.server, bypass: "<-loopback>" } });
    try { await provide(context); }
    finally { await context.close(); }
  },
  newImageEvidenceContext: async ({ browser, socketProxy }, provide) => {
    const contexts: BrowserContext[] = [];
    try {
      await provide(async () => {
        // Fresh, no inherited storage/headers. Default context/isolated fixture
        // remain app-only. Normal TLS; only these vendor hosts bypass proxy.
        const context = await browser.newContext({ baseURL: applicationOrigin, serviceWorkers: "block", proxy: { server: socketProxy.server, bypass: imageEvidenceBypass } });
        contexts.push(context);
        await context.route("**/*", async route => {
          const request = route.request();
          if (new URL(request.url()).origin === applicationOrigin) { await route.continue(); return; }
          if (!imageEvidenceURL(request.url(), request.method(), request.resourceType())) { await route.abort(); return; }
          await route.continue({ headers: imageEvidenceHeaders(request.headers()) });
        });
        return context; // Global routing installed before caller can create pages.
      });
    } finally { await Promise.allSettled(contexts.map(context => context.close())); }
  },
  newIsolatedContext: async ({ browser, socketProxy }, provide) => {
    const contexts: BrowserContext[] = [];
    try {
      await provide(async () => {
        // Explicit for EVERY A/B context; do not rely on test.use inheritance.
        const context = await browser.newContext({ baseURL: applicationOrigin, proxy: { server: socketProxy.server, bypass: "<-loopback>" } });
        contexts.push(context); return context;
      });
    } finally { await Promise.allSettled(contexts.map(context => context.close())); }
  },
});
