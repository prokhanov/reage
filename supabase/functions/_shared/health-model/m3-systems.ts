// M3. Скоры систем (5 систем).
//
// Алгоритм:
//   system_score = 100 · Σ(wᵢ · sᵢ) / Σ(wᵢ)
//                − weighted_penalty(markers outside optimal)
//                − bad_share_penalty(risk/critical density)
//                · coverage_factor (штраф при низком покрытии)
//                + all_green_bonus (если нет жёлтых/красных)
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

    // Один только средневзвешенный score слишком оптимистичен на больших
    // панелях — десятки «зелёных» размывают отдельные отклонения. Поэтому
    // добавляем: (а) явный штраф M1 (в среднем, чтобы не зависеть от N) и
    // (б) абсолютный штраф за каждый risk / critical маркер, не зависящий
    // от размера панели — клинически 2 «красных» = серьёзная проблема,
    // независимо от того, сколько ещё зелёных вокруг.
    const weightedPenalty = sumW > 0
      ? inSystem.reduce((a, m) => a + m.weight_effective * m.penalty, 0) / sumW
      : 0;
    const riskCount = inSystem.filter((m) => m.zone === "risk").length;
    const criticalCount = inSystem.filter((m) => m.zone === "critical").length;
    raw -= weightedPenalty * settings.penalties.system_marker_penalty_scale;
    raw -= riskCount * settings.penalties.system_risk_marker_penalty;
    raw -= criticalCount * settings.penalties.system_critical_marker_penalty;


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
