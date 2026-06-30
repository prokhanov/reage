import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computePhenoAge,
  computeKDMAge,
  computeBioAge,
  pickPhenoInputs,
} from "./m5-bioage.ts";
import type { MarkerInput } from "./types.ts";

const mkMarker = (code: string, value: number): MarkerInput => ({
  code,
  value,
  system: null,
  range: { optimal_min: null, optimal_max: null, normal_min: null, normal_max: null },
});

// Здоровый 40-летний — PhenoAge должен быть близок к 40 (±5 лет).
const HEALTHY_40 = [
  mkMarker("ALB", 47),
  mkMarker("CREA", 80),
  mkMarker("GLU", 4.9),
  mkMarker("hs-CRP", 0.7),
  mkMarker("LYMPH", 35),
  mkMarker("MCV", 89),
  mkMarker("RDW", 12.8),
  mkMarker("ALP", 75),
  mkMarker("WBC", 6.0),
];

Deno.test("PhenoAge: здоровый 40-летний даёт BA ≈ 40 (±5)", () => {
  const pi = pickPhenoInputs(HEALTHY_40, 40)!;
  assert(pi !== null, "должны собрать все 9 маркеров");
  const ba = computePhenoAge(pi);
  assert(ba >= 32 && ba <= 48, `ожидали 32..48, получили ${ba.toFixed(1)}`);
});

Deno.test("PhenoAge: воспаление и высокий ALP повышают BA", () => {
  const sick = HEALTHY_40.map((m) => {
    if (m.code === "hs-CRP") return { ...m, value: 8 };
    if (m.code === "ALP") return { ...m, value: 180 };
    if (m.code === "GLU") return { ...m, value: 6.8 };
    return m;
  });
  const baH = computePhenoAge(pickPhenoInputs(HEALTHY_40, 40)!);
  const baS = computePhenoAge(pickPhenoInputs(sick, 40)!);
  assert(baS > baH + 3, `больной должен быть старше: healthy=${baH.toFixed(1)} sick=${baS.toFixed(1)}`);
});

Deno.test("PhenoAge: монотонность по хроновозрасту", () => {
  const at = (age: number) => computePhenoAge(pickPhenoInputs(HEALTHY_40, age)!);
  assert(at(30) < at(50) && at(50) < at(70));
});

Deno.test("pickPhenoInputs: возвращает null если хоть один маркер отсутствует", () => {
  const incomplete = HEALTHY_40.filter((m) => m.code !== "RDW");
  assertEquals(pickPhenoInputs(incomplete, 40), null);
});

Deno.test("KDM: здоровый 40-летний даёт BA близкое к 40 (±8 после shrinkage)", () => {
  const ba = computeKDMAge(HEALTHY_40, 40);
  assert(ba !== null);
  assert(Math.abs(ba! - 40) <= 8, `получили ${ba!.toFixed(1)}`);
});

Deno.test("KDM: возвращает null при <4 маркерах", () => {
  const few = HEALTHY_40.slice(0, 3);
  assertEquals(computeKDMAge(few, 40), null);
});

Deno.test("computeBioAge: гибрид PhenoAge+KDM, без клампа у здорового", () => {
  const r = computeBioAge(HEALTHY_40, 40);
  assert(r.phenoage !== null && r.kdm !== null);
  assert(!r.fallback_used);
  assert(Math.abs(r.bio_age - 40) <= 10);
});

Deno.test("computeBioAge: коридор ограничивает экстремум", () => {
  // Сильно "больной" 30-летний — без коридора BA ушёл бы за 50.
  const bad = HEALTHY_40.map((m) => {
    if (m.code === "hs-CRP") return { ...m, value: 25 };
    if (m.code === "GLU") return { ...m, value: 12 };
    if (m.code === "ALP") return { ...m, value: 400 };
    if (m.code === "CREA") return { ...m, value: 180 };
    if (m.code === "WBC") return { ...m, value: 14 };
    return m;
  });
  const r = computeBioAge(bad, 30, { corridor: { years_below: 15, years_above: 15 } });
  assertEquals(r.bio_age, 45);
  assert(r.clamped);
});

Deno.test("computeBioAge: fallback при отсутствии маркеров", () => {
  const r = computeBioAge([], 35, { fallback: 38 });
  assert(r.fallback_used);
  assertEquals(r.bio_age, 38);
});

Deno.test("computeBioAge: blend веса работают (100% PhenoAge)", () => {
  const r = computeBioAge(HEALTHY_40, 40, { blend: { phenoage: 1, kdm: 0 } });
  assertEquals(r.bio_age, r.phenoage);
});
