// M7 — Траектория омоложения.
//
// На основе:
//   - текущего BA и HI,
//   - aging pace (M6) — базовая скорость без вмешательств,
//   - активных назначений (prescriptions.expected_impact) — ожидаемый эффект,
//   - справочника времени восстановления маркеров (recovery_times).
//
// Выдаём массив контрольных точек {horizon_months, date, ba_predicted, hi_predicted, drivers}.
//
// Формулы (детерминированные, без AI):
//   horizonY = horizon_months / 12
//
//   // База: продолжаем текущий тренд (pace ≈ биолет / календарный год)
//   ba_base = ba_now + pace * horizonY
//   hi_base = hi_now − (pace − 1) * 1.5 * horizonY    // ускоренное старение тянет HI вниз
//
//   // Эффект назначений: накопительный, с насыщением через recovery_time.
//   // Для каждого назначения:
//   //   ramp = clamp(horizon_months / recovery_months, 0, 1)
//   //   ba_delta -= expected_impact.bio_age_delta * ramp
//   //   hi_delta += expected_impact.hi_delta       * ramp
//   //
//   // Если у назначения нет expected_impact, используем дефолт по категории.
//
//   ba_predicted = ba_base + ba_delta_from_prescriptions
//   hi_predicted = clamp(hi_base + hi_delta_from_prescriptions, hi_min, hi_max)
//
//   // Биовозраст не может уйти ниже chrono − 15 и не имеет смысла за пределами +25.

import type { HealthModelSettings } from "./types.ts";

export interface PrescriptionImpact {
  /** Условный id для трассировки (для UI). */
  id?: string;
  /** Название (для UI / drivers). */
  title?: string;
  /** Ожидаемое снижение биовозраста за полный цикл (лет). Положительное = улучшение. */
  bio_age_delta?: number;
  /** Ожидаемый рост HI за полный цикл (пункты). Положительное = улучшение. */
  hi_delta?: number;
  /** За сколько месяцев эффект выйдет на плато. По умолчанию 6. */
  recovery_months?: number;
  /** Только активные назначения учитываются; неактивные — не передавать. */
}

export interface TrajectoryInput {
  bio_age_now: number;
  hi_now: number;
  chrono_age: number;
  /** Скорость старения из M6 (биолет / календарный год). null = считаем 1.0. */
  pace: number | null;
  prescriptions: PrescriptionImpact[];
  /** Опционально: горизонты в месяцах. Дефолт [3, 6, 12]. */
  horizons_months?: number[];
  /** Опционально: «сегодня» для расчёта дат. */
  now?: Date;
}

export interface TrajectoryPoint {
  horizon_months: number;
  date: string;
  ba_predicted: number;
  hi_predicted: number;
  ba_base: number;
  hi_base: number;
  ba_delta_from_prescriptions: number;
  hi_delta_from_prescriptions: number;
  drivers: Array<{ id?: string; title?: string; ba_contribution: number; hi_contribution: number }>;
}

export interface TrajectoryResult {
  points: TrajectoryPoint[];
  pace_used: number;
  pace_was_null: boolean;
}

const DEFAULT_HORIZONS = [3, 6, 12];
const DEFAULT_RECOVERY_MONTHS = 6;

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

function round(x: number, d: number) {
  const k = 10 ** d;
  return Math.round(x * k) / k;
}

function addMonths(d: Date, m: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

export function computeTrajectory(
  input: TrajectoryInput,
  settings: HealthModelSettings,
): TrajectoryResult {
  const horizons = input.horizons_months ?? DEFAULT_HORIZONS;
  const now = input.now ?? new Date();
  const paceWasNull = input.pace == null;
  // Если pace неизвестен (первый анализ) — считаем нейтральным «биостарение = календарю».
  const pace = paceWasNull ? 1.0 : input.pace!;

  const hiMin = settings.hi_range.min;
  const hiMax = settings.hi_range.max;
  const baFloor = input.chrono_age - settings.ba_corridor.years_below;
  const baCeil = input.chrono_age + settings.ba_corridor.years_above;

  const points: TrajectoryPoint[] = horizons.map((h) => {
    const horizonY = h / 12;

    const ba_base = input.bio_age_now + pace * horizonY;
    const hi_base = input.hi_now - (pace - 1) * 1.5 * horizonY;

    let baDelta = 0;
    let hiDelta = 0;
    const drivers: TrajectoryPoint["drivers"] = [];

    for (const p of input.prescriptions) {
      const recovery = p.recovery_months ?? DEFAULT_RECOVERY_MONTHS;
      const ramp = clamp(h / recovery, 0, 1);
      const baContrib = -(p.bio_age_delta ?? 0) * ramp;
      const hiContrib = (p.hi_delta ?? 0) * ramp;
      if (baContrib !== 0 || hiContrib !== 0) {
        baDelta += baContrib;
        hiDelta += hiContrib;
        drivers.push({
          id: p.id,
          title: p.title,
          ba_contribution: round(baContrib, 2),
          hi_contribution: round(hiContrib, 2),
        });
      }
    }

    // Топ-5 драйверов по абсолютному вкладу в HI.
    drivers.sort(
      (a, b) => Math.abs(b.hi_contribution) - Math.abs(a.hi_contribution),
    );

    const ba_pred = clamp(ba_base + baDelta, baFloor, baCeil);
    const hi_pred = clamp(hi_base + hiDelta, hiMin, hiMax);

    return {
      horizon_months: h,
      date: addMonths(now, h).toISOString().slice(0, 10),
      ba_predicted: round(ba_pred, 1),
      hi_predicted: round(hi_pred, 1),
      ba_base: round(ba_base, 1),
      hi_base: round(hi_base, 1),
      ba_delta_from_prescriptions: round(baDelta, 2),
      hi_delta_from_prescriptions: round(hiDelta, 2),
      drivers: drivers.slice(0, 5),
    };
  });

  return { points, pace_used: pace, pace_was_null: paceWasNull };
}
