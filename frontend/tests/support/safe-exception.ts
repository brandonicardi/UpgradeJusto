// Classify locally; NEVER return the message/name/stack supplied by the exception.
export function safeExceptionCategory(error: unknown): "typeerror" | "assertion" | "navigation" | "strictmode" | "unknown" {
  if (!(error instanceof Error)) return "unknown";
  const message = error.message;
  if (/strict mode violation/i.test(message)) return "strictmode";
  if (error instanceof TypeError || error.name === "TypeError") return "typeerror";
  if (/page\.goto|navigation|net::ERR_|frame was detached|page has been closed/i.test(message)) return "navigation";
  if (error.name === "AssertionError" || /expect\(|toContainText|toBeVisible|toEqual|toBe\(/.test(message)) return "assertion";
  return "unknown";
}
