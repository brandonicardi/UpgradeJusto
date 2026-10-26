import { createServer } from "node:http";
import { stampSocketIP } from "./lib/gateway.ts";

const dev = process.argv.includes("--dev");
process.env.NODE_ENV = dev ? "development" : "production";
const { default: next } = await import("next");
const hostname = "127.0.0.1";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();
createServer((request, response) => {
  if (!stampSocketIP(request)) {
    response.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ detail: "Service unavailable" }));
    return;
  }
  void handle(request, response).catch(() => {
    if (!response.headersSent) {
      response.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ detail: "Service unavailable" }));
    } else response.destroy();
  });
}).listen(port, hostname);
