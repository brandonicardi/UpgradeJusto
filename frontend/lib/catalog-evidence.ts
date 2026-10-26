export function hasDocumentedConflict(attributes: Record<string, string | null>): boolean {
  if (Object.entries(attributes).some(([key, value]) => /conflict/i.test(key) && value !== null && !["", "false", "0", "[]", "{}"].includes(value))) return true;
  const raw = attributes.basic_stock_v1;
  if (!raw) return false;
  try {
    const metadata: unknown = JSON.parse(raw);
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
    const root = metadata as Record<string, unknown>;
    const conflicts = root.conflicts;
    if (conflicts && typeof conflicts === "object" && Object.keys(conflicts).length > 0) return true;
    const data = root.data;
    return !!data && typeof data === "object" && !Array.isArray(data) && (data as Record<string, unknown>).capacity_conflict === true;
  } catch { return false; } // Absence of a readable flag never asserts compatibility.
}
