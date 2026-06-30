// M4. Health Index.
//
//   HI_raw = Σ(W_system · system_score) / Σ(W_system)          // только по системам со скором
//   HI     = HI_raw − dispersion_penalty(σ систем) + improvement_bonus(Δ vs прошлый)
//   HI ∈ [hi_range.min .. hi_range.max]

import type {
  HealthIndexBreakdown,
  HealthModelSettings,
  SystemKey,
  SystemScore,
} from "./types.ts";

export function computeHealthIndex(
  systems: SystemScore[],
  settings: HealthModelSettings,
  previousHi?: number | null,
): HealthIndexBreakdown {
  const available = systems.filter((s) => s.score != null) as Array<SystemScore & { score: number }>;
  if (available.length === 0) {
    return {
      hi: settings.hi_range.min,
      hi_raw: 0,
      dispersion_penalty: 0,
      improvement_bonus: 0,
      system_scores: systems,
    };
  }

  let sumW = 0;
  let sumWS = 0;
  for (const s of available) {
    const w = settings.system_weights[s.system as SystemKey] ?? 0;
    sumW += w;
    sumWS += w * s.score;
  }
  const hi_raw = sumW > 0 ? sumWS / sumW : 0;

  // Штраф за разбаланс — k · stdev
  const mean = available.reduce((a, s) => a + s.score, 0) / available.length;
  const variance =
    available.reduce((a, s) => a + (s.score - mean) ** 2, 0) / available.length;
  const stdev = Math.sqrt(variance);
  const dispersion_penalty = settings.penalties.dispersion_k * stdev;

  // Бонус за улучшение (только если есть прошлый HI)
  let improvement_bonus = 0;
  if (typeof previousHi === "number" && Number.isFinite(previousHi)) {
    const delta = hi_raw - previousHi;
    if (delta > 0) improvement_bonus = Math.min(2, delta * 0.25);
  }

  const hi_final = clamp(
    hi_raw - dispersion_penalty + improvement_bonus,
    settings.hi_range.min,
    settings.hi_range.max,
  );

  return {
    hi: hi_final,
    hi_raw,
    dispersion_penalty,
    improvement_bonus,
    system_scores: systems,
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
