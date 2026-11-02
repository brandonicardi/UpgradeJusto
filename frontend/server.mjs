import { createServer } from "node:http";
import { stampSocketIP } from "./lib/gateway.ts";
import { createShareRequestListener, testShareServerControl, SHARE_SERVER_READY, SHARE_SERVER_STOP, SHARE_SERVER_CLOSED } from "./lib/share-server-boundary.ts";

// Must reject invalid TEST control before importing Next or opening resources.
const controlled = testShareServerControl(process.env);

const dev = process.argv.includes("--dev");
process.env.NODE_ENV = dev ? "development" : "production";
const { default: next } = await import("next");
const hostname = "127.0.0.1";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();
const requests = createShareRequestListener(handle, stampSocketIP);
const server = createServer(requests.listener);
if (controlled) {
  const { createInterface } = await import("node:readline");
  const input = createInterface({ input: process.stdin });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try {
      await new Promise((resolve, reject) => server.close(error => error ? reject(new Error("Share TEST close unavailable")) : resolve()));
      await requests.drain();
      await app.close();
      input.close(); process.stdin.pause();
      process.stdout.write(`${SHARE_SERVER_CLOSED}\n`);
    } catch { input.close(); process.stdin.pause(); process.exitCode = 1; process.stderr.write("UJ_SHARE_TEST_CLOSE_FAILED\n"); }
  };
  input.on("line", line => { if (line === SHARE_SERVER_STOP) void stop(); });
  server.once("error", () => { input.close(); process.stdin.pause(); process.exitCode = 1; process.stderr.write("UJ_SHARE_TEST_START_FAILED\n"); void app.close().catch(() => undefined); });
}
server.listen(port, hostname, () => { if (controlled) process.stdout.write(`${SHARE_SERVER_READY}\n`); });
