export const sessionChangedEvent = "upgradejusto:session-change";

// This controls navigation visibility only. The server remains the authority.
export function createRoleProbe(onResult: (allowed: boolean) => void, request: typeof fetch = fetch) {
  let version = 0;
  let controller: AbortController | null = null;
  function cancel() { version++; controller?.abort(); }
  return {
    invalidate() { cancel(); onResult(false); },
    dispose: cancel,
    async refresh() {
      cancel();
      const ticket = version;
      const current = new AbortController(); controller = current;
      try {
        const response = await request("/api/admin/revisions", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.any([current.signal, AbortSignal.timeout(5000)]) });
        if (ticket === version && !current.signal.aborted) onResult(response.status === 200);
      } catch { if (ticket === version && !current.signal.aborted) onResult(false); }
    },
  };
}
