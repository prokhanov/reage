/**
 * Централизованный helper для построения URL к Supabase / reverse-proxy.
 *
 * VITE_SUPABASE_URL может быть:
 *   - URL обратного прокси: https://api.reage.life
 *   - URL тестового обратного прокси: https://api-test.reage.life
 *
 * Trailing slash нормализуется, чтобы оба варианта (с "/" и без) работали одинаково.
 */

// Дефолт — reverse-proxy для обхода сетевых блокировок на стороне браузера.
const DEFAULT_SUPABASE_URL = "https://api.reage.life";

const RAW_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const RAW_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function normalizeSupabaseUrl(url?: string) {
  const clean = (url && url.length > 0 ? url : DEFAULT_SUPABASE_URL).replace(/\/+$/, "");

  // В браузере не используем прямой backend-host: у части пользователей он
  // блокируется провайдерами и `fetch()` падает как Load failed без HTTP-статуса.
  if (/\.supabase\.co$/i.test(new URL(clean).hostname)) {
    return DEFAULT_SUPABASE_URL;
  }

  return clean;
}

export const SUPABASE_BASE_URL = normalizeSupabaseUrl(RAW_URL);
export const SUPABASE_ANON_KEY = (RAW_KEY ?? "") as string;

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Set it in your hosting environment variables (Coolify / Vercel / etc.) and redeploy."
  );
}

/** URL Supabase Edge Function по имени. */
export function edgeFunctionUrl(name: string): string {
  return `${SUPABASE_BASE_URL}/functions/v1/${name}`;
}
