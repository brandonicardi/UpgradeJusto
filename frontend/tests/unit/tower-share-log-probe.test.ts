import { describe, expect, it } from "vitest";
import { createShareControlObserver, createShareLogScanner, shareProbeAccepted } from "../support/tower-share-log-probe";
import { SHARE_SERVER_READY, SHARE_SERVER_CLOSED } from "../../lib/share-server-boundary";
describe("bounded synthetic logging scanner, not actual Next logging evidence", () => {
  it("requires own READY then graceful completion, EOF and clean normal exit", () => {
    const observer = createShareControlObserver(); observer.push(Buffer.from(`${SHARE_SERVER_CLOSED}\n`)); expect(observer.result().graceful).toBe(false);
    const ready = `${SHARE_SERVER_READY}\n`; observer.push(Buffer.from(ready.slice(0, 7))); expect(observer.result().startup_verified).toBe(false); observer.push(Buffer.from(ready.slice(7))); observer.push(Buffer.from(`${SHARE_SERVER_CLOSED}\n`));
    expect(observer.result()).toEqual({ startup_verified: true, graceful: true });
    const result = { ...observer.result(), captureEOF: true, exit0: true, overflow: false, marker_hits: 0 }; expect(shareProbeAccepted(result)).toBe(true);
    for (const patch of [{ startup_verified: false }, { graceful: false }, { captureEOF: false }, { exit0: false }, { overflow: true }, { marker_hits: 1 }]) expect(shareProbeAccepted({ ...result, ...patch })).toBe(false);
  });
  it("scans multibyte markers across chunks independently per pipe", () => {
    const scanner = createShareLogScanner(["señal-sintética"]), bytes = Buffer.from("señal-sintética"); scanner.push(bytes.subarray(0, 3)); scanner.push(Buffer.from("other pipe"), "stderr"); scanner.push(bytes.subarray(3)); scanner.finish(); scanner.finish("stderr"); expect(scanner.result().marker_hits).toBe(1);
  });
  it("finds split capability markers without returning any captured text", () => {
    const scanner = createShareLogScanner(["SYNTHETIC_CAPABILITY"]);
    scanner.push(Buffer.from("prefix SYNTHETIC_")); scanner.push(Buffer.from("CAPABILITY suffix"));
    expect(scanner.result().marker_hits).toBe(1); expect(JSON.stringify(scanner.result()).includes("SYNTHETIC")).toBe(false);
  });
  it("fails closed on capture overflow and does not expose content", () => {
    const scanner = createShareLogScanner(["marker"], 4); scanner.push(Buffer.from("synthetic overflow"));
    expect(scanner.result().overflow).toBe(true); expect(scanner.result().bytes).toBeGreaterThan(4); expect(Object.keys(scanner.result()).sort()).toEqual(["bytes", "overflow", "marker_hits", "marker_total"].sort());
  });
});
