// Unit-тесты M1. Запуск: supabase--test_edge_functions.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyZone, normalizeMarker } from "./m1-normalize.ts";
import { DEFAULT_HEALTH_MODEL_SETTINGS, type MarkerRange } from "./types.ts";

const S = DEFAULT_HEALTH_MODEL_SETTINGS;

// Двусторонняя норма: глюкоза
const glu: MarkerRange = {
  optimal_min: 4.5, optimal_max: 5.2,
  normal_min: 3.9,  normal_max: 5.9,
  critical_min: 2.5, critical_max: 11,
};

Deno.test("M1: optimal value → score 1, zone optimal, no penalty", () => {
  const r = normalizeMarker(
    { code: "GLU", value: 4.8, system: "metabolism", range: glu }, S,
  );
  assertEquals(r.zone, "optimal");
  assertEquals(r.score, 1);
  assertEquals(r.penalty, 0);
});

Deno.test("M1: на границе normal score ≈ 0.6", () => {
  const r = normalizeMarker(
    { code: "GLU", value: 5.9, system: "metabolism", range: glu }, S,
  );
  assertEquals(r.zone, "normal");
  assert(Math.abs(r.score - 0.6) < 0.05, `score=${r.score}`);
  assertEquals(r.penalty, S.penalties.acceptable_marker);
});

Deno.test("M1: глубоко в risk → score падает к нулю, штраф risk", () => {
  const r = normalizeMarker(
    { code: "GLU", value: 8.5, system: "metabolism", range: glu }, S,
  );
  assertEquals(r.zone, "risk");
  assert(r.score < 0.4, `score=${r.score}`);
  assertEquals(r.penalty, S.penalties.risk_marker);
});

Deno.test("M1: critical → score=0, штраф critical", () => {
  const r = normalizeMarker(
    { code: "GLU", value: 14, system: "metabolism", range: glu }, S,
  );
  assertEquals(r.zone, "critical");
  assertEquals(r.score, 0);
  assertEquals(r.penalty, S.penalties.critical_marker);
});

Deno.test("M1: критический маркер получает усиленный вес ×1.5", () => {
  const r = normalizeMarker(
    { code: "TROP", value: 4.8, system: "cardiovascular",
      range: { ...glu, is_critical: true } },
    S,
  );
  assertEquals(r.weight_effective, 1.5);
});

// Односторонняя норма (только верхняя), пример: ЛПНП
const ldl: MarkerRange = {
  optimal_min: null, optimal_max: 2.6,
  normal_min: null,  normal_max: 3.3,
  critical_min: null, critical_max: 4.9,
};

Deno.test("M1: односторонняя норма — низкое значение всё равно optimal", () => {
  const r = normalizeMarker(
    { code: "LDL", value: 1.2, system: "cardiovascular", range: ldl }, S,
  );
  assertEquals(r.zone, "optimal");
  assertEquals(r.score, 1);
});

Deno.test("M1: classifyZone unknown для NaN", () => {
  assertEquals(classifyZone(Number.NaN, glu), "unknown");
});

Deno.test("M1: score монотонно убывает при удалении от optimal", () => {
  const v1 = normalizeMarker({ code: "GLU", value: 5.3, system: null, range: glu }, S).score;
  const v2 = normalizeMarker({ code: "GLU", value: 5.6, system: null, range: glu }, S).score;
  const v3 = normalizeMarker({ code: "GLU", value: 5.9, system: null, range: glu }, S).score;
  const v4 = normalizeMarker({ code: "GLU", value: 7.0, system: null, range: glu }, S).score;
  assert(v1 > v2 && v2 > v3 && v3 > v4, `monotone failed: ${v1} ${v2} ${v3} ${v4}`);
});
