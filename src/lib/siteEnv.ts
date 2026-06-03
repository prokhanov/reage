/**
 * Рантайм-определение окружения по хосту.
 *
 * Финальная архитектура:
 *   test.reage.life  → Lovable hosting  → Supabase напрямую
 *   reage.life       → Coolify/VPS      → api.reage.life → Fly proxy → Supabase
 *   www.reage.life   → редирект на reage.life
 *
 * На Lovable нельзя задать VITE_* при сборке, поэтому APP_URL/NOINDEX
 * определяем по window.location.hostname. На Coolify (бой) сборка идёт
 * с заданными переменными — используем их как fallback/override.
 */

type SiteEnv = {
  APP_URL: string;
  NOINDEX: boolean;
};

function resolve(): SiteEnv {
  const envAppUrl = import.meta.env.VITE_APP_URL as string | undefined;
  const envNoindex = import.meta.env.VITE_NOINDEX === "true";

  // SSR / build-time: используем env, иначе боевой домен по умолчанию.
  if (typeof window === "undefined") {
    return {
      APP_URL: envAppUrl || "https://reage.life",
      NOINDEX: envNoindex,
    };
  }

  const host = window.location.hostname;

  // Test-домен на Lovable — индексацию запрещаем.
  if (host === "test.reage.life") {
    return { APP_URL: "https://test.reage.life", NOINDEX: true };
  }

  // Бой.
  if (host === "reage.life" || host === "www.reage.life") {
    return { APP_URL: "https://reage.life", NOINDEX: false };
  }

  // Lovable preview / *.lovable.app / localhost — не индексируем,
  // canonical указывает на бой, чтобы не плодить дубли.
  return {
    APP_URL: envAppUrl || "https://reage.life",
    NOINDEX: true,
  };
}

export const SITE_ENV = resolve();
export const APP_URL = SITE_ENV.APP_URL;
export const NOINDEX = SITE_ENV.NOINDEX;
