// M1. Нормализация одного маркера → score [0..1] + штраф + зона.
//
// Принципы:
//  • score = 1 внутри optimal-коридора
//  • плавная сигмоида до границ normal (s ≈ 0.6 на границе normal)
//  • квадратичное падение в зоне risk → critical (s → 0 на critical-границе)
//  • односторонние нормы (только верхняя/нижняя граница) обрабатываются корректно
//
// Никаких внешних зависимостей — чистая функция, удобно тестировать в Deno.

import type { HealthModelSettings, MarkerInput, MarkerScore, MarkerZone } from "./types.ts";

const NORMAL_EDGE_SCORE = 0.6; // целевой score ровно на границе normal

export function normalizeMarker(
  input: MarkerInput,
  settings: HealthModelSettings,
): MarkerScore {
  const { code, value, system, range } = input;
  const zone = classifyZone(value, range);

  const score = computeScore(value, range, zone);
  const penalty = penaltyFor(zone, settings);

  const baseWeight = range.base_weight ?? 1;
  const weight_effective = range.is_critical
    ? baseWeight * settings.critical_marker_weight_multiplier
    : baseWeight;

  return { code, system, score, penalty, zone, weight_effective };
}

export function classifyZone(value: number, r: MarkerRange): MarkerZone {
  if (!Number.isFinite(value)) return "unknown";
  const inOptimal =
    (r.optimal_min == null || value >= r.optimal_min) &&
    (r.optimal_max == null || value <= r.optimal_max);
  if (inOptimal) return "optimal";

  const inNormal =
    (r.normal_min == null || value >= r.normal_min) &&
    (r.normal_max == null || value <= r.normal_max);
  if (inNormal) return "normal";

  const critMin = r.critical_min ?? (r.normal_min != null ? r.normal_min * 0.5 : null);
  const critMax = r.critical_max ?? (r.normal_max != null ? r.normal_max * 1.5 : null);

  if (
    (critMin != null && value < critMin) ||
    (critMax != null && value > critMax)
  ) {
    return "critical";
  }
  return "risk";
}

function computeScore(
  value: number,
  r: MarkerRange,
  zone: MarkerZone,
): number {
  if (zone === "unknown") return 0;
  if (zone === "optimal") return 1;

  if (zone === "normal") {
    // Сигмоидально от 1 (на границе optimal) до 0.6 (на границе normal).
    const t = sideProgress(
      value,
      r.optimal_min,
      r.optimal_max,
      r.normal_min,
      r.normal_max,
    );
    // smoothstep от 1 → 0.6
    const smooth = 1 - smoothstep(t);
    return clamp01(1 - smooth * (1 - NORMAL_EDGE_SCORE));
  }

  // risk/critical — квадратичное падение от 0.6 → 0
  const critMin =
    (r.critical_min ?? (r.normal_min != null ? r.normal_min * 0.5 : null));
  const critMax =
    (r.critical_max ?? (r.normal_max != null ? r.normal_max * 1.5 : null));
  const t = sideProgress(value, r.normal_min, r.normal_max, critMin, critMax);
  const tt = clamp01(t);
  return clamp01(NORMAL_EDGE_SCORE * (1 - tt) * (1 - tt));
}

type Range = number | null | undefined;

/**
 * Возвращает t∈[0..1]: 0 = на ближней границе, 1 = на дальней.
 * Поддерживает односторонние нормы.
 */
function sideProgress(
  v: number,
  innerMin: Range,
  innerMax: Range,
  outerMin: Range,
  outerMax: Range,
): number {
  // Снизу
  if (innerMin != null && v < innerMin) {
    if (outerMin == null) return 1;
    const span = innerMin - outerMin;
    if (span <= 0) return 1;
    return clamp01((innerMin - v) / span);
  }
  // Сверху
  if (innerMax != null && v > innerMax) {
    if (outerMax == null) return 1;
    const span = outerMax - innerMax;
    if (span <= 0) return 1;
    return clamp01((v - innerMax) / span);
  }
  return 0;
}

function penaltyFor(zone: MarkerZone, s: HealthModelSettings): number {
  switch (zone) {
    case "critical":
      return s.penalties.critical_marker;
    case "risk":
      return s.penalties.risk_marker;
    case "normal":
      return s.penalties.acceptable_marker;
    default:
      return 0;
  }
}

function smoothstep(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
