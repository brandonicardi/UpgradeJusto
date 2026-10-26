export function retryAfterHeaders(status: number, value: string | null): Record<string, string> {
  if (status !== 429 || !value) return {};
  const seconds = /^\d{1,8}$/.test(value);
  const date = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value) && Number.isFinite(Date.parse(value));
  return seconds || date ? { "Retry-After": value } : {};
}
