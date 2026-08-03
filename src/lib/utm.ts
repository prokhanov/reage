// First-touch UTM capture for landing leads.
// Stored in sessionStorage so the values survive navigation inside the SPA
// (including a direct landing on /lifestyle-test or any quiz page).

const STORAGE_KEY = "reage_utm";

export interface UtmData {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
}

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function read(): UtmData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmData) : null;
  } catch {
    return null;
  }
}

/** Call once on app boot. Keeps the first-touch values. */
export function captureUtm(): UtmData {
  if (typeof window === "undefined") return {};

  const existing = read();
  const params = new URLSearchParams(window.location.search);
  const fresh: UtmData = {};
  let hasUtm = false;

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      fresh[key] = value.slice(0, 200);
      hasUtm = true;
    }
  }

  // Keep the first-touch attribution unless a new campaign arrives.
  if (existing && !hasUtm) return existing;

  const data: UtmData = {
    ...fresh,
    referrer: document.referrer ? document.referrer.slice(0, 500) : null,
    landing_page: `${window.location.pathname}${window.location.search}`.slice(0, 500),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable */
  }
  return data;
}

/** Read the stored attribution (falls back to capturing it now). */
export function getUtm(): UtmData {
  if (typeof window === "undefined") return {};
  return read() ?? captureUtm();
}
