// Общие типы единой системы расчётов здоровья (M1–M8).
// См. .lovable/plan.md — раздел «Архитектура модулей».

export type SystemKey =
  | "cardiovascular"
  | "metabolism"
  | "inflammation"
  | "endocrine"
  | "energy";

export type MarkerZone = "optimal" | "normal" | "risk" | "critical" | "unknown";

/**
 * Норма биомаркера (Longevity Range).
 * optimal_* — целевой коридор; normal_* — допустимый клинический;
 * за пределами normal начинается risk → critical.
 */
export interface MarkerRange {
  optimal_min: number | null;
  optimal_max: number | null;
  normal_min: number | null;
  normal_max: number | null;
  /** Жёсткие границы «critical». Если null — берём normal ± 50 %. */
  critical_min?: number | null;
  critical_max?: number | null;
  is_critical?: boolean;
  /** Базовый вес маркера внутри системы (default 1). */
  base_weight?: number;
}

export interface MarkerInput {
  code: string;
  value: number;
  system: SystemKey | null;
  range: MarkerRange;
}

/** Результат нормализации M1 для одного маркера. */
export interface MarkerScore {
  code: string;
  system: SystemKey | null;
  /** Скор [0..1], 1 = оптимум. */
  score: number;
  /** Штраф в баллах HI (для агрегации). */
  penalty: number;
  zone: MarkerZone;
  /** Итоговый вес с учётом критичности. */
  weight_effective: number;
}

export interface SystemScore {
  system: SystemKey;
  /** 0..100 или null, если данных недостаточно. */
  score: number | null;
  markers_used: number;
  markers_total: number;
  coverage: number;
  insufficient: boolean;
}

export interface HealthIndexBreakdown {
  hi: number;
  hi_raw: number;
  dispersion_penalty: number;
  improvement_bonus: number;
  system_scores: SystemScore[];
}

/** Все коэффициенты модели, загружаются из health_model_settings. */
export interface HealthModelSettings {
  system_weights: Record<SystemKey, number>;
  hi_range: { min: number; max: number };
  bio_age_blend: { phenoage: number; kdm: number };
  ba_corridor: { years_below: number; years_above: number };
  penalties: {
    critical_marker: number;
    risk_marker: number;
    acceptable_marker: number;
    /** Дополнительный множитель явного штрафа за маркеры вне оптимума внутри M3. */
    system_marker_penalty_scale: number;
    /** [DEPRECATED] Прежний штраф за долю risk/critical (доля от весов). Сохранён для совместимости, не используется. */
    system_bad_share_penalty: number;
    /** Абсолютный штраф к скору системы за каждый risk-маркер (не зависит от размера панели). */
    system_risk_marker_penalty: number;
    /** Абсолютный штраф к скору системы за каждый critical-маркер. */
    system_critical_marker_penalty: number;
    dispersion_k: number;
    coverage_threshold: number;
    min_markers_per_system: number;
  };
  bonuses: {
    improvement_hi_delta: number;
    improvement_years_delta: number;
    all_green_system_bonus: number;
  };
  critical_marker_weight_multiplier: number;
  aging_pace: {
    min_history_points: number;
    max_history_points: number;
    first_analysis_value: number | null;
  };
}

export const DEFAULT_HEALTH_MODEL_SETTINGS: HealthModelSettings = {
  system_weights: {
    cardiovascular: 0.28,
    metabolism: 0.26,
    inflammation: 0.18,
    endocrine: 0.15,
    energy: 0.13,
  },
  hi_range: { min: 5, max: 97 },
  bio_age_blend: { phenoage: 0.5, kdm: 0.5 },
  ba_corridor: { years_below: 15, years_above: 15 },
  penalties: {
    critical_marker: 25,
    risk_marker: 8,
    acceptable_marker: 3,
    system_marker_penalty_scale: 2,
    system_bad_share_penalty: 15,
    dispersion_k: 0.5,
    coverage_threshold: 0.4,
    min_markers_per_system: 3,
  },
  bonuses: {
    improvement_hi_delta: 3,
    improvement_years_delta: -0.3,
    all_green_system_bonus: 2,
  },
  critical_marker_weight_multiplier: 1.5,
  aging_pace: {
    min_history_points: 2,
    max_history_points: 4,
    first_analysis_value: null,
  },
};
