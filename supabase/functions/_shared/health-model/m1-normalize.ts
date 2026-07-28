// M1. Нормализация одного маркера → score [0..1] + штраф + зона.
//
// Принципы:
//  • score = 1 внутри optimal-коридора
//  • плавная сигмоида до границ normal (s ≈ 0.6 на границе normal)
//  • квадратичное падение в зоне risk → critical (s → 0 на critical-границе)
//  • односторонние нормы (только верхняя/нижняя граница) обрабатываются корректно
//
// Никаких внешних зависимостей — чистая функция, удобно тестировать в Deno.

import type { HealthModelSettings, MarkerInput, MarkerRange, MarkerScore, MarkerZone } from "./types.ts";
import { getBorderlineInfo, BORDERLINE_BAND_PERCENT } from "../borderline.ts";

const NORMAL_EDGE_SCORE = 0.6; // целевой score ровно на границе normal
/** Насколько «просаживается» score внутри пограничного коридора (0.6 → 0.45). */
const BORDERLINE_SCORE_DROP = 0.25;

export function normalizeMarker(
  input: MarkerInput,
  settings: HealthModelSettings,
): MarkerScore {
  const { code, value, system, range } = input;
  const zoneRaw = classifyZone(value, range);

  // Пограничная зона: формально risk, но отклонение минимально.
  // Штрафуем мягко — как «выше/ниже оптимума» (acceptable), а не как риск.
  const borderlineInfo = zoneRaw === "risk"
    ? getBorderlineInfo({
      code,
      value,
      normalMin: range.normal_min,
      normalMax: range.normal_max,
      criticalMin: range.critical_min ?? null,
      criticalMax: range.critical_max ?? null,
    })
    : null;
  const borderline = borderlineInfo != null;
  const zone: MarkerZone = borderline ? "normal" : zoneRaw;

  const score = borderline
    ? borderlineScore(borderlineInfo!.deviationPercent)
    : computeScore(value, range, zone);
  const penalty = penaltyFor(zone, settings);

  const baseWeight = range.base_weight ?? 1;
  const weight_effective = range.is_critical
    ? baseWeight * settings.critical_marker_weight_multiplier
    : baseWeight;

  return { code, system, score, penalty, zone, zone_raw: zoneRaw, borderline, weight_effective };
}

/** Внутри пограничного коридора score плавно уходит ниже границы нормы. */
function borderlineScore(deviationPercent: number): number {
  const t = clamp01(Math.abs(deviationPercent) / BORDERLINE_BAND_PERCENT);
  return clamp01(NORMAL_EDGE_SCORE * (1 - BORDERLINE_SCORE_DROP * t));
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
    // На границе optimal score=1, на границе normal score=NORMAL_EDGE_SCORE,
    // плавно (smoothstep) убывает с увеличением расстояния.
    const t = sideProgress(
      value,
      r.optimal_min,
      r.optimal_max,
      r.normal_min,
      r.normal_max,
    );
    return clamp01(1 - smoothstep(t) * (1 - NORMAL_EDGE_SCORE));
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
