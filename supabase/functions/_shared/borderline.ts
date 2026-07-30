/**
 * Пограничная зона («borderline») — внутренняя градация ТОЛЬКО для ИИ.
 *
 * Пациент по-прежнему видит стандартные 7 сегментов и статус 🟠 РИСК / 🟡 ДОПУСТИМО.
 * Но если значение вышло за границу нормы менее чем на BORDERLINE_BAND_PERCENT,
 * ИИ получает пометку, что это лёгкое пограничное отклонение, а не клинический
 * синдром — и обязан смягчить формулировки (без диагнозов вида «гипермагниемия»).
 *
 * Ни шкала, ни бейджи, ни расчёт биовозраста/Health Index этим НЕ затрагиваются.
 */

/** Ширина пограничного коридора в процентах от значения границы нормы. */
export const BORDERLINE_BAND_PERCENT = 5;

/**
 * Дополнительное ограничение: пограничный коридор не может «съесть» больше
 * этой доли расстояния от границы нормы до критического порога.
 *
 * Нужно для маркеров с узким физиологическим окном (Cl 98–107 при крит. 112,
 * SG 1.005–1.030 при крит. 1.040, MCV 80–100 при крит. 110): там 5% от границы
 * шире, чем вся зона риска, и без этой поправки «пограничным» становилось бы
 * даже почти критическое значение.
 */
export const BORDERLINE_MAX_GAP_FRACTION = 0.3;

/**
 * Биомаркеры, для которых пограничная зона НЕ применяется.
 * Источник истины — утверждённый файл ReAge_final_ranges (колонка «Погран. зона ±5%»
 * со значением «нет (исключён)»). Коды нормализуются (верхний регистр, без пробелов).
 */
export const BORDERLINE_EXCLUDED_CODES = new Set(
  [
    // Углеводный обмен — диагностические пороги ADA/ВОЗ
    "GLU", "HbA1c",
    // Почки — KDIGO: минимальная альбуминурия / снижение СКФ прогностически значимы
    "CREA", "GFR", "MAU", "ACR", "PRO-U",
    // Электролиты с узким коридором
    "Na", "K", "Ca",
    // Кардио / тромбозы — пороги отсечки
    "Lp(a)", "PLT", "NT-proBNP", "INR", "APTT", "hs-TnI",
    // Аутоантитела — «слабоположительный» результат уже означает аутоиммунитет
    "Anti-TPO", "Anti-TG", "TRAb",
    // Патологические находки в моче: любое присутствие значимо
    "GLU-U", "KET-U", "BIL-U", "HB-U", "NIT-U",
    "LEU-EST-U", "ERY-RXN-U", "EPI-REN-U", "CYL-PATH-U",
  ].map(normalizeCode),
);


/** Приводит код биомаркера к каноническому виду для сравнения. */
export function normalizeCode(code: string | null | undefined): string {
  return String(code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}


export type BorderlineSide = "high" | "low";

export interface BorderlineInfo {
  side: BorderlineSide;
  /** На сколько процентов значение вышло за границу нормы. */
  deviationPercent: number;
  /** Граница нормы, за которую вышло значение. */
  boundary: number;
}

export interface BorderlineInput {
  code?: string | null;
  value: number;
  normalMin?: number | null;
  normalMax?: number | null;
  criticalMin?: number | null;
  criticalMax?: number | null;
  bandPercent?: number;
}

/**
 * Возвращает информацию о пограничном отклонении или null.
 * Пограничным считается значение, которое:
 *  - вышло за границу нормы,
 *  - но не более чем на bandPercent от этой границы,
 *  - и не более чем на BORDERLINE_MAX_GAP_FRACTION расстояния до крит. порога,
 *  - не является критическим,
 *  - и биомаркер не входит в список исключений.
 */
export function getBorderlineInfo(input: BorderlineInput): BorderlineInfo | null {
  const {
    code,
    value,
    normalMin = null,
    normalMax = null,
    criticalMin = null,
    criticalMax = null,
    bandPercent = BORDERLINE_BAND_PERCENT,
  } = input;

  if (!Number.isFinite(value)) return null;

  const normalized = normalizeCode(code);
  if (normalized && BORDERLINE_EXCLUDED_CODES.has(normalized)) return null;

  // Критические значения никогда не смягчаем
  if (criticalMin != null && value < criticalMin) return null;
  if (criticalMax != null && value > criticalMax) return null;

  /** Абсолютная ширина коридора с учётом расстояния до критического порога. */
  const bandWidth = (boundary: number, critical: number | null): number => {
    const byPercent = (Math.abs(boundary) * bandPercent) / 100;
    if (critical == null) return byPercent;
    const gap = Math.abs(critical - boundary);
    if (!(gap > 0)) return 0;
    return Math.min(byPercent, gap * BORDERLINE_MAX_GAP_FRACTION);
  };

  if (normalMax != null && value > normalMax) {
    if (normalMax === 0) return null; // «должно быть 0» — любое превышение значимо
    const width = bandWidth(normalMax, criticalMax);
    if (width > 0 && value - normalMax <= width) {
      const deviationPercent = ((value - normalMax) / Math.abs(normalMax)) * 100;
      return { side: "high", deviationPercent, boundary: normalMax };
    }
    return null;
  }

  if (normalMin != null && value < normalMin) {
    if (normalMin === 0) return null;
    const width = bandWidth(normalMin, criticalMin);
    if (width > 0 && normalMin - value <= width) {
      const deviationPercent = ((normalMin - value) / Math.abs(normalMin)) * 100;
      return { side: "low", deviationPercent, boundary: normalMin };
    }
  }

  return null;

}

/** Короткая пометка для строки биомаркера в промпте. */
export function borderlineTag(info: BorderlineInfo): string {
  const dir = info.side === "high" ? "выше" : "ниже";
  const pct = info.deviationPercent < 0.1 ? "<0.1" : info.deviationPercent.toFixed(1);
  return `[ПОГРАНИЧНО: всего на ${pct}% ${dir} границы нормы ${info.boundary}]`;
}

/** Общий блок правил интерпретации пограничных значений для системного промпта. */
export const BORDERLINE_RULES_BLOCK = `
🔎 ПОГРАНИЧНЫЕ ЗНАЧЕНИЯ (пометка [ПОГРАНИЧНО: ...]) — ПРАВИЛА ИНТЕРПРЕТАЦИИ:
Такие маркеры формально вышли за границу нормы, но отклонение минимально (в пределах ${BORDERLINE_BAND_PERCENT}% от границы) и попадает в разброс между референсами разных лабораторий.
- ЗАПРЕЩЕНО использовать диагностические термины и названия синдромов (например «гипермагниемия», «гипокалиемия», «анемия», «дислипидемия», «печёночная недостаточность») для таких значений.
- ЗАПРЕЩЕНО писать «значительно повышен», «выраженное отклонение», «серьёзное нарушение», а также нагнетать тревогу.
- ПИШИ нейтрально: «на верхней границе референсного диапазона», «на нижней границе нормы», «лёгкое пограничное отклонение», «незначительно выше/ниже границы».
- Обязательно поясняй, что клинического значения такое отклонение обычно не имеет и требует лишь контроля в динамике при следующем обследовании.
- Не назначай агрессивных вмешательств и терапии только из-за пограничного значения: максимум — контроль в динамике и мягкая коррекция образа жизни/питания.
- При этом НЕ называй такое значение «в норме», «оптимальным» или «идеальным» — формально оно за границей нормы.
`.trim();
