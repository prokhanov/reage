import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface CheckupPriceRow {
  slug: string;
  price: number;
  is_active: boolean;
  cbc_bonus_enabled: boolean;
}

export interface CheckupDoctor {
  id: string;
  name: string;
  specialty: string;
  credentials: string[];
  description: string;
  consultation_price: number;
  consultation_enabled: boolean;
}

export const DEFAULT_DOCTOR: CheckupDoctor = {
  id: "",
  name: "Наталья Чезганова",
  specialty: "Врач-терапевт",
  credentials: ["Кардиолог", "GMC, Великобритания", "Стаж 7+ лет"],
  description:
    "Врач с более чем 7-летним клиническим опытом в терапии, кардиологии, сердечно-сосудистой хирургии и амбулаторной медицине. Зарегистрирована в General Medical Council (GMC), Великобритания. Помогает разобраться в результатах анализов и оценить их в контексте общего состояния здоровья.",
  consultation_price: 2990,
  consultation_enabled: true,
};

/** Показатель, привязанный к чекапу в админке. */
export interface CheckupMarkerRow {
  id: string;
  checkup_slug: string;
  biomarker_id: string | null;
  title: string;
  description: string;
  /** Система организма из «Управления данными» (если маркер привязан). */
  category: string | null;
  category_order: number;
  display_order: number;
}

/** Вариант чекапа (например, Базовый / Полный / Расширенный). */
export interface CheckupVariantRow {
  slug: string;
  parent_slug: string;
  label: string;
  display_order: number;
  is_popular: boolean;
}

interface CheckupSettingsData {
  prices: Record<string, CheckupPriceRow>;
  doctor: CheckupDoctor;
  markers?: Record<string, CheckupMarkerRow[]>;
  variants?: CheckupVariantRow[];
}

/**
 * Кэш последних настроек в localStorage: без него первый рендер показывает
 * хардкод-цену из каталога, и через секунду она «прыгает» на цену из базы.
 */
const STORAGE_KEY = "reage:checkup:settings";

function readStoredSettings(): CheckupSettingsData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.prices) return null;
    return {
      prices: parsed.prices as Record<string, CheckupPriceRow>,
      doctor: (parsed.doctor as CheckupDoctor) ?? DEFAULT_DOCTOR,
      markers: parsed.markers,
      variants: parsed.variants,
    };
  } catch {
    return null;
  }
}

function writeStoredSettings(data: CheckupSettingsData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

/** Кэш на уровне модуля, чтобы не перезапрашивать на каждой странице чекапа. */
let cache: CheckupSettingsData | null =
  typeof window !== "undefined" ? readStoredSettings() : null;
/** Данные из localStorage — стартовые, но запрос в базу всё равно нужен. */
let cacheIsStale = cache !== null;
let inflight: Promise<CheckupSettingsData> | null = null;
const listeners = new Set<(data: CheckupSettingsData) => void>();

async function load(force = false): Promise<CheckupSettingsData> {
  if (cache && !cacheIsStale && !force) return cache;
  if (inflight && !force) return inflight;

  inflight = (async () => {
    const [pricesRes, doctorRes, markersRes, variantsRes, catsRes] = await Promise.all([
      supabase.from("checkup_settings").select("slug, price, is_active, cbc_bonus_enabled"),
      supabase
        .from("checkup_doctor_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("checkup_markers")
        .select("id, checkup_slug, biomarker_id, title, description, display_order, biomarkers(name, category)")
        .order("display_order"),
      supabase.from("checkup_variants").select("slug, parent_slug, label, display_order, is_popular").order("display_order"),
      supabase.from("biomarker_categories").select("name, display_order"),
    ]);

    const catOrder = new Map((catsRes.data ?? []).map((c) => [c.name, c.display_order ?? 999]));
    const markers: Record<string, CheckupMarkerRow[]> = {};
    for (const r of (markersRes.data ?? []) as Array<{
      id: string;
      checkup_slug: string;
      biomarker_id: string | null;
      title: string | null;
      description: string | null;
      display_order: number;
      biomarkers: { name: string; category: string } | null;
    }>) {
      const category = r.biomarkers?.category ?? null;
      (markers[r.checkup_slug] ??= []).push({
        id: r.id,
        checkup_slug: r.checkup_slug,
        biomarker_id: r.biomarker_id,
        title: r.title || r.biomarkers?.name || "Показатель",
        description: r.description ?? "",
        category,
        category_order: category ? catOrder.get(category) ?? 999 : 999,
        display_order: r.display_order,
      });
    }
    const variants = (variantsRes.data ?? []) as CheckupVariantRow[];

    const prices: Record<string, CheckupPriceRow> = {};
    for (const row of pricesRes.data ?? []) {
      prices[row.slug] = {
        slug: row.slug,
        price: row.price,
        is_active: row.is_active,
        cbc_bonus_enabled: row.cbc_bonus_enabled ?? false,
      };
    }

    const d = doctorRes.data;
    const doctor: CheckupDoctor = d
      ? {
          id: d.id,
          name: d.name,
          specialty: d.specialty ?? "",
          credentials: d.credentials ?? [],
          description: d.description ?? "",
          consultation_price: d.consultation_price ?? DEFAULT_DOCTOR.consultation_price,
          consultation_enabled: d.consultation_enabled ?? true,
        }
      : DEFAULT_DOCTOR;

    cache = { prices, doctor, markers, variants };
    cacheIsStale = false;
    writeStoredSettings(cache);
    listeners.forEach((fn) => fn(cache as CheckupSettingsData));
    return cache;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Настройки чекапов из базы: цены и данные врача. */
export function useCheckupSettings() {
  const [data, setData] = useState<CheckupSettingsData>(
    () => cache ?? { prices: {}, doctor: DEFAULT_DOCTOR },
  );
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    const listener = (next: CheckupSettingsData) => {
      if (alive) setData(next);
    };
    listeners.add(listener);
    load()
      .then((next) => {
        if (alive) {
          setData(next);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);

  const priceOf = useCallback(
    (slug: string, fallback: number) => data.prices[slug]?.price ?? fallback,
    [data],
  );

  const isActive = useCallback(
    (slug: string) => data.prices[slug]?.is_active ?? true,
    [data],
  );

  const hasCbcBonus = useCallback(
    (slug: string) => data.prices[slug]?.cbc_bonus_enabled ?? false,
    [data],
  );

  const markersOf = useCallback(
    (slug: string): CheckupMarkerRow[] | null => {
      const rows = data.markers?.[slug];
      return rows && rows.length > 0 ? rows : null;
    },
    [data],
  );

  const variantsOf = useCallback(
    (parentSlug: string) =>
      (data.variants ?? [])
        .filter((v) => v.parent_slug === parentSlug)
        .sort((a, b) => a.display_order - b.display_order),
    [data],
  );

  const variantBySlug = useCallback(
    (slug: string) => (data.variants ?? []).find((v) => v.slug === slug) ?? null,
    [data],
  );

  const refresh = useCallback(() => load(true).then(setData), []);

  return {
    prices: data.prices,
    doctor: data.doctor,
    priceOf,
    isActive,
    hasCbcBonus,
    markersOf,
    variantsOf,
    variantBySlug,
    loading,
    refresh,
  };
}
