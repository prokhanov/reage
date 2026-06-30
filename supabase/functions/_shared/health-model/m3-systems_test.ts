import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeSystemScores } from "./m3-systems.ts";
import { DEFAULT_HEALTH_MODEL_SETTINGS } from "./types.ts";
import type { MarkerScore, SystemKey } from "./types.ts";

const totals: Record<SystemKey, number> = {
  cardiovascular: 5,
  metabolism: 5,
  inflammation: 5,
  endocrine: 5,
  energy: 5,
};

function mk(system: SystemKey, score: number, zone: MarkerScore["zone"] = "optimal", w = 1): MarkerScore {
  return { code: `${system}_${score}`, system, score, penalty: 0, zone, weight_effective: w };
}

Deno.test("M3: 3 оптимальных → score≈100 + бонус 2", () => {
  const arr = [mk("cardiovascular", 1), mk("cardiovascular", 1), mk("cardiovascular", 1)];
  const res = computeSystemScores(arr, totals, DEFAULT_HEALTH_MODEL_SETTINGS);
  const cv = res.find((s) => s.system === "cardiovascular")!;
  assertEquals(cv.insufficient, false);
  assert((cv.score ?? 0) >= 99 && (cv.score ?? 0) <= 100);
});

Deno.test("M3: <3 маркеров → insufficient=true, score=null", () => {
  const arr = [mk("metabolism", 1), mk("metabolism", 1)];
  const res = computeSystemScores(arr, totals, DEFAULT_HEALTH_MODEL_SETTINGS);
  const m = res.find((s) => s.system === "metabolism")!;
  assertEquals(m.insufficient, true);
  assertEquals(m.score, null);
});

Deno.test("M3: критический маркер с весом ×1.5 тянет вниз", () => {
  const arr = [
    mk("inflammation", 1, "optimal", 1),
    mk("inflammation", 1, "optimal", 1),
    mk("inflammation", 0, "critical", 1.5),
  ];
  const res = computeSystemScores(arr, totals, DEFAULT_HEALTH_MODEL_SETTINGS);
  const i = res.find((s) => s.system === "inflammation")!;
  // 100 · (1+1+0) / 3.5 ≈ 57
  assert((i.score ?? 0) < 70 && (i.score ?? 0) > 40);
});
