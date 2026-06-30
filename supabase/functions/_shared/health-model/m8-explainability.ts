// M8 — Explainability.
//
// Детерминированно показываем, что больше всего тянет здоровье вниз и что
// держит его наверху. Используем уже посчитанные M1 MarkerScore:
//
//   contribution = weight_effective · (1 − score)     // вклад в отклонение от идеала
//
// Возвращаем:
//   - top_negative: маркеры с самым большим отрицательным вкладом (по убыванию);
//   - top_positive: оптимальные маркеры с самым большим положительным «якорем»
//                   (weight_effective · score, только зона optimal);
//   - per_system: топ-1 негативный маркер в каждой из 5 систем (для UI «Что тянет систему»);
//   - total_negative_load: суммарный вклад всех «не-оптимальных» маркеров.
//
// Никакого AI — чистая агрегация. Заменяет «кашу» в StrategyPreviewDialog.

import type { MarkerScore, MarkerZone, SystemKey } from "./types.ts";

export interface ExplainItem {
  code: string;
  system: SystemKey | null;
  zone: MarkerZone;
  score: number;
  weight: number;
  contribution: number;
}

export interface ExplainabilityResult {
  top_negative: ExplainItem[];
  top_positive: ExplainItem[];
  per_system: Partial<Record<SystemKey, ExplainItem>>;
  total_negative_load: number;
  total_positive_anchor: number;
}

export interface ExplainOptions {
  topNegative?: number; // дефолт 5
  topPositive?: number; // дефолт 3
}

export function computeExplainability(
  scores: MarkerScore[],
  opts: ExplainOptions = {},
): ExplainabilityResult {
  const topN = opts.topNegative ?? 5;
  const topP = opts.topPositive ?? 3;

  const enriched: ExplainItem[] = scores
    .filter((s) => s.zone !== "unknown" && Number.isFinite(s.score))
    .map((s) => ({
      code: s.code,
      system: s.system,
      zone: s.zone,
      score: round(s.score, 3),
      weight: round(s.weight_effective, 3),
      contribution: round(s.weight_effective * (1 - s.score), 3),
    }));

  const negatives = enriched
    .filter((e) => e.contribution > 0.0001)
    .sort((a, b) => b.contribution - a.contribution);

  const positives = enriched
    .filter((e) => e.zone === "optimal")
    .map((e) => ({ ...e, contribution: round(e.weight * e.score, 3) }))
    .sort((a, b) => b.contribution - a.contribution);

  const per_system: Partial<Record<SystemKey, ExplainItem>> = {};
  for (const e of negatives) {
    if (!e.system) continue;
    if (!per_system[e.system]) per_system[e.system] = e;
  }

  const total_negative_load = round(
    negatives.reduce((a, e) => a + e.contribution, 0),
    3,
  );
  const total_positive_anchor = round(
    positives.reduce((a, e) => a + e.contribution, 0),
    3,
  );

  return {
    top_negative: negatives.slice(0, topN),
    top_positive: positives.slice(0, topP),
    per_system,
    total_negative_load,
    total_positive_anchor,
  };
}

function round(x: number, d: number): number {
  const k = 10 ** d;
  return Math.round(x * k) / k;
}
