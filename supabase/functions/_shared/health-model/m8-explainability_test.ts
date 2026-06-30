import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeExplainability } from "./m8-explainability.ts";
import type { MarkerScore } from "./types.ts";

const mk = (
  code: string,
  score: number,
  weight: number,
  zone: MarkerScore["zone"],
  system: MarkerScore["system"] = null,
): MarkerScore => ({ code, score, weight_effective: weight, zone, system, penalty: 0 });

Deno.test("M8: пустой вход → нулевые суммы и пустые списки", () => {
  const r = computeExplainability([]);
  assertEquals(r.top_negative.length, 0);
  assertEquals(r.top_positive.length, 0);
  assertEquals(r.total_negative_load, 0);
});

Deno.test("M8: топ-негатив сортируется по weight·(1−score) убыванию", () => {
  const r = computeExplainability([
    mk("A", 0.5, 1, "normal"),       // contrib = 0.5
    mk("B", 0.2, 2, "risk"),         // contrib = 1.6  ← топ
    mk("C", 0.9, 1, "normal"),       // contrib = 0.1
    mk("D", 0.0, 1.5, "critical"),   // contrib = 1.5
  ]);
  assertEquals(r.top_negative[0].code, "B");
  assertEquals(r.top_negative[1].code, "D");
  assertEquals(r.top_negative[2].code, "A");
});

Deno.test("M8: optimal-маркеры не попадают в негатив, но идут в позитив", () => {
  const r = computeExplainability([
    mk("OPT1", 1.0, 1, "optimal"),
    mk("OPT2", 1.0, 1.5, "optimal"),
    mk("BAD", 0.3, 1, "risk"),
  ]);
  assertEquals(r.top_positive.length, 2);
  assertEquals(r.top_positive[0].code, "OPT2"); // больший weight
  assertEquals(r.top_negative.length, 1);
  assertEquals(r.top_negative[0].code, "BAD");
});

Deno.test("M8: per_system хранит топ-1 негатив в каждой системе", () => {
  const r = computeExplainability([
    mk("CV1", 0.5, 1, "normal", "cardiovascular"),
    mk("CV2", 0.2, 1, "risk", "cardiovascular"),   // топ CV
    mk("MT1", 0.4, 1, "normal", "metabolism"),     // топ Metabolism
    mk("INF", 1.0, 1, "optimal", "inflammation"),  // optimal — не учитывается
  ]);
  assertEquals(r.per_system.cardiovascular?.code, "CV2");
  assertEquals(r.per_system.metabolism?.code, "MT1");
  assertEquals(r.per_system.inflammation, undefined);
});

Deno.test("M8: critical-маркер с usual_weight×multiplier даёт большой вклад", () => {
  const r = computeExplainability([
    mk("CRIT", 0.1, 2.5, "critical"),
    mk("MILD", 0.7, 1, "normal"),
  ]);
  assertEquals(r.top_negative[0].code, "CRIT");
  assert(r.top_negative[0].contribution > 2);
});

Deno.test("M8: zone=unknown игнорируется", () => {
  const r = computeExplainability([
    mk("X", 0, 1, "unknown"),
    mk("Y", 0.5, 1, "risk"),
  ]);
  assertEquals(r.top_negative.length, 1);
  assertEquals(r.top_negative[0].code, "Y");
});

Deno.test("M8: лимиты topNegative/topPositive соблюдаются", () => {
  const items = Array.from({ length: 10 }).map((_, i) =>
    mk(`N${i}`, 0.3, 1 + i * 0.1, "risk"),
  );
  const r = computeExplainability(items, { topNegative: 3 });
  assertEquals(r.top_negative.length, 3);
  // Самый большой weight (N9) идёт первым
  assertEquals(r.top_negative[0].code, "N9");
});

Deno.test("M8: total_negative_load = сумма всех contribution", () => {
  const r = computeExplainability([
    mk("A", 0.5, 1, "normal"),   // 0.5
    mk("B", 0.0, 2, "critical"), // 2.0
  ]);
  assertEquals(r.total_negative_load, 2.5);
});
