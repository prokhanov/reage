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
  // eGFR по формуле CKD-EPI 2021 (race-free).
  // Креатинин в проекте хранится в мкмоль/л → переводим в мг/дл делением на 88.4.
  // Scr_mgdl = CREA / 88.4
  // κ = 0.7 (жен.), 0.9 (муж.); α = -0.241 (жен.), -0.302 (муж.)
  // eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^-1.200 × 0.9938^age × (1.012 если жен.)
  {
    outputCode: "GFR",
    requiredInputs: ["CREA"],
    requiresContext: true,
    compute: ({ CREA }, { age, sex }) => {
      if (!CREA || CREA <= 0) return null;
      if (age == null || age <= 0) return null;
      if (sex !== "male" && sex !== "female") return null;
      const scr = CREA / 88.4; // мкмоль/л → мг/дл
      const kappa = sex === "female" ? 0.7 : 0.9;
      const alpha = sex === "female" ? -0.241 : -0.302;
      const ratio = scr / kappa;
      const minTerm = Math.pow(Math.min(ratio, 1), alpha);
      const maxTerm = Math.pow(Math.max(ratio, 1), -1.2);
      const ageTerm = Math.pow(0.9938, age);
      const sexTerm = sex === "female" ? 1.012 : 1;
      return 142 * minTerm * maxTerm * ageTerm * sexTerm;
    },
    precision: 0,
  },
  // Насыщение трансферрина (TSAT, %) = Fe (мкмоль/л) / (TRANSF (г/л) × 25.1) × 100
  // 25.1 — коэффициент связывания: 1 г/л трансферрина связывает ~25.1 мкмоль Fe.
  {
    outputCode: "TSAT",
    requiredInputs: ["Fe", "TRANSF"],
    compute: ({ Fe, TRANSF }) => {
      if (TRANSF <= 0) return null;
      return (Fe / (TRANSF * 25.1)) * 100;
    },
    precision: 1,
  },
  // OSI-proxy = (MDA / GSH-Px) × 1000 — прокси-индекс оксидативного стресса.
  // Низкие значения = баланс в сторону антиоксидантной защиты; высокие = окислительный перевес.
  {
    outputCode: "OSI-proxy",
    requiredInputs: ["MDA", "GSH-Px"],
    compute: ({ MDA, "GSH-Px": GSHPx }) => {
      if (!GSHPx || GSHPx <= 0) return null;
      return (MDA / GSHPx) * 1000;
    },
    precision: 3,
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
export function computeAllDerivedValues(
  inputs: InputValues,
  ctx: CalcContext = {}
): Map<string, number> {
  const results = new Map<string, number>();

  for (const formula of CALCULATED_FORMULAS) {
    // Проверяем, что все входы есть и являются конечными числами
    const hasAllInputs = formula.requiredInputs.every(
      (code) => typeof inputs[code] === "number" && isFinite(inputs[code])
    );
    if (!hasAllInputs) continue;

    // Если формуле нужен контекст (возраст/пол), а его нет — пропускаем
    if (formula.requiresContext && (ctx.age == null || ctx.sex == null)) continue;

    const value = formula.compute(inputs, ctx);
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
    case "GFR":
      return "CKD-EPI 2021: f(Креатинин, возраст, пол)";
    case "TSAT":
      return "Fe / (Трансферрин × 25.1) × 100";
    case "OSI-proxy":
      return "(MDA / GSH-Px) × 1000";
    default:
      return null;
  }
}

