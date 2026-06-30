// M3. Скоры систем (5 систем).
//
// Алгоритм:
//   system_score = 100 · Σ(wᵢ · sᵢ) / Σ(wᵢ)
//                · coverage_factor (штраф при низком покрытии)
//                · imbalance_bonus (бонус если нет красных)
//
//   Отсутствующие маркеры НЕ штрафуют — веса перераспределяются.
//   Минимум маркеров для расчёта — settings.penalties.min_markers_per_system.

import type {
  HealthModelSettings,
  MarkerScore,
  SystemKey,
  SystemScore,
} from "./types.ts";

const SYSTEMS: SystemKey[] = [
  "cardiovascular",
  "metabolism",
  "inflammation",
  "endocrine",
  "energy",
];

export function computeSystemScores(
  scores: MarkerScore[],
  totalsPerSystem: Record<SystemKey, number>,
  settings: HealthModelSettings,
): SystemScore[] {
  const min = settings.penalties.min_markers_per_system;
  const covT = settings.penalties.coverage_threshold;

  return SYSTEMS.map((system) => {
    const inSystem = scores.filter((s) => s.system === system && s.zone !== "unknown");
    const total = Math.max(totalsPerSystem[system] ?? inSystem.length, inSystem.length);
    const coverage = total > 0 ? inSystem.length / total : 0;

    if (inSystem.length < min) {
      return {
        system,
        score: null,
        markers_used: inSystem.length,
        markers_total: total,
        coverage,
        insufficient: true,
      };
    }

    const sumW = inSystem.reduce((a, m) => a + m.weight_effective, 0);
    const sumWS = inSystem.reduce((a, m) => a + m.weight_effective * m.score, 0);
    let raw = sumW > 0 ? (100 * sumWS) / sumW : 0;

    // Coverage penalty — линейно урезаем при coverage < covT
    if (coverage < covT && covT > 0) {
      raw *= 0.85 + 0.15 * (coverage / covT);
    }

    // Бонус «все зелёные»
    const noBad = inSystem.every((m) => m.zone === "optimal" || m.zone === "normal");
    if (noBad) raw += settings.bonuses.all_green_system_bonus;

    return {
      system,
      score: clamp(raw, 0, 100),
      markers_used: inSystem.length,
      markers_total: total,
      coverage,
      insufficient: false,
    };
  });
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
