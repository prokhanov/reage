import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeTrajectory } from "./m7-trajectory.ts";
import { DEFAULT_HEALTH_MODEL_SETTINGS } from "./types.ts";

const S = DEFAULT_HEALTH_MODEL_SETTINGS;
const NOW = new Date("2025-01-01T00:00:00Z");

Deno.test("M7: pace=1, нет назначений → BA растёт линейно, HI стабилен", () => {
  const r = computeTrajectory(
    { bio_age_now: 40, hi_now: 80, chrono_age: 40, pace: 1, prescriptions: [], now: NOW },
    S,
  );
  assertEquals(r.points.length, 3);
  assertEquals(r.points[0].horizon_months, 3);
  assertEquals(r.points[2].horizon_months, 12);
  assertEquals(r.points[2].ba_predicted, 41.0);
  assertEquals(r.points[2].hi_predicted, 80.0);
});

Deno.test("M7: pace=null → используется нейтральный 1.0, флаг pace_was_null", () => {
  const r = computeTrajectory(
    { bio_age_now: 40, hi_now: 80, chrono_age: 40, pace: null, prescriptions: [], now: NOW },
    S,
  );
  assertEquals(r.pace_used, 1);
  assertEquals(r.pace_was_null, true);
});

Deno.test("M7: pace=1.5 → ускоренное старение тянет HI вниз", () => {
  const r = computeTrajectory(
    { bio_age_now: 40, hi_now: 80, chrono_age: 40, pace: 1.5, prescriptions: [], now: NOW },
    S,
  );
  // hi_base за год = 80 − 0.5*1.5*1 = 79.25
  assert(r.points[2].hi_predicted < 80);
  assert(r.points[2].ba_predicted > 41);
});

Deno.test("M7: назначение с bio_age_delta=2/год снижает BA через 12 мес", () => {
  const rNone = computeTrajectory(
    { bio_age_now: 42, hi_now: 75, chrono_age: 40, pace: 1, prescriptions: [], now: NOW },
    S,
  );
  const rWith = computeTrajectory(
    {
      bio_age_now: 42,
      hi_now: 75,
      chrono_age: 40,
      pace: 1,
      prescriptions: [{ id: "p1", title: "Витамин D", bio_age_delta: 2, hi_delta: 5, recovery_months: 6 }],
      now: NOW,
    },
    S,
  );
  assert(rWith.points[2].ba_predicted < rNone.points[2].ba_predicted);
  assert(rWith.points[2].hi_predicted > rNone.points[2].hi_predicted);
  assertEquals(rWith.points[2].drivers.length, 1);
});

Deno.test("M7: ramp насыщается — на 12 мес при recovery=6 эффект полный (×1)", () => {
  const r = computeTrajectory(
    {
      bio_age_now: 40,
      hi_now: 70,
      chrono_age: 40,
      pace: 1,
      prescriptions: [{ id: "p1", bio_age_delta: 1, hi_delta: 4, recovery_months: 6 }],
      now: NOW,
    },
    S,
  );
  // На 3 мес ramp=0.5 → −0.5 BA. На 12 мес ramp=1 → −1.0 BA.
  assertEquals(r.points[0].ba_delta_from_prescriptions, -0.5);
  assertEquals(r.points[2].ba_delta_from_prescriptions, -1);
});

Deno.test("M7: BA не падает ниже chrono − 15 (коридор)", () => {
  const r = computeTrajectory(
    {
      bio_age_now: 30,
      hi_now: 95,
      chrono_age: 40,
      pace: 1,
      prescriptions: [{ bio_age_delta: 50, hi_delta: 0, recovery_months: 1 }],
      now: NOW,
    },
    S,
  );
  assert(r.points[2].ba_predicted >= 25);
});

Deno.test("M7: HI ограничен [5..97]", () => {
  const r = computeTrajectory(
    {
      bio_age_now: 40, hi_now: 90, chrono_age: 40, pace: 1,
      prescriptions: [{ bio_age_delta: 0, hi_delta: 50, recovery_months: 1 }],
      now: NOW,
    },
    S,
  );
  assert(r.points[2].hi_predicted <= 97);
});

Deno.test("M7: drivers сортируются по абсолютному вкладу в HI и ограничены 5", () => {
  const presc = Array.from({ length: 8 }).map((_, i) => ({
    id: `p${i}`,
    title: `Rx ${i}`,
    bio_age_delta: 0.1,
    hi_delta: i + 1,
    recovery_months: 6,
  }));
  const r = computeTrajectory(
    { bio_age_now: 40, hi_now: 70, chrono_age: 40, pace: 1, prescriptions: presc, now: NOW },
    S,
  );
  const p12 = r.points[2];
  assertEquals(p12.drivers.length, 5);
  // Первый — с самым большим hi_delta (id=p7).
  assertEquals(p12.drivers[0].id, "p7");
});

Deno.test("M7: даты горизонтов вычисляются корректно", () => {
  const r = computeTrajectory(
    { bio_age_now: 40, hi_now: 80, chrono_age: 40, pace: 1, prescriptions: [], now: NOW },
    S,
  );
  assertEquals(r.points[0].date, "2025-04-01");
  assertEquals(r.points[1].date, "2025-07-01");
  assertEquals(r.points[2].date, "2026-01-01");
});
