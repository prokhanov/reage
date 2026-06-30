import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAgingPace } from "./m6-aging-pace.ts";
import { DEFAULT_HEALTH_MODEL_SETTINGS } from "./types.ts";

const S = DEFAULT_HEALTH_MODEL_SETTINGS;

Deno.test("M6: пустая история → null + reason no_history", () => {
  const r = computeAgingPace([], S);
  assertEquals(r.pace, null);
  assertEquals(r.trend, "unknown");
  assertEquals(r.reason, "no_history");
});

Deno.test("M6: одна точка → null + reason need_more_history", () => {
  const r = computeAgingPace([{ date: "2025-01-01", bio_age: 40 }], S);
  assertEquals(r.pace, null);
  assertEquals(r.reason, "need_more_history");
  assertEquals(r.points_used, 1);
});

Deno.test("M6: 2 точки с +1 биогодом за 1 календарный → pace ≈ 1.0 (stable)", () => {
  const r = computeAgingPace(
    [
      { date: "2024-01-01", bio_age: 40 },
      { date: "2025-01-01", bio_age: 41 },
    ],
    S,
  );
  assert(r.pace !== null);
  assert(Math.abs(r.pace! - 1.0) < 0.02, `expected ≈1, got ${r.pace}`);
  assertEquals(r.trend, "stable");
  assertEquals(r.points_used, 2);
});

Deno.test("M6: омоложение −2 биогода за 1 год → pace ≈ −2 (improving)", () => {
  const r = computeAgingPace(
    [
      { date: "2024-01-01", bio_age: 42 },
      { date: "2025-01-01", bio_age: 40 },
    ],
    S,
  );
  assert(r.pace !== null && r.pace < 0);
  assertEquals(r.trend, "improving");
});

Deno.test("M6: ускоренное старение +3 биогода за 1 год → pace ≈ 3 (worsening)", () => {
  const r = computeAgingPace(
    [
      { date: "2024-01-01", bio_age: 40 },
      { date: "2025-01-01", bio_age: 43 },
    ],
    S,
  );
  assert(r.pace !== null && r.pace > 2);
  assertEquals(r.trend, "worsening");
});

Deno.test("M6: 4 точки, ровный stable-тренд → pace ≈ 1", () => {
  const r = computeAgingPace(
    [
      { date: "2022-01-01", bio_age: 30 },
      { date: "2023-01-01", bio_age: 31 },
      { date: "2024-01-01", bio_age: 32 },
      { date: "2025-01-01", bio_age: 33 },
    ],
    S,
  );
  assert(r.pace !== null);
  assertEquals(r.points_used, Math.min(4, S.aging_pace.max_history_points));
  assertEquals(r.trend, "stable");
  assert(Math.abs(r.pace! - 1.0) < 0.05, `pace=${r.pace}`);
});

Deno.test("M6: все точки в одной дате → null + reason zero_time_span", () => {
  const r = computeAgingPace(
    [
      { date: "2025-01-01", bio_age: 40 },
      { date: "2025-01-01", bio_age: 41 },
    ],
    S,
  );
  assertEquals(r.pace, null);
  assertEquals(r.reason, "zero_time_span");
});

Deno.test("M6: неотсортированные точки сортируются внутри", () => {
  const r = computeAgingPace(
    [
      { date: "2025-01-01", bio_age: 41 },
      { date: "2024-01-01", bio_age: 40 },
    ],
    S,
  );
  assert(r.pace !== null);
  assert(Math.abs(r.pace! - 1.0) < 0.02);
});

Deno.test("M6: невалидные точки отбрасываются", () => {
  const r = computeAgingPace(
    [
      { date: "bad-date", bio_age: 40 },
      { date: "2024-01-01", bio_age: NaN as unknown as number },
      { date: "2024-01-01", bio_age: 40 },
      { date: "2025-01-01", bio_age: 41 },
    ],
    S,
  );
  assert(r.pace !== null);
  assertEquals(r.points_used, 2);
});

Deno.test("M6: confidence растёт с количеством точек и длиной окна", () => {
  const small = computeAgingPace(
    [
      { date: "2024-10-01", bio_age: 40 },
      { date: "2024-12-01", bio_age: 40.3 },
    ],
    S,
  );
  const big = computeAgingPace(
    [
      { date: "2023-01-01", bio_age: 40 },
      { date: "2023-07-01", bio_age: 40.2 },
      { date: "2024-01-01", bio_age: 40.5 },
      { date: "2025-01-01", bio_age: 41 },
    ],
    S,
  );
  assert(big.confidence > small.confidence, `big=${big.confidence} small=${small.confidence}`);
});
