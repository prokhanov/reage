// Загрузка коэффициентов модели из health_model_settings с фолбэком на дефолты.
import { DEFAULT_HEALTH_MODEL_SETTINGS, type HealthModelSettings } from "./types.ts";

type SupabaseLike = {
  from: (t: string) => {
    select: (c: string) => Promise<{ data: Array<{ key: string; value: unknown }> | null; error: unknown }>;
  };
};

/**
 * Загружает все настройки одним запросом и мёржит поверх дефолтов.
 * При ошибке/отсутствии ключа — используется дефолт.
 */
export async function loadHealthModelSettings(
  supabase: SupabaseLike,
): Promise<HealthModelSettings> {
  const out: HealthModelSettings = structuredClone(DEFAULT_HEALTH_MODEL_SETTINGS);
  try {
    const { data, error } = await supabase
      .from("health_model_settings")
      .select("key,value");
    if (error || !data) return out;
    for (const row of data) {
      applySetting(out, row.key, row.value);
    }
  } catch {
    // молча возвращаем дефолты
  }
  return out;
}

function applySetting(out: HealthModelSettings, key: string, value: unknown): void {
  if (value === null || value === undefined) return;
  switch (key) {
    case "system_weights":
      Object.assign(out.system_weights, value as object);
      break;
    case "hi_range":
      Object.assign(out.hi_range, value as object);
      break;
    case "bio_age_blend":
      Object.assign(out.bio_age_blend, value as object);
      break;
    case "ba_corridor":
      Object.assign(out.ba_corridor, value as object);
      break;
    case "penalties":
      Object.assign(out.penalties, value as object);
      break;
    case "bonuses":
      Object.assign(out.bonuses, value as object);
      break;
    case "critical_marker_weight_multiplier":
      if (typeof value === "number") out.critical_marker_weight_multiplier = value;
      break;
    case "aging_pace":
      Object.assign(out.aging_pace, value as object);
      break;
  }
}
