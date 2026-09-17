import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface CheckupPriceRow {
  slug: string;
  price: number;
  is_active: boolean;
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
  consultation_price: 3500,
  consultation_enabled: true,
};

interface CheckupSettingsData {
  prices: Record<string, CheckupPriceRow>;
  doctor: CheckupDoctor;
}

/** Кэш на уровне модуля, чтобы не перезапрашивать на каждой странице чекапа. */
let cache: CheckupSettingsData | null = null;
let inflight: Promise<CheckupSettingsData> | null = null;
const listeners = new Set<(data: CheckupSettingsData) => void>();

async function load(force = false): Promise<CheckupSettingsData> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;

  inflight = (async () => {
    const [pricesRes, doctorRes] = await Promise.all([
      supabase.from("checkup_settings").select("slug, price, is_active"),
      supabase
        .from("checkup_doctor_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const prices: Record<string, CheckupPriceRow> = {};
    for (const row of pricesRes.data ?? []) {
      prices[row.slug] = {
        slug: row.slug,
        price: row.price,
        is_active: row.is_active,
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

    cache = { prices, doctor };
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

  const refresh = useCallback(() => load(true).then(setData), []);

  return { prices: data.prices, doctor: data.doctor, priceOf, isActive, loading, refresh };
}
