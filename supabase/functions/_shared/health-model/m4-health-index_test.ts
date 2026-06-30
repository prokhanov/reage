import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeHealthIndex } from "./m4-health-index.ts";
import { DEFAULT_HEALTH_MODEL_SETTINGS } from "./types.ts";
import type { SystemKey, SystemScore } from "./types.ts";

function sys(system: SystemKey, score: number | null): SystemScore {
  return {
    system,
    score,
    markers_used: 3,
    markers_total: 5,
    coverage: 0.6,
    insufficient: score == null,
  };
}

Deno.test("M4: все системы 100 → HI ≈ 97 (потолок) без штрафа", () => {
  const sysAll: SystemScore[] = [
    sys("cardiovascular", 100),
    sys("metabolism", 100),
    sys("inflammation", 100),
    sys("endocrine", 100),
    sys("energy", 100),
  ];
  const r = computeHealthIndex(sysAll, DEFAULT_HEALTH_MODEL_SETTINGS);
  assertEquals(r.dispersion_penalty, 0);
  assert(r.hi <= 97 && r.hi >= 90);
});

Deno.test("M4: все нули → HI = 5 (пол)", () => {
  const sysAll: SystemScore[] = [
    sys("cardiovascular", 0),
    sys("metabolism", 0),
    sys("inflammation", 0),
    sys("endocrine", 0),
    sys("energy", 0),
  ];
  const r = computeHealthIndex(sysAll, DEFAULT_HEALTH_MODEL_SETTINGS);
  assertEquals(r.hi, 5);
});

Deno.test("M4: разбаланс снижает HI", () => {
  const balanced: SystemScore[] = [
    sys("cardiovascular", 70), sys("metabolism", 70), sys("inflammation", 70),
    sys("endocrine", 70), sys("energy", 70),
  ];
  const skewed: SystemScore[] = [
    sys("cardiovascular", 100), sys("metabolism", 100), sys("inflammation", 30),
    sys("endocrine", 60), sys("energy", 60),
  ];
  const a = computeHealthIndex(balanced, DEFAULT_HEALTH_MODEL_SETTINGS);
  const b = computeHealthIndex(skewed, DEFAULT_HEALTH_MODEL_SETTINGS);
  assert(b.dispersion_penalty > a.dispersion_penalty);
});

Deno.test("M4: бонус за улучшение при росте vs прошлого", () => {
  const s: SystemScore[] = [
    sys("cardiovascular", 70), sys("metabolism", 70), sys("inflammation", 70),
    sys("endocrine", 70), sys("energy", 70),
  ];
  const noPrev = computeHealthIndex(s, DEFAULT_HEALTH_MODEL_SETTINGS);
  const withPrev = computeHealthIndex(s, DEFAULT_HEALTH_MODEL_SETTINGS, 60);
  assert(withPrev.improvement_bonus > 0);
  assertEquals(noPrev.improvement_bonus, 0);
});

Deno.test("M4: системы без данных не учитываются", () => {
  const partial: SystemScore[] = [
    sys("cardiovascular", 80), sys("metabolism", 80), sys("inflammation", null),
    sys("endocrine", null), sys("energy", null),
  ];
  const r = computeHealthIndex(partial, DEFAULT_HEALTH_MODEL_SETTINGS);
  assert(r.hi > 70 && r.hi <= 97);
});
