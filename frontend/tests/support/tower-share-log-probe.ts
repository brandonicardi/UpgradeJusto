import { spawn } from "node:child_process";
import { connect } from "node:net";
import { StringDecoder } from "node:string_decoder";
import { SHARE_SERVER_READY, SHARE_SERVER_STOP, SHARE_SERVER_CLOSED, testShareServerControl } from "../../lib/share-server-boundary";

export function createShareLogScanner(markers: readonly string[], limit = 262144) {
  if (!markers.length || markers.some(value => !value || value.length > 4096)) throw new Error("Invalid probe markers");
  let bytes = 0, overflow = false;
  const seen = markers.map(() => false), carry = Math.max(...markers.map(value => value.length)) - 1;
  const streams = { stdout: { decoder: new StringDecoder("utf8"), tail: "" }, stderr: { decoder: new StringDecoder("utf8"), tail: "" } };
  const scan = (text: string, stream: keyof typeof streams) => { const state = streams[stream], joined = state.tail + text; markers.forEach((marker, index) => { if (joined.includes(marker)) seen[index] = true; }); state.tail = carry ? joined.slice(-carry) : ""; };
  return {
    push(chunk: Buffer, stream: keyof typeof streams = "stdout") { bytes += chunk.byteLength; if (bytes > limit) { overflow = true; streams.stdout.tail = ""; streams.stderr.tail = ""; return; } scan(streams[stream].decoder.write(chunk), stream); },
    finish(stream: keyof typeof streams = "stdout") { if (!overflow) scan(streams[stream].decoder.end(), stream); },
    result: () => Object.freeze({ bytes, overflow, marker_hits: seen.filter(Boolean).length, marker_total: seen.length }),
  };
}
export function createShareControlObserver() {
  let buffer = "", startup_verified = false, graceful = false;
  const decoder = new StringDecoder("utf8");
  return { push(chunk: Buffer) { buffer += decoder.write(chunk); let next: number; while ((next = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, next).replace(/\r$/, ""); buffer = buffer.slice(next + 1); if (line === SHARE_SERVER_READY) startup_verified = true; if (line === SHARE_SERVER_CLOSED && startup_verified) graceful = true; } if (buffer.length > 256) buffer = buffer.slice(-256); }, result: () => ({ startup_verified, graceful }) };
}
export function shareProbeAccepted(result: { startup_verified: boolean; graceful: boolean; captureEOF: boolean; exit0: boolean; overflow: boolean; marker_hits: number }) { return result.startup_verified && result.graceful && result.captureEOF && result.exit0 && !result.overflow && result.marker_hits === 0; }
async function occupied(port: number) {
  return new Promise<boolean>(resolve => { const socket = connect({ host: "127.0.0.1", port }); socket.setTimeout(1000); socket.once("connect", () => { socket.destroy(); resolve(true); }); socket.once("error", () => { socket.destroy(); resolve(false); }); socket.once("timeout", () => { socket.destroy(); resolve(true); }); });
}
async function bounded<T>(work: Promise<T>, ms: number): Promise<T | null> { let timer: ReturnType<typeof setTimeout> | undefined; try { return await Promise.race([work, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), ms); })]); } finally { if (timer) clearTimeout(timer); } }

// Build invokes only after TEST backend startup. stdout/stderr NEVER inherited.
export async function probeTowerShareWebLogs(mode: "dev" | "production", markers: readonly string[], exercise: () => Promise<void>) {
  const env = { ...process.env, UJ_TEST_SHARE_SERVER_CONTROL: "1" };
  testShareServerControl(env); // Validate TEST/DB before spawning any resources.
  if (await occupied(3000)) throw new Error("phase=preflight; error_enum=port_occupied");
  const scanner = createShareLogScanner(markers), control = createShareControlObserver();
  const child = spawn(process.execPath, ["server.mjs", ...(mode === "dev" ? ["--dev"] : [])], { cwd: process.cwd(), env, stdio: ["pipe", "pipe", "pipe"] });
  let stdoutEOF = false, stderrEOF = false, exited = false, forced = false, pipeError = false;
  let readyResolve!: (value: boolean) => void;
  const ready = new Promise<boolean>(resolve => { readyResolve = resolve; });
  child.stdout.on("data", (chunk: Buffer) => { scanner.push(chunk, "stdout"); control.push(chunk); if (control.result().startup_verified && !exited) readyResolve(true); });
  child.stderr.on("data", (chunk: Buffer) => scanner.push(chunk, "stderr"));
  child.stdout.on("end", () => { stdoutEOF = true; scanner.finish("stdout"); }); child.stderr.on("end", () => { stderrEOF = true; scanner.finish("stderr"); });
  child.stdin.on("error", () => { pipeError = true; });
  child.on("error", () => { exited = true; readyResolve(false); }); child.on("exit", () => { exited = true; readyResolve(false); });
  const closed = new Promise<boolean>(resolve => child.once("close", (code, signal) => resolve(code === 0 && signal === null)));
  let phase: "startup" | "exercise" | "shutdown" | "capture" = "startup", failed = false, exit0 = false;
  try {
    if (!(await bounded(ready, 120000)) || exited) throw new Error("Probe unavailable");
    phase = "exercise"; await exercise();
  } catch { failed = true; }
  finally {
    if (!failed) phase = "shutdown";
    if (!exited) child.stdin.end(`${SHARE_SERVER_STOP}\n`);
    const normal = await bounded(closed, 5000);
    if (normal === null) { forced = true; child.kill(); await bounded(closed, 1000); }
    exit0 = normal === true && !forced;
  }
  const result = Object.freeze({ mode, ...scanner.result(), startup_verified: control.result().startup_verified, graceful: control.result().graceful && !forced, captureEOF: stdoutEOF && stderrEOF, exit0 });
  if (!failed && exit0 && result.graceful) phase = "capture";
  if (failed || pipeError || !shareProbeAccepted(result)) throw new Error(JSON.stringify({ phase, error_enum: "web_logging_probe_failed", ...result }));
  return result;
}
