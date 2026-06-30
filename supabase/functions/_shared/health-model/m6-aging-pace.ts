// M6 — Aging Pace.
//
// Считаем «скорость старения» как наклон биологического возраста (BA)
// относительно календарного времени по последним N точкам истории.
//
//   pace = ΔBA / Δt   (биолет на календарный год)
//
//   pace ≈ 1.0 — биостарение совпадает с календарным (нейтрально).
//   pace <  1 — пациент «омолаживается» или стареет медленнее.
//   pace >  1 — ускоренное старение.
//
// Метод: обычная линейная регрессия (МНК) по 2..N последних точкам
// (по умолчанию 2..4, настраивается через `settings.aging_pace`).
// При одной точке возвращаем `null` и помечаем «нужен повторный анализ».
//
// Дополнительно отдаём:
//   - `slope_per_year` — тот же наклон, явное имя для UI;
//   - `delta_ba` / `delta_years` — суммарные изменения по окну;
//   - `points_used` — сколько точек реально вошло;
//   - `trend` — «improving» | «stable» | «worsening»;
//   - `confidence` — 0..1 (мало точек / короткое окно → ниже).

import type { HealthModelSettings } from "./types.ts";

export interface BioAgePoint {
  /** ISO дата или Date / число (мс). */
  date: string | number | Date;
  /** Биологический возраст на эту дату. */
  bio_age: number;
}

export type AgingPaceTrend = "improving" | "stable" | "worsening" | "unknown";

export interface AgingPaceResult {
  pace: number | null;
  slope_per_year: number | null;
  delta_ba: number | null;
  delta_years: number | null;
  points_used: number;
  trend: AgingPaceTrend;
  confidence: number;
  reason?: string;
}

const MS_PER_YEAR = 365.2425 * 24 * 3600 * 1000;

function toMs(d: BioAgePoint["date"]): number {
  if (d instanceof Date) return d.getTime();
  if (typeof d === "number") return d;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Линейная регрессия BA(t) по окну последних точек.
 *
 * @param history произвольно отсортированный массив; внутри отсортируем по времени.
 */
export function computeAgingPace(
  history: BioAgePoint[],
  settings: HealthModelSettings,
): AgingPaceResult {
  const cfg = settings.aging_pace;
  const empty: AgingPaceResult = {
    pace: cfg.first_analysis_value,
    slope_per_year: null,
    delta_ba: null,
    delta_years: null,
    points_used: 0,
    trend: "unknown",
    confidence: 0,
  };

  if (!Array.isArray(history) || history.length === 0) {
    return { ...empty, reason: "no_history" };
  }

  // Нормализуем точки: валидные дата + ba.
  const norm = history
    .map((p) => ({ t: toMs(p.date), ba: Number(p.bio_age) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.ba))
    .sort((a, b) => a.t - b.t);

  if (norm.length < cfg.min_history_points) {
    return {
      ...empty,
      points_used: norm.length,
      reason: norm.length === 0 ? "no_valid_points" : "need_more_history",
    };
  }

  // Берём хвост окна.
  const windowed = norm.slice(-cfg.max_history_points);
  const n = windowed.length;

  // Линейная регрессия: BA = a + b·years_since_first.
  const t0 = windowed[0].t;
  const xs = windowed.map((p) => (p.t - t0) / MS_PER_YEAR);
  const ys = windowed.map((p) => p.ba);

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }

  const totalYears = xs[n - 1] - xs[0];
  if (den === 0 || totalYears <= 0) {
    // Все точки в один день — нельзя посчитать наклон.
    return {
      ...empty,
      points_used: n,
      reason: "zero_time_span",
    };
  }

  const slope = num / den; // биолет / календарный год
  const deltaBa = ys[n - 1] - ys[0];
  const deltaYears = totalYears;

  // Доверие: больше точек и шире окно → выше.
  const pointsScore = Math.min(1, (n - 1) / (cfg.max_history_points - 1));
  const spanScore = Math.min(1, totalYears / 1); // 1 год = 100% по span
  const confidence = Math.max(0.1, 0.5 * pointsScore + 0.5 * spanScore);

  let trend: AgingPaceTrend;
  if (slope < 0.85) trend = "improving";
  else if (slope > 1.15) trend = "worsening";
  else trend = "stable";

  return {
    pace: round(slope, 3),
    slope_per_year: round(slope, 3),
    delta_ba: round(deltaBa, 2),
    delta_years: round(deltaYears, 2),
    points_used: n,
    trend,
    confidence: round(confidence, 2),
  };
}

function round(x: number, digits: number): number {
  const k = 10 ** digits;
  return Math.round(x * k) / k;
}
