import { describe, it, expect } from "vitest";
import { parseAnchors } from "./anchorParser";

function wrappedCodes(text: string, codes: string[], nameToCode?: Record<string, string>) {
  const blocks = parseAnchors(text, codes, nameToCode);
  return blocks
    .filter((b) => b.type === "biomarker")
    .map((b) => (b as { code: string }).code.toLowerCase());
}

describe("anchorParser (legacy) — обёртка биомаркеров", () => {
  const codes = ["LPA", "HDL", "LDL", "hs-CRP", "RDW-SD"];
  const nameToCode: Record<string, string> = {
    "Липопротеин(а)": "LPA",
    "Липопротеины высокой плотности": "HDL",
    "Липопротеины низкой плотности": "LDL",
    "С-реактивный белок высокочувствительный": "hs-CRP",
    "Ширина распределения эритроцитов (SD)": "RDW-SD",
  };

  it("оборачивает биомаркер с явным якорем", () => {
    const text = `
<!-- anchor:biomarker HDL -->
Липопротеины высокой плотности
Значение 1.2.
<!-- anchor:biomarker_end -->
`;
    expect(wrappedCodes(text, codes, nameToCode)).toContain("hdl");
  });

  it("code-first: `Липопротеин(а) (Lp(a)) …` создаёт карточку LPA даже когда рядом есть якорь другого биомаркера", () => {
    const text = `
<!-- anchor:biomarker HDL -->
Липопротеины высокой плотности
Значение 1.2.
<!-- anchor:biomarker_end -->

Липопротеин(а) (Lp(a)) — независимый предиктор атеросклероза. Значение 45 мг/дл.

## Общая оценка системы
`;
    const wrapped = wrappedCodes(text, codes, nameToCode);
    expect(wrapped).toContain("hdl");
    expect(wrapped).toContain("lpa");
  });

  it("все биомаркеры из снапшота, упомянутые в тексте, получают карточку", () => {
    const text = `
## Липидный профиль

<!-- anchor:biomarker HDL -->
Липопротеины высокой плотности
1.2 ммоль/л.
<!-- anchor:biomarker_end -->

Липопротеин(а) (Lp(a)) значение 45 мг/дл.

Липопротеины низкой плотности (LDL) 3.4 ммоль/л.

## Заключение
`;
    const wrapped = new Set(wrappedCodes(text, codes, nameToCode));
    const expected = ["HDL", "LPA", "LDL"];
    const missing = expected.filter((c) => !wrapped.has(c.toLowerCase()));
    expect(missing, `не обёрнуты: ${missing.join(", ")}`).toEqual([]);
  });
});
