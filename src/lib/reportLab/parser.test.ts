import { describe, it, expect } from "vitest";
import { parseCategory, buildBiomarkerIndex, normalizeCode } from "./parser";
import type { LabReport, ReportBiomarker } from "./types";

function mkBio(code: string, name: string): ReportBiomarker {
  return {
    id: code,
    code,
    name,
    category: "Test",
    unit: null,
    value: 0,
    normal_min: null, normal_max: null,
    normal_min_male: null, normal_max_male: null,
    normal_min_female: null, normal_max_female: null,
    optimal_min: null, optimal_max: null,
    optimal_min_male: null, optimal_max_male: null,
    optimal_min_female: null, optimal_max_female: null,
    critical_min: null, critical_max: null,
    critical_min_male: null, critical_max_male: null,
    critical_min_female: null, critical_max_female: null,
    range_mode: null, description: null, general_description: null,
    display_order: null, age_ranges: null,
  };
}

function mkReport(bios: ReportBiomarker[]): LabReport {
  return {
    version: 1, generatedAt: "2026-01-01",
    patient: { first_name: "", last_name: null, gender: null, birth_date: null, height: null, weight: null },
    analysis: { id: "a", date: "2026-01-01", lab_name: null, note: null, health_index: null, biological_age: null },
    recommendations: [], biomarkers: bios,
  };
}

function expectAllWrapped(text: string, index: Map<string, ReportBiomarker>, expectedCodes: string[]) {
  const parsed = parseCategory("Тест", text, index);
  const wrappedCodes = parsed.blocks
    .filter((b): b is { kind: "biomarker"; code: string; commentary: string } => b.kind === "biomarker")
    .map((b) => normalizeCode(b.code));
  for (const code of expectedCodes) {
    expect(wrappedCodes, `биомаркер ${code} должен быть обёрнут в карточку`).toContain(normalizeCode(code));
  }
}

describe("reportLab parser — обёртка биомаркеров в карточки", () => {
  const bios = [
    mkBio("LPA", "Липопротеин(а)"),
    mkBio("hs-CRP", "С-реактивный белок высокочувствительный"),
    mkBio("HDL", "Липопротеины высокой плотности"),
    mkBio("RDW-SD", "Ширина распределения эритроцитов (SD)"),
  ];
  const report = mkReport(bios);
  const index = buildBiomarkerIndex(report);

  it("оборачивает биомаркер с явным HTML-якорем", () => {
    const text = `
## Липидный профиль
<!-- anchor:biomarker HDL -->
Липопротеины высокой плотности
Ваш показатель 1.2 ммоль/л.
<!-- anchor:biomarker_end -->
`;
    expectAllWrapped(text, index, ["HDL"]);
  });

  it("баг Минеевой: один якорь есть, второй биомаркер БЕЗ якоря — оба должны стать карточками (пер-код дедуп)", () => {
    const text = `
## Липидный профиль
<!-- anchor:biomarker HDL -->
Липопротеины высокой плотности
Ваш HDL в норме.
<!-- anchor:biomarker_end -->

Липопротеин(а) (Lp(a)) — это генетически детерминированный маркер, важен как независимый предиктор атеросклероза. Значение 45 мг/дл повышено.

## Общая оценка системы
Итоги.
`;
    expectAllWrapped(text, index, ["HDL", "LPA"]);
  });

  it("code-first: имя в тексте отличается от имени в БД, но (CODE) корректный", () => {
    const text = `
## CBC
Показатель распределения эритроцитов (RDW-SD) отражает вариабельность объёма клеток. Значение 42 fL.
`;
    expectAllWrapped(text, index, ["RDW-SD"]);
  });

  it("standalone-заголовок «Имя (КОД)» с последующим абзацем", () => {
    const text = `
## Воспаление
С-реактивный белок высокочувствительный (hs-CRP)

Это маркер системного воспаления. Ваш показатель 0.8 мг/л.
`;
    expectAllWrapped(text, index, ["hs-CRP"]);
  });

  it("не оборачивает случайные скобки в прозе, если код не из снапшота", () => {
    const text = `
## Прочее
Иногда в анализах встречается маркер (XYZ), но он у вас не измерялся.
`;
    const parsed = parseCategory("Тест", text, index);
    const biomarkerBlocks = parsed.blocks.filter((b) => b.kind === "biomarker");
    expect(biomarkerBlocks).toHaveLength(0);
  });

  it("не создаёт дубль карточки для кода, у которого уже стоит якорь", () => {
    const text = `
## Липиды
<!-- anchor:biomarker HDL -->
Липопротеины высокой плотности
Значение 1.2.
<!-- anchor:biomarker_end -->

Липопротеины высокой плотности (HDL) — повторное упоминание в прозе.
`;
    const parsed = parseCategory("Тест", text, index);
    const hdlCards = parsed.blocks.filter(
      (b) => b.kind === "biomarker" && normalizeCode(b.code) === "hdl",
    );
    expect(hdlCards).toHaveLength(1);
  });
});

describe("reportLab parser — валидация покрытия", () => {
  it("все биомаркеры снапшота, упомянутые в тексте, отрисованы карточками", () => {
    const bios = [
      mkBio("LPA", "Липопротеин(а)"),
      mkBio("HDL", "Липопротеины высокой плотности"),
      mkBio("LDL", "Липопротеины низкой плотности"),
      mkBio("TG", "Триглицериды"),
    ];
    const report = mkReport(bios);
    const index = buildBiomarkerIndex(report);
    const text = `
## Липидный профиль
<!-- anchor:biomarker HDL -->
Липопротеины высокой плотности
1.2 ммоль/л.
<!-- anchor:biomarker_end -->

Липопротеин(а) (Lp(a)) значение 45 мг/дл.

Липопротеины низкой плотности (LDL) 3.4 ммоль/л — повышены.

Триглицериды (TG) 1.1 ммоль/л — в норме.

## Заключение
Итоги.
`;
    const parsed = parseCategory("Липидный профиль", text, index);
    const wrapped = new Set(
      parsed.blocks
        .filter((b) => b.kind === "biomarker")
        .map((b) => normalizeCode((b as { code: string }).code)),
    );
    const missing = bios
      .map((b) => normalizeCode(b.code))
      .filter((c) => !wrapped.has(c));
    expect(missing, `не обёрнуты: ${missing.join(", ")}`).toEqual([]);
  });
});
