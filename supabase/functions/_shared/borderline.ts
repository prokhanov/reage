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
 * Биомаркеры, для которых пограничная зона НЕ применяется:
 * даже минимальное превышение клинически значимо и смягчать его нельзя.
 */
export const BORDERLINE_EXCLUDED_CODES = new Set(
  [
    // Углеводный обмен — диагностические пороги жёсткие (преддиабет/диабет)
    "GLU", "GLU-FAST", "HBA1C", "HBA1C-IFCC",
    // Электролиты — узкий терапевтический коридор, аритмогенность
    "K", "NA", "CA-ION", "CAI",
    // Почки
    "CREA", "EGFR", "GFR", "CYSC", "MAU", "ACR", "PRO-U",
    // Кардио / тромбозы
    "TROP", "TROPI", "TROPT", "NT-PROBNP", "BNP", "DDIMER", "D-DIMER",
    "INR", "MNO", "APTT", "PLT",
    // Онкомаркеры и генетически детерминированные факторы риска
    "PSA", "PSA-FREE", "CA-125", "CA125", "CEA", "AFP", "LP(A)", "LPA",
    // Патологические находки в моче: любое присутствие значимо
    "BIL-U", "HB-U", "NIT-U", "GLU-U", "KET-U",
    "CYL-PATH-U", "ERY-RXN-U", "LEU-EST-U", "EPI-REN-U",
  ].map((c) => c.toUpperCase()),
);

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

  const codeUpper = String(code ?? "").trim().toUpperCase();
  if (codeUpper && BORDERLINE_EXCLUDED_CODES.has(codeUpper)) return null;

  // Критические значения никогда не смягчаем
  if (criticalMin != null && value < criticalMin) return null;
  if (criticalMax != null && value > criticalMax) return null;

  if (normalMax != null && value > normalMax) {
    if (normalMax === 0) return null; // «должно быть 0» — любое превышение значимо
    const deviationPercent = ((value - normalMax) / Math.abs(normalMax)) * 100;
    if (deviationPercent <= bandPercent) {
      return { side: "high", deviationPercent, boundary: normalMax };
    }
    return null;
  }

  if (normalMin != null && value < normalMin) {
    if (normalMin === 0) return null;
    const deviationPercent = ((normalMin - value) / Math.abs(normalMin)) * 100;
    if (deviationPercent <= bandPercent) {
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
