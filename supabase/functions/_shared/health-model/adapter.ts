// Adapter: existing analysis_values rows → M1 MarkerInput.
// Resolves gender/age-specific ranges and maps Russian category → SystemKey.

import type { MarkerInput, MarkerRange, SystemKey } from "./types.ts";

const CATEGORY_TO_SYSTEM: Record<string, SystemKey> = {
  "Сердечно-сосудистая система": "cardiovascular",
  "Метаболизм и Детоксикация": "metabolism",
  "Воспалительная и иммунная система": "inflammation",
  "Эндокринная и стрессовая система": "endocrine",
  "Энергия и восстановление": "energy",
};

export function categoryToSystem(category: string | null | undefined): SystemKey | null {
  if (!category) return null;
  return CATEGORY_TO_SYSTEM[category] ?? null;
}

/** Resolve range honoring age_ranges → male/female → default. */
export function resolveRange(
  b: any,
  patientAge: number | null,
  patientGender: string | null,
): MarkerRange {
  let normal_min = b.normal_min;
  let normal_max = b.normal_max;
  let optimal_min = b.optimal_min;
  let optimal_max = b.optimal_max;
  let critical_min = b.critical_min;
  let critical_max = b.critical_max;

  if (b.range_mode === "age" && b.age_ranges && patientGender && patientAge !== null) {
    const ar = b.age_ranges[patientGender];
    const slot = Array.isArray(ar)
      ? ar.find((r: any) => patientAge >= r.age_from && patientAge <= r.age_to)
      : null;
    if (slot) {
      normal_min = slot.min ?? normal_min;
      normal_max = slot.max ?? normal_max;
      if (slot.optimal_min !== undefined) optimal_min = slot.optimal_min;
      if (slot.optimal_max !== undefined) optimal_max = slot.optimal_max;
      if (slot.critical_min !== undefined) critical_min = slot.critical_min;
      if (slot.critical_max !== undefined) critical_max = slot.critical_max;
    }
  }
  if (patientGender === "male" && b.normal_min_male != null) {
    normal_min = b.normal_min_male; normal_max = b.normal_max_male;
  } else if (patientGender === "female" && b.normal_min_female != null) {
    normal_min = b.normal_min_female; normal_max = b.normal_max_female;
  }
  if (optimal_min == null && patientGender === "male" && b.optimal_min_male != null) {
    optimal_min = b.optimal_min_male; optimal_max = b.optimal_max_male;
  } else if (optimal_min == null && patientGender === "female" && b.optimal_min_female != null) {
    optimal_min = b.optimal_min_female; optimal_max = b.optimal_max_female;
  }
  if (critical_min == null && patientGender === "male" && b.critical_min_male != null) {
    critical_min = b.critical_min_male; critical_max = b.critical_max_male;
  } else if (critical_min == null && patientGender === "female" && b.critical_min_female != null) {
    critical_min = b.critical_min_female; critical_max = b.critical_max_female;
  }

  return {
    normal_min, normal_max, optimal_min, optimal_max,
    critical_min, critical_max,
    is_critical: !!b.is_critical,
    base_weight: b.aging_weight ?? 1,
  };
}

export function toMarkerInputs(
  values: any[],
  patientAge: number | null,
  patientGender: string | null,
): MarkerInput[] {
  const out: MarkerInput[] = [];
  for (const av of values) {
    const b = av.biomarkers;
    if (!b) continue;
    const v = Number(av.value);
    if (!Number.isFinite(v)) continue;
    const range = resolveRange(b, patientAge, patientGender);
    if (range.normal_min == null && range.normal_max == null) continue;
    out.push({
      code: b.code,
      value: v,
      system: categoryToSystem(b.category),
      range,
    });
  }
  return out;
}

/** Totals per system from a plan_biomarkers list (or fallback by present). */
export function computeTotalsPerSystem(
  planBiomarkers: Array<{ category: string | null }> | null,
  present: MarkerInput[],
): Record<SystemKey, number> {
  const totals: Record<SystemKey, number> = {
    cardiovascular: 0, metabolism: 0, inflammation: 0, endocrine: 0, energy: 0,
  };
  if (planBiomarkers && planBiomarkers.length > 0) {
    for (const pb of planBiomarkers) {
      const sys = categoryToSystem(pb.category);
      if (sys) totals[sys]++;
    }
  } else {
    for (const m of present) if (m.system) totals[m.system]++;
  }
  return totals;
}
