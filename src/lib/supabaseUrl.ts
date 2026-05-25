/**
 * Централизованный helper для построения URL к Supabase / reverse-proxy.
 *
 * VITE_SUPABASE_URL может быть:
 *   - прямой URL Supabase:  https://ilxgodhosirhhkffqryw.supabase.co
 *   - URL обратного прокси: https://test.reage.life/supabase
 *
 * Trailing slash нормализуется, чтобы оба варианта (с "/" и без) работали одинаково.
 */

const RAW_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const RAW_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const SUPABASE_BASE_URL = (RAW_URL ?? "").replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = (RAW_KEY ?? "") as string;

if (!SUPABASE_BASE_URL || !SUPABASE_ANON_KEY) {
  // Падаем громко на старте, чтобы не словить молчаливые 404/CORS в рантайме.
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Set them in your hosting environment variables (Coolify / Vercel / etc.) and redeploy."
  );
}

/** URL Supabase Edge Function по имени. */
export function edgeFunctionUrl(name: string): string {
  return `${SUPABASE_BASE_URL}/functions/v1/${name}`;
}
