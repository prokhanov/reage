/**
 * Landing bootstrap: одноразовый батч-запрос всех публичных данных лендинга
 * (планы, цены, биомаркеры, лаборатории, контекст карты) в одну Edge Function.
 *
 * Заменяет 7 параллельных запросов к Supabase, которые раньше блокировали LCP
 * на мобильных сетях. Кэшируется на CDN на 60s + stale-while-revalidate.
 *
 * Вызывается из main.tsx ДО mount React, поэтому запрос стартует одновременно
 * с парсингом JS-бандла — не ждём React Query, не ждём ре-рендеров.
 */

import { SUPABASE_BASE_URL, SUPABASE_ANON_KEY, edgeFunctionUrl } from "./supabaseUrl";

export interface LandingBootstrapData {
  plans: any[];
  pricing: any[];
  planBiomarkers: Array<{ plan_id: string; biomarker_id: string }>;
  biomarkers: Array<{ id: string; name: string; category: string; display_order: number }>;
  biomarkerCategories: Array<{ name: string; display_order: number }>;
  labLocations: any[];
  labMapContext: any | null;
  generatedAt: string;
}

let bootstrapPromise: Promise<LandingBootstrapData> | null = null;

export function landingBootstrapUrl(): string {
  return edgeFunctionUrl("landing-bootstrap");
}

export function preloadLandingBootstrap(): Promise<LandingBootstrapData> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const res = await fetch(landingBootstrapUrl(), {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`landing-bootstrap ${res.status}`);
    return (await res.json()) as LandingBootstrapData;
  })().catch((err) => {
    // Сбрасываем кэш, чтобы отдельные хуки могли повторить попытку через
    // индивидуальные запросы к Supabase (fallback внутри queryFn).
    bootstrapPromise = null;
    throw err;
  });
  return bootstrapPromise;
}

/** Промис уже в полёте? Возвращает его, но не инициирует новый. */
export function getLandingBootstrap(): Promise<LandingBootstrapData> | null {
  return bootstrapPromise;
}
