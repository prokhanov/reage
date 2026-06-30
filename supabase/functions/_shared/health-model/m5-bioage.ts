// M5 — Biological Age (PhenoAge + KDM, усреднённый, с коридором ±N лет).
//
// PhenoAge: Levine et al. 2018 (DOI: 10.1093/gerona/glx096).
//   Использует 9 биомаркеров + хроновозраст.
//   Единицы как в оригинале:
//     Albumin   g/L          coef −0.0336
//     Creatinine μmol/L      coef +0.0095
//     Glucose   mmol/L       coef +0.1953
//     log(CRP)  mg/L (ln)    coef +0.0954
//     Lymph %   %            coef −0.0120
//     MCV       fL           coef +0.0268
//     RDW       %            coef +0.3306
//     ALP       U/L          coef +0.00188
//     WBC       10^9/L       coef +0.0554
//     Age       years        coef +0.0804
//     intercept             −19.907
//
//   M  = 1 − exp(−exp(xb) · (exp(0.0076927·120) − 1) / 0.0076927)
//   PhenoAge = 141.50225 + ln(−0.00553·ln(1−M)) / 0.090165
//
// KDM (упрощённая Klemera–Doubal проекция):
//   На основе тех же 9 маркеров. Для каждого маркера известна "оптимальная"
//   медиана у молодого здорового (≈25 лет) и наклон смещения с возрастом
//   (units / year) из агрегированных данных NHANES/UK Biobank.
//   marker_implied_age_i = 25 + (value_i − median25_i) / slope_i
//   BA_kdm = взвешенное среднее marker_implied_age_i по 1/var_i,
//            затем сдвигаем к chrono ± коридор для устойчивости.

import type { MarkerInput } from "./types.ts";

/** Коды биомаркеров (как в таблице `biomarkers`). */
const CODE = {
  ALB: "ALB",
  CREA: "CREA",
  GLU: "GLU",
  CRP: "hs-CRP",
  LYMPH: "LYMPH",
  MCV: "MCV",
  RDW: "RDW",
  ALP: "ALP",
  WBC: "WBC",
} as const;

type PhenoInputs = {
  alb: number; crea: number; glu: number; crp: number;
  lymph: number; mcv: number; rdw: number; alp: number; wbc: number;
  age: number;
};

export function pickPhenoInputs(
  markers: MarkerInput[],
  chronoAge: number,
): PhenoInputs | null {
  const get = (code: string) =>
    markers.find((m) => m.code === code)?.value ?? null;
  const vals = {
    alb: get(CODE.ALB),
    crea: get(CODE.CREA),
    glu: get(CODE.GLU),
    crp: get(CODE.CRP),
    lymph: get(CODE.LYMPH),
    mcv: get(CODE.MCV),
    rdw: get(CODE.RDW),
    alp: get(CODE.ALP),
    wbc: get(CODE.WBC),
  };
  for (const v of Object.values(vals)) if (v == null || !Number.isFinite(v)) return null;
  return { ...(vals as Record<string, number>), age: chronoAge } as PhenoInputs;
}

/** Levine 2018 PhenoAge. Возвращает лет (float). */
export function computePhenoAge(p: PhenoInputs): number {
  // CRP должен быть >0 для ln. Защищаемся от нулей.
  const lnCrp = Math.log(Math.max(p.crp, 0.01));
  const xb =
    -19.907 +
    -0.0336 * p.alb +
    0.0095 * p.crea +
    0.1953 * p.glu +
    0.0954 * lnCrp +
    -0.0120 * p.lymph +
    0.0268 * p.mcv +
    0.3306 * p.rdw +
    0.00188 * p.alp +
    0.0554 * p.wbc +
    0.0804 * p.age;

  const gamma = 0.0076927;
  const t = 120;
  const M = 1 - Math.exp((-Math.exp(xb) * (Math.exp(gamma * t) - 1)) / gamma);
  // Защита от M=1 (бесконечность под логом).
  const Mc = Math.min(Math.max(M, 1e-9), 1 - 1e-9);
  const pheno = 141.50225 + Math.log(-0.00553 * Math.log(1 - Mc)) / 0.090165;
  return pheno;
}

// ---- KDM ----------------------------------------------------------------
// median25 — типичная медиана у здорового 25-летнего; slope — единиц/год
// (положительное = маркер растёт с возрастом). Источники: агрегированные
// данные NHANES III/2011-2018 и UK Biobank, см. mem://features/health-model-formula-parameters.
type KDMRef = { median25: number; slope: number; variance: number; clamp?: [number, number] };

const KDM_REF: Record<string, KDMRef> = {
  // ↓ с возрастом: альбумин, лимфоциты%
  [CODE.ALB]:   { median25: 47,   slope: -0.08,  variance: 9 },
  [CODE.LYMPH]: { median25: 36,   slope: -0.15,  variance: 36 },
  // ↑ с возрастом
  [CODE.CREA]:  { median25: 78,   slope: 0.25,   variance: 64 },
  [CODE.GLU]:   { median25: 4.8,  slope: 0.012,  variance: 0.36 },
  [CODE.CRP]:   { median25: 0.7,  slope: 0.04,   variance: 4.0, clamp: [0.05, 30] },
  [CODE.MCV]:   { median25: 88,   slope: 0.07,   variance: 16 },
  [CODE.RDW]:   { median25: 12.7, slope: 0.025,  variance: 0.8 },
  [CODE.ALP]:   { median25: 70,   slope: 0.45,   variance: 400 },
  [CODE.WBC]:   { median25: 6.4,  slope: 0.005,  variance: 2.5 },
};

/**
 * Упрощённый KDM по фиксированной reference-таблице.
 * Возвращает BA или null если меньше 4 маркеров.
 *
 * Защита от выбросов: каждый marker_implied_age клампится к
 * chrono ± KDM_MARKER_RADIUS лет (отдельный маркер с малым slope
 * может дать +50 лет от шума и обрушить среднее). При ≥6 маркерах
 * отбрасываем самый высокий и самый низкий impliedAge (trimmed mean).
 * Финальный шринкаж 50 % к хроновозрасту.
 */
const KDM_MARKER_RADIUS = 25;
export function computeKDMAge(markers: MarkerInput[], chronoAge: number): number | null {
  const samples: { age: number; w: number }[] = [];
  for (const [code, ref] of Object.entries(KDM_REF)) {
    const m = markers.find((x) => x.code === code);
    if (!m || !Number.isFinite(m.value)) continue;
    let v = m.value;
    if (ref.clamp) v = Math.min(Math.max(v, ref.clamp[0]), ref.clamp[1]);
    let impliedAge = 25 + (v - ref.median25) / ref.slope;
    // per-marker clamp: единичный шумный маркер не должен утаскивать BA на 50+ лет
    const lo = chronoAge - KDM_MARKER_RADIUS;
    const hi = chronoAge + KDM_MARKER_RADIUS;
    if (impliedAge < lo) impliedAge = lo;
    if (impliedAge > hi) impliedAge = hi;
    const w = (ref.slope * ref.slope) / Math.max(ref.variance, 1e-6);
    samples.push({ age: impliedAge, w });
  }
  if (samples.length < 4) return null;

  // Trimmed mean: при ≥6 маркерах отбрасываем крайние.
  let pool = samples;
  if (samples.length >= 6) {
    const sorted = [...samples].sort((a, b) => a.age - b.age);
    pool = sorted.slice(1, -1);
  }
  let sumW = 0, sumWA = 0;
  for (const s of pool) { sumW += s.w; sumWA += s.w * s.age; }
  const raw = sumWA / sumW;
  // Шринкаж 50 % к chrono: KDM шумный, делаем консервативно.
  return 0.5 * raw + 0.5 * chronoAge;
}

// ---- Гибрид -------------------------------------------------------------

export interface BioAgeBreakdown {
  bio_age: number;
  phenoage: number | null;
  kdm: number | null;
  chrono: number;
  blend: { phenoage: number; kdm: number };
  clamped: boolean;
  fallback_used: boolean;
}

export interface BioAgeOptions {
  blend?: { phenoage: number; kdm: number };
  corridor?: { years_below: number; years_above: number };
  /** Если PhenoAge/KDM недоступны — фолбэк к этой оценке (например HI-based). */
  fallback?: number | null;
}

export function computeBioAge(
  markers: MarkerInput[],
  chronoAge: number,
  opts: BioAgeOptions = {},
): BioAgeBreakdown {
  const blend = opts.blend ?? { phenoage: 0.5, kdm: 0.5 };
  const corridor = opts.corridor ?? { years_below: 15, years_above: 15 };

  const pheno = (() => {
    const pi = pickPhenoInputs(markers, chronoAge);
    return pi ? computePhenoAge(pi) : null;
  })();
  const kdm = computeKDMAge(markers, chronoAge);

  let raw: number;
  let fallback_used = false;
  if (pheno != null && kdm != null) {
    const wp = blend.phenoage, wk = blend.kdm;
    raw = (wp * pheno + wk * kdm) / (wp + wk);
  } else if (pheno != null) {
    raw = pheno;
  } else if (kdm != null) {
    raw = kdm;
  } else if (opts.fallback != null && Number.isFinite(opts.fallback)) {
    raw = opts.fallback;
    fallback_used = true;
  } else {
    raw = chronoAge;
    fallback_used = true;
  }

  const lo = chronoAge - corridor.years_below;
  const hi = chronoAge + corridor.years_above;
  const clamped = raw < lo || raw > hi;
  const ba = Math.min(Math.max(raw, lo), hi);

  return {
    bio_age: Number(ba.toFixed(1)),
    phenoage: pheno != null ? Number(pheno.toFixed(1)) : null,
    kdm: kdm != null ? Number(kdm.toFixed(1)) : null,
    chrono: chronoAge,
    blend,
    clamped,
    fallback_used,
  };
}
