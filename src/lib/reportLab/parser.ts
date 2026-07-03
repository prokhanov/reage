/**
 * Крошечный, автономный парсер контента отчёта.
 *
 * Отвечает за:
 *   1) Извлечение категорий из recommendations[].text (legacy markdown с якорями).
 *   2) Разделение legacy-текста на блоки `prose` и `biomarker` по маркерам:
 *        <!-- anchor:biomarker CODE -->
 *        <!-- anchor:biomarker_end -->
 *   3) Игнорирование всех остальных якорей (intro_start, summary_start и пр.) —
 *      они сохраняются как обычный текст, но HTML-комментарии вырезаются.
 *   4) Разрешение статуса биомаркера по 7-сегментной модели с учётом пола.
 *
 * Никаких зависимостей от legacy-парсеров (anchorParser.ts).
 */

import type {
  BiomarkerStatus,
  ParsedCategory,
  ProkhanovReport,
  ReportBiomarker,
  ReportBlock,
  ResolvedRange,
} from "./types";

const ANCHOR_RE = /<!--\s*anchor:([^\n>→]+?)\s*(?:-->|→)/g;
const HTML_COMMENT_RE = /<!--[\s\S]*?(?:-->|→|\n)/g;

export interface CategoryOrder {
  order: number;
}

const CATEGORY_ORDER: Record<string, number> = {
  "Энергия и восстановление": 1,
  "Сердечно-сосудистая система": 2,
  "Воспалительная и иммунная система": 3,
  "Эндокринная и стрессовая система": 4,
  "Метаболизм и Детоксикация": 5,
};

const NON_CATEGORY_TYPES = new Set([
  "Данные пациента",
  "Общее резюме",
  "Назначения",
]);

// ─── Публичные функции ────────────────────────────────────────────────────

export function getPatientDataRecord(report: ProkhanovReport) {
  return report.recommendations.find((r) => r.type === "Данные пациента");
}

export function getSummaryRecord(report: ProkhanovReport) {
  return report.recommendations.find((r) => r.type === "Общее резюме");
}

export function getPrescriptionsRecord(report: ProkhanovReport) {
  return report.recommendations.find((r) => r.type === "Назначения");
}

export function getCategoryRecords(report: ProkhanovReport) {
  return report.recommendations
    .filter((r) => !NON_CATEGORY_TYPES.has(r.type))
    .sort(
      (a, b) =>
        (CATEGORY_ORDER[a.type] ?? 99) - (CATEGORY_ORDER[b.type] ?? 99),
    );
}

/** Мапа code → биомаркер, для быстрого поиска при парсинге. */
export function buildBiomarkerIndex(
  report: ProkhanovReport,
): Map<string, ReportBiomarker> {
  const index = new Map<string, ReportBiomarker>();
  for (const b of report.biomarkers) {
    index.set(normalizeCode(b.code), b);
  }
  return index;
}

/**
 * Разбирает legacy-текст категории на блоки prose/biomarker.
 * Гарантирует, что маркеры-анкера удалены из вывода.
 */
export function parseCategory(
  title: string,
  rawText: string,
): ParsedCategory {
  const blocks: ReportBlock[] = [];
  if (!rawText || !rawText.trim()) return { title, blocks };

  // Первую строку с названием категории вырезаем — заголовок мы рисуем сами.
  let text = stripLeadingCategoryHeader(rawText, title);

  const matches = [...text.matchAll(ANCHOR_RE)];
  if (matches.length === 0) {
    const clean = cleanProse(text);
    if (clean) blocks.push({ kind: "prose", markdown: clean });
    return { title, blocks };
  }

  let cursor = 0;

  const pushProse = (from: number, to: number) => {
    const chunk = text.slice(from, to);
    const clean = cleanProse(chunk);
    if (clean) blocks.push({ kind: "prose", markdown: clean });
  };

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const tag = match[1].trim();
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start < cursor) continue;

    if (tag.startsWith("biomarker ")) {
      // Открывающий якорь биомаркера
      pushProse(cursor, start);
      const code = tag.slice("biomarker ".length).trim();

      // Ищем следующую границу: biomarker_end ИЛИ следующий biomarker
      let nextBoundary = text.length;
      for (let j = i + 1; j < matches.length; j++) {
        const m = matches[j];
        const t = m[1].trim();
        if (t === "biomarker_end" || t.startsWith("biomarker ")) {
          nextBoundary = m.index ?? text.length;
          // Если это end — потребляем его; если следующий biomarker — оставляем.
          if (t === "biomarker_end") {
            cursor = nextBoundary + m[0].length;
          } else {
            cursor = nextBoundary;
          }
          break;
        }
      }
      if (nextBoundary === text.length) {
        cursor = text.length;
      }

      const rawCommentary = text.slice(end, nextBoundary);
      const commentary = cleanProse(stripLeadingBiomarkerName(rawCommentary));
      blocks.push({ kind: "biomarker", code, commentary });
    } else {
      // Любой другой якорь (intro_start, summary_start, spacer, pagebreak и пр.)
      // — просто игнорируем как разделитель. Всё вокруг попадает в prose.
      if (tag === "pagebreak") {
        pushProse(cursor, start);
        blocks.push({ kind: "prose", markdown: "\n\n" });
        cursor = end;
      } else {
        pushProse(cursor, start);
        cursor = end;
      }
    }
  }

  if (cursor < text.length) pushProse(cursor, text.length);

  return { title, blocks };
}

/** Определяет 7-сегментный статус биомаркера. */
export function resolveStatus(
  biomarker: ReportBiomarker,
  gender: "male" | "female" | "other" | null,
  age: number | null = null,
): BiomarkerStatus {
  const range = resolveRange(biomarker, gender, age);
  const v = biomarker.value;

  if (range.criticalMin !== null && v < range.criticalMin) return "critical-low";
  if (range.warningMin !== null && v < range.warningMin) return "warning-low";
  if (range.optimalMin !== null && v < range.optimalMin)
    return "sub-optimal-low";
  if (range.optimalMax !== null && v > range.optimalMax) {
    if (range.warningMax !== null && v > range.warningMax) {
      if (range.criticalMax !== null && v > range.criticalMax)
        return "critical-high";
      return "warning-high";
    }
    return "sub-optimal-high";
  }
  return "optimal";
}

interface AgeRangeRow {
  age_from?: number | null;
  age_to?: number | null;
  min?: number | null;
  max?: number | null;
  optimal_min?: number | null;
  optimal_max?: number | null;
  critical_min?: number | null;
  critical_max?: number | null;
}

function pickAgeRow(
  rows: AgeRangeRow[] | null | undefined,
  age: number | null,
): AgeRangeRow | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const a = age ?? 30;
  for (const r of rows) {
    const from = r.age_from ?? 0;
    const to = r.age_to ?? 200;
    if (a >= from && a <= to) return r;
  }
  // fallback: ближайший по возрасту
  return rows[0];
}

export function resolveRange(
  b: ReportBiomarker,
  gender: "male" | "female" | "other" | null,
  age: number | null = null,
): ResolvedRange {
  const pick = (
    common: number | null,
    male: number | null,
    female: number | null,
  ): number | null => {
    if (gender === "male" && male !== null) return male;
    if (gender === "female" && female !== null) return female;
    return common;
  };

  // Стартовые значения из плоских колонок (fallback).
  let warningMin = pick(b.normal_min, b.normal_min_male, b.normal_min_female);
  let warningMax = pick(b.normal_max, b.normal_max_male, b.normal_max_female);
  let optimalMin = pick(b.optimal_min, b.optimal_min_male, b.optimal_min_female);
  let optimalMax = pick(b.optimal_max, b.optimal_max_male, b.optimal_max_female);
  let criticalMin = pick(b.critical_min, b.critical_min_male, b.critical_min_female);
  let criticalMax = pick(b.critical_max, b.critical_max_male, b.critical_max_female);

  // Если биомаркер использует возрастную шкалу — приоритет её данных.
  const ageRanges = (b as unknown as {
    age_ranges?: { male?: AgeRangeRow[]; female?: AgeRangeRow[] } | null;
  }).age_ranges;
  const rangeMode = (b as unknown as { range_mode?: string | null }).range_mode;
  if (rangeMode === "age" && ageRanges) {
    const genderRows =
      gender === "female" ? ageRanges.female : ageRanges.male;
    const row = pickAgeRow(genderRows ?? null, age);
    if (row) {
      if (row.min != null) warningMin = row.min;
      if (row.max != null) warningMax = row.max;
      if (row.optimal_min != null) optimalMin = row.optimal_min;
      if (row.optimal_max != null) optimalMax = row.optimal_max;
      if (row.critical_min != null) criticalMin = row.critical_min;
      if (row.critical_max != null) criticalMax = row.critical_max;
    }
  }

  // Гарантируем, что зелёный «оптимум» всегда есть, если задан warning-диапазон:
  // если optimal_min/max не заполнены — считаем, что оптимум совпадает с warning.
  if (optimalMin === null && warningMin !== null) optimalMin = warningMin;
  if (optimalMax === null && warningMax !== null) optimalMax = warningMax;

  return {
    criticalMin,
    warningMin,
    optimalMin,
    optimalMax,
    warningMax,
    criticalMax,
  };
}


// ─── Утилиты ───────────────────────────────────────────────────────────────

function stripLeadingCategoryHeader(text: string, title: string): string {
  const trimmed = text.replace(/^\uFEFF?/, "").trimStart();
  // Формы, которые встречаются: "Название", "# Название", "## Название"
  const patterns = [
    new RegExp(`^#{0,3}\\s*${escapeRegex(title)}\\s*\\n+`, "i"),
  ];
  for (const p of patterns) {
    if (p.test(trimmed)) return trimmed.replace(p, "");
  }
  return trimmed;
}

/**
 * Внутри биомаркерного блока legacy-текст часто начинается с русского имени
 * биомаркера (иногда с латинским кодом в скобках). Заголовок карточки рисует
 * сам компонент — эту строку нужно вырезать, чтобы не было дубля.
 */
function stripLeadingBiomarkerName(text: string): string {
  const trimmed = text.replace(/^\s+/, "");
  // Схема: до первой пустой строки — считаем «заголовочной» частью, если она
  // короче 120 символов и не начинается с "-" или "1." (это уже проза/списки).
  const nlIdx = trimmed.indexOf("\n\n");
  const head = nlIdx === -1 ? trimmed : trimmed.slice(0, nlIdx);
  if (
    head.length < 120 &&
    !/^[-*•]/.test(head) &&
    !/^\d+\./.test(head) &&
    !/^#{1,6}\s/.test(head) &&
    /[А-Яа-яЁёA-Za-z]/.test(head) &&
    !head.includes(":")
  ) {
    return nlIdx === -1 ? "" : trimmed.slice(nlIdx + 2);
  }
  return trimmed;
}

function cleanProse(chunk: string): string {
  return chunk
    .replace(HTML_COMMENT_RE, "")
    .replace(/\$\$/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegex(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeCode(code: string): string {
  if (!code) return "";
  return code
    .toLowerCase()
    .trim()
    .replace(/α/g, "a")
    .replace(/β/g, "b")
    .replace(/γ/g, "g")
    .replace(/δ/g, "d")
    .replace(/μ/g, "u")
    .replace(/\balpha\b/g, "a")
    .replace(/\bbeta\b/g, "b")
    .replace(/\bgamma\b/g, "g")
    .replace(/[\s\-_+()]/g, "");
}

/** Возраст в годах на дату исследования. */
export function calcAge(birthDate: string | null, onDate: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const d = new Date(onDate);
  if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return null;
  let age = d.getFullYear() - b.getFullYear();
  const m = d.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--;
  return age;
}

export function formatRuDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
