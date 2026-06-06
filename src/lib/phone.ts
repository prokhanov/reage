/** Normalize phone to digits-only with country prefix. */
export function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

/** Keep legacy RU-specific validation for backward compatibility. */
export function isValidPhone(raw: string): boolean {
  const d = normalizePhone(raw);
  return d.length === 11 && d.startsWith("7");
}

/** Format phone as +7 (999) 123-45-67 for display. */
export function formatPhoneRu(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length !== 11 || !d.startsWith("7")) return raw;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}
