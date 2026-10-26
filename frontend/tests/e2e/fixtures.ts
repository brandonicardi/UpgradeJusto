import { test as base, type BrowserContext } from "@playwright/test";
import { applicationOrigin, createSocketProxy } from "../support/socket-proxy";

type LocalProxy = Awaited<ReturnType<typeof createSocketProxy>>;
export const test = base.extend<{ socketProxy: LocalProxy; newIsolatedContext: () => Promise<BrowserContext> }>({
  socketProxy: async ({ browserName }, provide) => {
    if (browserName !== "chromium") throw new Error("Socket proxy fixture requires configured Chromium");
    const proxy = await createSocketProxy();
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
