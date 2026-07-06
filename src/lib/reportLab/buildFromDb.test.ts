import { describe, it, expect, vi, beforeEach } from "vitest";

const eqSpy = vi.fn();
const orderSpy = vi.fn();
const maybeSingleSpy = vi.fn();
const selectSpy = vi.fn();
const fromSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => fromSpy(table),
  },
}));

/**
 * Мок цепочки .from().select().eq().(eq()/order()/maybeSingle()).
 * Возвращаем разные наборы данных в зависимости от table.
 */
function installFromMock(fixtures: Record<string, { data: unknown; error: unknown }>) {
  fromSpy.mockImplementation((table: string) => {
    const result = fixtures[table] ?? { data: null, error: null };
    const chain: Record<string, unknown> = {};
    const thenable = {
      ...chain,
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    const api: Record<string, unknown> = {
      select: () => api,
      eq: () => api,
      order: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: thenable.then,
    };
    return api;
  });
}

beforeEach(() => {
  fromSpy.mockReset();
  eqSpy.mockReset();
  orderSpy.mockReset();
  maybeSingleSpy.mockReset();
  selectSpy.mockReset();
});

describe("buildLabReportFromDb", () => {
  it("собирает пустой валидный отчёт, если у анализа ничего нет", async () => {
    installFromMock({
      analyses: {
        data: {
          id: "a1",
          date: "2026-06-01",
          lab_name: null,
          note: null,
          health_index: null,
          biological_age: null,
        },
        error: null,
      },
      profiles: { data: {}, error: null },
      analysis_values: { data: [], error: null },
      recommendations: { data: [], error: null },
      prescriptions: { data: [], error: null },
    });

    const { buildLabReportFromDb } = await import("./buildFromDb");
    const report = await buildLabReportFromDb("a1", "u1");
    expect(report.version).toBe(1);
    expect(report.analysis.id).toBe("a1");
    expect(report.biomarkers).toEqual([]);
    expect(report.recommendations).toEqual([]);
    expect(report.prescriptions).toEqual([]);
    expect(report.patient.first_name).toBe("");
  });

  it("маппит биомаркеры, рекомендации и назначения", async () => {
    installFromMock({
      analyses: {
        data: {
          id: "a1",
          date: "2026-06-01",
          lab_name: "Lab",
          note: null,
          health_index: 70,
          biological_age: 42.1,
        },
        error: null,
      },
      profiles: {
        data: {
          first_name: "Иван",
          last_name: "Иванов",
          gender: "male",
          birth_date: "1980-01-01",
          height: "180",
          weight: 82,
        },
        error: null,
      },
      analysis_values: {
        data: [
          {
            id: "v1",
            value: 5.2,
            unit_override: null,
            biomarker_id: "b1",
            biomarkers: {
              id: "b1",
              code: "GLU",
              name: "Глюкоза",
              category: "Обмен",
              unit: "ммоль/л",
              display_order: 2,
              normal_min: 3.5,
              normal_max: 6.0,
            },
          },
          {
            id: "v2",
            value: 140,
            unit_override: null,
            biomarker_id: "b2",
            biomarkers: {
              id: "b2",
              code: "Hb",
              name: "Гемоглобин",
              category: "Кровь",
              unit: "г/л",
              display_order: 1,
            },
          },
        ],
        error: null,
      },
      recommendations: {
        data: [
          { id: "r1", type: "Общее резюме", text: "ok", content_json: null, created_at: "2026-06-01" },
        ],
        error: null,
      },
      prescriptions: {
        data: [
          {
            id: "p1",
            name: "Магний",
            form: "капсулы",
            dosage: "300 мг",
            how_to_take: "утром",
            duration: "1 мес",
            reason: null,
            effect: null,
            category: "Обмен",
          },
        ],
        error: null,
      },
    });

    const { buildLabReportFromDb } = await import("./buildFromDb");
    const report = await buildLabReportFromDb("a1", "u1");
    expect(report.patient.first_name).toBe("Иван");
    expect(report.patient.height).toBe(180);
    expect(report.biomarkers).toHaveLength(2);
    // Сортировка по категории (Кровь < Обмен по алфавиту).
    expect(report.biomarkers[0].category).toBe("Кровь");
    expect(report.recommendations).toHaveLength(1);
    expect(report.prescriptions).toHaveLength(1);
  });

  it("падает, если анализ не найден", async () => {
    installFromMock({
      analyses: { data: null, error: null },
      profiles: { data: {}, error: null },
      analysis_values: { data: [], error: null },
      recommendations: { data: [], error: null },
      prescriptions: { data: [], error: null },
    });

    const { buildLabReportFromDb } = await import("./buildFromDb");
    await expect(buildLabReportFromDb("missing", "u1")).rejects.toThrow(/не найден/i);
  });
});
