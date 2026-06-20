/**
 * Расчётные (производные) биомаркеры.
 *
 * Эти показатели НЕ измеряются в лаборатории напрямую — они вычисляются
 * по формулам на основе других биомаркеров. Чтобы значения всегда
 * соответствовали клинической логике (например, HOMA-IR должен совпадать
 * с (Глюкоза × Инсулин) / 22.5), мы пересчитываем их и при ручном вводе,
 * и при генерации мок-данных.
 *
 * Если входных данных нет — расчётный показатель не заполняется.
 */

export type InputValues = Record<string, number>; // ключ — code биомаркера, значение — число

/**
 * Контекст пациента для формул, которым нужны возраст/пол (например, CKD-EPI eGFR).
 */
export interface CalcContext {
  age?: number | null;
  sex?: "male" | "female" | null;
}

/**
 * Описание одной расчётной формулы.
 */
interface CalculatedFormula {
  /** Код биомаркера, который вычисляется */
  outputCode: string;
  /** Список кодов входных биомаркеров, обязательных для расчёта */
  requiredInputs: string[];
  /** Функция расчёта. Возвращает null, если расчёт невозможен */
  compute: (inputs: InputValues, ctx: CalcContext) => number | null;
  /** Требует ли формула возраст/пол из контекста */
  requiresContext?: boolean;
  /** Количество знаков после запятой для округления */
  precision: number;
}

/**
 * Округление до заданного числа знаков.
 */
function round(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Реестр всех расчётных биомаркеров системы.
 *
 * Все формулы используют единицы СИ, принятые в проекте:
 *   GLU — ммоль/л
 *   INS — мкМЕ/мл
 *   TC, HDL, LDL, VLDL, TG — ммоль/л
 *   HGB — г/л
 *   RBC — ×10¹²/л
 *   HCT — %
 */
export const CALCULATED_FORMULAS: CalculatedFormula[] = [
  // HOMA-IR = (Глюкоза × Инсулин) / 22.5
  {
    outputCode: "HOMA-IR",
    requiredInputs: ["GLU", "INS"],
    compute: ({ GLU, INS }) => (GLU * INS) / 22.5,
    precision: 2,
  },
  // Индекс Каро = Глюкоза / Инсулин
  {
    outputCode: "Caro",
    requiredInputs: ["GLU", "INS"],
    compute: ({ GLU, INS }) => {
      if (INS <= 0) return null;
      return GLU / INS;
    },
    precision: 2,
  },
  // VLDL ≈ Триглицериды / 2.2 (формула в ммоль/л)
  {
    outputCode: "VLDL",
    requiredInputs: ["TG"],
    compute: ({ TG }) => TG / 2.2,
    precision: 2,
  },
  // LDL по Фридвальду = TC − HDL − (TG / 2.2). Не валидно при TG > 4.5 ммоль/л.
  {
    outputCode: "LDL",
    requiredInputs: ["TC", "HDL", "TG"],
    compute: ({ TC, HDL, TG }) => {
      if (TG > 4.5) return null;
      const ldl = TC - HDL - TG / 2.2;
      return ldl > 0 ? ldl : null;
    },
    precision: 2,
  },
  // Индекс атерогенности = (Общий холестерин − HDL) / HDL
  {
    outputCode: "AI",
    requiredInputs: ["TC", "HDL"],
    compute: ({ TC, HDL }) => {
      if (HDL <= 0) return null;
      return (TC - HDL) / HDL;
    },
    precision: 2,
  },
  // MCV = (Гематокрит % × 10) / Эритроциты (×10¹²/л) → фл
  {
    outputCode: "MCV",
    requiredInputs: ["HCT", "RBC"],
    compute: ({ HCT, RBC }) => {
      if (RBC <= 0) return null;
      return (HCT * 10) / RBC;
    },
    precision: 1,
  },
  // MCH = Гемоглобин (г/л) / Эритроциты (×10¹²/л) → пг
  {
    outputCode: "MCH",
    requiredInputs: ["HGB", "RBC"],
    compute: ({ HGB, RBC }) => {
      if (RBC <= 0) return null;
      return HGB / RBC;
    },
    precision: 1,
  },
  // MCHC = (Гемоглобин г/л × 100) / (Гематокрит % × 10) = Гемоглобин / Гематокрит × 10
  {
    outputCode: "MCHC",
    requiredInputs: ["HGB", "HCT"],
    compute: ({ HGB, HCT }) => {
      if (HCT <= 0) return null;
      return (HGB / HCT) * 10;
    },
    precision: 0,
  },
];

/**
 * Список кодов всех расчётных биомаркеров — удобно для UI (read-only поля).
 */
export const CALCULATED_BIOMARKER_CODES = new Set(
  CALCULATED_FORMULAS.map((f) => f.outputCode)
);

/**
 * Проверить, является ли биомаркер расчётным по его коду.
 */
export function isCalculatedBiomarker(code: string): boolean {
  return CALCULATED_BIOMARKER_CODES.has(code);
}

/**
 * Получить формулу для биомаркера.
 */
export function getFormulaForCode(code: string): CalculatedFormula | undefined {
  return CALCULATED_FORMULAS.find((f) => f.outputCode === code);
}

/**
 * Рассчитать все производные показатели на основе входных значений.
 * Возвращает Map<code, value> только для тех показателей, которые удалось вычислить.
 */
export function computeAllDerivedValues(inputs: InputValues): Map<string, number> {
  const results = new Map<string, number>();

  for (const formula of CALCULATED_FORMULAS) {
    // Проверяем, что все входы есть и являются конечными числами
    const hasAllInputs = formula.requiredInputs.every(
      (code) => typeof inputs[code] === "number" && isFinite(inputs[code])
    );
    if (!hasAllInputs) continue;

    const value = formula.compute(inputs);
    if (value === null || !isFinite(value)) continue;

    results.set(formula.outputCode, round(value, formula.precision));
  }

  return results;
}

/**
 * Удобная человекочитаемая подпись формулы — для подсказки в UI.
 */
export function getFormulaDescription(code: string): string | null {
  switch (code) {
    case "HOMA-IR":
      return "(Глюкоза × Инсулин) / 22.5";
    case "Caro":
      return "Глюкоза / Инсулин";
    case "VLDL":
      return "Триглицериды / 2.2";
    case "LDL":
      return "Общий холестерин − HDL − (Триглицериды / 2.2)";
    case "AI":
      return "(Общий холестерин − HDL) / HDL";
    case "MCV":
      return "(Гематокрит × 10) / Эритроциты";
    case "MCH":
      return "Гемоглобин / Эритроциты";
    case "MCHC":
      return "(Гемоглобин / Гематокрит) × 10";
    default:
      return null;
  }
}
