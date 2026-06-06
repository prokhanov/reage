/** Normalize phone to digits-only, RU-style (leading 7 for 10/11-digit numbers). */
export function normalizePhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }
  if (digits.length === 10) {
    digits = "7" + digits;
  }
  return digits;
}

export function isValidPhone(raw: string): boolean {
  const d = normalizePhone(raw);
  return d.length === 11 && d.startsWith("7");
}

export function formatPhoneRu(raw: string): string {
  const d = normalizePhone(raw);
  if (d.length !== 11) return raw;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}
