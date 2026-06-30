import { assertAlmostEquals, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeDerivedMarkers } from "./m2-derived.ts";

Deno.test("M2: NLR = neut/lymph", () => {
  const r = computeDerivedMarkers({ neut_abs: 4, lymph_abs: 2 });
  const nlr = r.find((x) => x.code === "NLR")!;
  assertAlmostEquals(nlr.value, 2, 1e-9);
});

Deno.test("M2: AIP = log10(TG/HDL)", () => {
  const r = computeDerivedMarkers({ tg: 1.5, hdl: 1.5 });
  const aip = r.find((x) => x.code === "AIP")!;
  assertAlmostEquals(aip.value, 0, 1e-9);
});

Deno.test("M2: HOMA-IR формула", () => {
  const r = computeDerivedMarkers({ ins: 10, glu: 5 });
  const homa = r.find((x) => x.code === "HOMA_IR")!;
  assertAlmostEquals(homa.value, (10 * 5) / 22.5, 1e-9);
});

Deno.test("M2: eGFR — здоровый взрослый ≈ 90+", () => {
  // Мужчина 30 лет, креатинин 80 мкмоль/л (~0.9 мг/дл) → eGFR > 100
  const r = computeDerivedMarkers({ age: 30, sex: "male", creat_umol: 80 });
  const e = r.find((x) => x.code === "eGFR")!;
  if (!(e.value > 100)) throw new Error(`expected eGFR>100, got ${e.value}`);
});

Deno.test("M2: пропуск при отсутствии входов", () => {
  const r = computeDerivedMarkers({});
  assertEquals(r.length, 0);
});

Deno.test("M2: TyG монотонна по TG", () => {
  const a = computeDerivedMarkers({ tg: 1.0, glu: 5 }).find((x) => x.code === "TyG")!;
  const b = computeDerivedMarkers({ tg: 2.0, glu: 5 }).find((x) => x.code === "TyG")!;
  if (!(b.value > a.value)) throw new Error("TyG should grow with TG");
});
