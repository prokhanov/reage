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
  LabReport,
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

export function getPatientDataRecord(report: LabReport) {
  return report.recommendations.find((r) => r.type === "Данные пациента");
}

export function getSummaryRecord(report: LabReport) {
  return report.recommendations.find((r) => r.type === "Общее резюме");
}

export function getPrescriptionsRecord(report: LabReport) {
  return report.recommendations.find((r) => r.type === "Назначения");
}

export function getCategoryRecords(report: LabReport) {
  return report.recommendations
    .filter((r) => !NON_CATEGORY_TYPES.has(r.type))
    .sort(
      (a, b) =>
        (CATEGORY_ORDER[a.type] ?? 99) - (CATEGORY_ORDER[b.type] ?? 99),
    );
}

/** Мапа code → биомаркер, для быстрого поиска при парсинге. */
export function buildBiomarkerIndex(
  report: LabReport,
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
  biomarkerIndex?: Map<string, ReportBiomarker>,
): ParsedCategory {
  const blocks: ReportBlock[] = [];
  if (!rawText || !rawText.trim()) return { title, blocks };

  // Первую строку с названием категории вырезаем — заголовок мы рисуем сами.
  let text = stripLeadingCategoryHeader(rawText, title);

  // Страховка: если модель вернула биомаркеры без HTML anchor-комментариев
  // (просто `Название (CODE)` отдельной строкой), всё равно превращаем такие
  // блоки в карточки со шкалой. Инжектируем только для кодов, реально
  // присутствующих в снапшоте.
  text = injectHeadingBiomarkerAnchors(text, biomarkerIndex);

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

/**
 * Схлопывает 7-сегментный статус до 4 бакетов, которые используются в
 * основном приложении: `optimal` | `acceptable` | `risk` | `critical`.
 * Единый источник правды для цветовой палитры и подписей.
 */
export type BiomarkerBucket = "optimal" | "acceptable" | "risk" | "critical";

export function resolveStatusBucket(
  biomarker: ReportBiomarker,
  gender: "male" | "female" | "other" | null,
  age: number | null = null,
): BiomarkerBucket {
  const s = resolveStatus(biomarker, gender, age);
  if (s === "critical-low" || s === "critical-high") return "critical";
  if (s === "warning-low" || s === "warning-high") return "risk";
  if (s === "sub-optimal-low" || s === "sub-optimal-high") return "acceptable";
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

/**
 * Ищет строки вида `Название (CODE)` (опционально с ведущими `#`) и оборачивает
 * блок между таким «заголовком» и следующим либо служебной секцией
 * («Общая оценка…», «Сильные стороны», «Дефициты…», «Заключение», «Резюме»)
 * в HTML-anchor маркеры, чтобы парсер отрисовал карточку биомаркера со шкалой.
 *
 * Инжектируется ТОЛЬКО если код найден в переданном индексе биомаркеров —
 * чтобы не превращать случайные скобки в тексте в «карточки».
 */
function injectHeadingBiomarkerAnchors(
  text: string,
  biomarkerIndex?: Map<string, ReportBiomarker>,
): string {
  if (!text) return text;
  if (!biomarkerIndex || biomarkerIndex.size === 0) return text;

  // Пер-код дедуп: собираем коды, у которых УЖЕ есть <!-- anchor:biomarker … -->.
  // Раньше здесь был глобальный early-exit — он отключал автопоиск для всех
  // биомаркеров, если хотя бы один якорь стоял вручную. Из-за этого,
  // например, Липопротеин(а) не превращался в карточку, если в разделе уже
  // был анкер другого маркера.
  const anchoredCodes = new Set<string>();
  const anyAnchorRegex = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
  for (const m of text.matchAll(anyAnchorRegex)) {
    const norm = normalizeCode(m[1]);
    if (norm) anchoredCodes.add(norm);
  }

  // Индекс по нормализованному имени (для строк без явного `(CODE)`).
  const nameIndex = new Map<string, string>();
  for (const bio of biomarkerIndex.values()) {
    const key = normalizeName(bio.name);
    if (key && !nameIndex.has(key)) nameIndex.set(key, bio.code);
    // Дополнительно — имя со снятыми хвостовыми скобками, «Витамин D (25-OH)» → «витамин d».
    const stripped = normalizeName(bio.name.replace(/\s*\([^()]{1,20}\)\s*$/u, ""));
    if (stripped && !nameIndex.has(stripped)) nameIndex.set(stripped, bio.code);
  }

  interface Hit { start: number; end: number; code: string; nameLen: number }
  const hits: Hit[] = [];

  // ── Pass 1: короткая строка-заголовок «Имя» или «Имя (КОД)».
  const headingRegex =
    /^[ \t]*(?:#{1,6}[ \t]+)?([^\n]{1,140}?)[ \t]*$/gm;
  const codeInParensRegex = /\(([A-Za-zА-Яа-яЁё0-9αβγδμ+_.\-/() ]{1,40})\)[ \t]*$/;
  for (const m of text.matchAll(headingRegex)) {
    const line = (m[1] || "").trim();
    if (!line || line.length < 2) continue;
    if (/^[-*•>]/.test(line)) continue;
    if (/^\d+[.)]\s/.test(line)) continue;
    if (line.endsWith(":") || line.endsWith("：")) continue;
    if (/[.!?…]$/.test(line)) continue;
    if (/\s—\s|\s–\s/.test(line)) continue;

    let code: string | null = null;
    const cm = codeInParensRegex.exec(line);
    if (cm) {
      const normalized = normalizeCode(cm[1]);
      if (normalized && biomarkerIndex.has(normalized)) code = cm[1].trim();
    }
    if (!code) {
      const byName = nameIndex.get(normalizeName(line));
      if (byName) code = byName;
    }
    if (!code) {
      const stripped = line.replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (stripped && stripped !== line) {
        const byName2 = nameIndex.get(normalizeName(stripped));
        if (byName2) code = byName2;
      }
    }
    if (!code) continue;
    if (anchoredCodes.has(normalizeCode(code))) continue;

    hits.push({
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      code,
      nameLen: line.length,
    });
  }

  // ── Pass 2: code-first параграф «<любое имя ≤80> (CODE) описание…».
  // Ловит случаи, когда имя в БД содержит скобки (Липопротеин(а)) или AI
  // пишет имя иначе, но код в скобках корректный.
  const paragraphRegex =
    /^(?!\s*#{1,6}\s)(?!\s*[-*•>])(?!\s*\d+[.)]\s)[ \t]*[^\n]{4,400}$/gm;
  const parenTokenRegex =
    /\(([^()\n]{1,40})\)|\(([^()\n]{0,20}\([^()\n]{0,15}\)[^()\n]{0,20})\)/g;
  for (const lm of text.matchAll(paragraphRegex)) {
    const lineStart = lm.index ?? 0;
    const line = lm[0];
    // Не трогаем строки-заголовки, уже пойманные Pass 1: они целиком совпадают.
    if (hits.some((h) => h.start === lineStart && h.end === lineStart + line.length)) continue;
    parenTokenRegex.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = parenTokenRegex.exec(line)) !== null) {
      if (pm.index > 80) break; // скобка должна быть в «шапке» строки
      const inner = (pm[1] ?? pm[2] ?? "").trim();
      if (!inner) continue;
      const norm = normalizeCode(inner);
      if (!norm) continue;
      const bio = biomarkerIndex.get(norm);
      if (!bio) continue;
      if (anchoredCodes.has(norm)) break;
      hits.push({
        start: lineStart,
        end: lineStart + line.length,
        code: bio.code,
        nameLen: pm.index, // приоритет более «длинному» имени перед скобкой
      });
      break;
    }
  }

  // ── Сортировка/дедуп по коду и позиции.
  const boundaryRegex =
    /^[ \t]*(?:#{1,6}[ \t]+)?(?:Общая\s+оценка(?:\s+системы)?|Сильные\s+стороны|Дефициты\s+и\s+дисфункции|Заключение|Резюме|Итоги?|Выводы?)[^\n]*$/gim;
  hits.sort((a, b) => a.start - b.start || b.nameLen - a.nameLen);
  const biomarkerHeadingEnd = findBiomarkerInterpretationHeadingEnd(text);
  const boundarySearchFrom = biomarkerHeadingEnd >= 0
    ? biomarkerHeadingEnd
    : (hits[0]?.start ?? 0);
  const summaryStart = findNextSectionBoundary(text, boundaryRegex, boundarySearchFrom);
  const seenCodes = new Set<string>(anchoredCodes);
  const filtered: Hit[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start >= summaryStart) continue;
    if (h.start < lastEnd) continue;
    const norm = normalizeCode(h.code);
    if (seenCodes.has(norm)) continue;
    filtered.push(h);
    seenCodes.add(norm);
    lastEnd = h.end;
  }
  if (filtered.length === 0) {
    const narrativeHits = findNarrativeBiomarkerHits(
      text,
      biomarkerIndex,
      seenCodes,
      summaryStart,
    );
    if (narrativeHits.length === 0) return text;
    filtered.push(...narrativeHits);
  }

  const findNextBoundary = (from: number): number => {
    const headerRegex = /^#{1,2}[ \t]+/gm;
    headerRegex.lastIndex = from;
    const hm = headerRegex.exec(text);
    const headerPos = hm ? hm.index ?? text.length : text.length;
    return Math.min(headerPos, summaryStart);
  };

  let result = text;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const cur = filtered[i];
    const next = filtered[i + 1];
    const nextBoundary = next ? next.start : findNextBoundary(cur.end);
    const blockEnd = Math.max(cur.end, nextBoundary);
    result =
      result.slice(0, blockEnd) +
      `\n<!-- anchor:biomarker_end -->\n` +
      result.slice(blockEnd);
    result =
      result.slice(0, cur.start) +
      `<!-- anchor:biomarker ${cur.code} -->\n` +
      result.slice(cur.start);
  }
  return result;
}

/**
 * Recovery-path для уже сохранённых отчётов, где HTML-якоря биомаркеров были
 * потеряны, но остался текстовый блок «Интерпретация биомаркеров» с разделением
 * через zero-width spacer (`\u200B`). В таком виде карточки не появляются, потому
 * что у парсера нет явной границы `<!-- anchor:biomarker CODE -->`.
 *
 * Мы аккуратно распознаём начало каждого биомаркерного абзаца по упоминанию
 * названия/кода в тексте и дальше используем обычный механизм оборачивания:
 * блок длится до следующего распознанного биомаркера. Это возвращает карточки
 * без изменения данных в БД и без влияния на отчёты, где якоря уже есть.
 */
function findNarrativeBiomarkerHits(
  text: string,
  biomarkerIndex: Map<string, ReportBiomarker>,
  seenCodes: Set<string>,
  summaryStart: number,
): Array<{ start: number; end: number; code: string; nameLen: number }> {
  if (!/[\u200B\u200C\u200D\uFEFF]/.test(text)) return [];

  const headingEnd = findBiomarkerInterpretationHeadingEnd(text, summaryStart);
  if (headingEnd < 0) return [];

  const parts = splitByZeroWidthSpacers(text, headingEnd, summaryStart);
  if (parts.length < 2) return [];

  const candidates = Array.from(biomarkerIndex.values()).filter(
    (bio) => !seenCodes.has(normalizeCode(bio.code)),
  );
  const used = new Set<string>(seenCodes);
  const hits: Array<{ start: number; end: number; code: string; nameLen: number }> = [];

  for (const part of parts) {
    const clean = part.text.trim();
    if (clean.length < 90) continue;
    if (/^(?:Ваши\s+анализы|Общая\s+оценка|Сильные\s+стороны|Дефициты|Заключение|Резюме)/i.test(clean)) {
      continue;
    }

    let best: { bio: ReportBiomarker; score: number; firstPos: number } | null = null;
    for (const bio of candidates) {
      const normCode = normalizeCode(bio.code);
      if (!normCode || used.has(normCode)) continue;
      const scored = scoreBiomarkerChunk(clean, bio);
      if (scored.score < 3) continue;
      if (
        !best ||
        scored.score > best.score ||
        (scored.score === best.score && scored.firstPos < best.firstPos)
      ) {
        best = { bio, score: scored.score, firstPos: scored.firstPos };
      }
    }

    if (!best) continue;
    const norm = normalizeCode(best.bio.code);
    used.add(norm);
    hits.push({
      start: part.start,
      end: part.start,
      code: best.bio.code,
      nameLen: best.bio.name.length,
    });
  }

  return hits;
}

function findBiomarkerInterpretationHeadingEnd(text: string, before = text.length): number {
  const headingRe = /^[ \t]*(?:#{1,6}[ \t]+)?Интерпретация\s+биомаркеров[^\n]*$/gim;
  let headingEnd = -1;
  for (const m of text.matchAll(headingRe)) {
    const end = (m.index ?? 0) + m[0].length;
    if (end < before) headingEnd = end;
  }
  return headingEnd;
}

function findNextSectionBoundary(text: string, boundaryRegex: RegExp, from: number): number {
  boundaryRegex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = boundaryRegex.exec(text)) !== null) {
    const idx = m.index ?? 0;
    if (idx >= from) return idx;
  }
  return text.length;
}

function splitByZeroWidthSpacers(
  text: string,
  start: number,
  end: number,
): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  const spacerRe = /[\u200B\u200C\u200D\uFEFF]+/g;
  spacerRe.lastIndex = start;
  let cursor = start;
  let m: RegExpExecArray | null;
  const push = (from: number, to: number) => {
    const raw = text.slice(from, to);
    const leading = raw.match(/^\s*/)?.[0].length ?? 0;
    const trailing = raw.match(/\s*$/)?.[0].length ?? 0;
    const partStart = from + leading;
    const partEnd = Math.max(partStart, to - trailing);
    const value = text.slice(partStart, partEnd);
    if (value.trim()) out.push({ start: partStart, end: partEnd, text: value });
  };
  while ((m = spacerRe.exec(text)) !== null && (m.index ?? 0) < end) {
    push(cursor, m.index ?? cursor);
    cursor = (m.index ?? cursor) + m[0].length;
  }
  push(cursor, end);
  return out;
}

function scoreBiomarkerChunk(
  chunk: string,
  bio: ReportBiomarker,
): { score: number; firstPos: number } {
  const hay = normalizeSearchText(chunk.slice(0, 1400));
  const fullHay = normalizeSearchText(chunk);
  let score = 0;
  let firstPos = Number.MAX_SAFE_INTEGER;

  const code = bio.code.trim();
  if (code.length >= 2) {
    const codeRe = new RegExp(`(^|[^A-Za-zА-Яа-яЁё0-9])${escapeRegex(code)}([^A-Za-zА-Яа-яЁё0-9]|$)`, "i");
    const m = codeRe.exec(chunk.slice(0, 1000));
    if (m) {
      score += 6;
      firstPos = Math.min(firstPos, m.index);
    }
  }

  const name = normalizeSearchText(bio.name.replace(/\s*\([^)]*\)\s*$/u, ""));
  const exactNamePos = name.length >= 4 ? hay.indexOf(name) : -1;
  if (exactNamePos >= 0) {
    score += 6;
    firstPos = Math.min(firstPos, exactNamePos);
  }

  const stems = meaningfulNameStems(bio.name);
  let stemHits = 0;
  for (const stem of stems) {
    const pos = hay.indexOf(stem);
    if (pos >= 0) {
      stemHits += 1;
      firstPos = Math.min(firstPos, pos);
    }
  }
  if (stemHits > 0) score += Math.min(6, stemHits * 2);

  const descNeedle = normalizeSearchText((bio.general_description ?? "").slice(0, 90));
  if (descNeedle.length >= 50) {
    const pos = fullHay.indexOf(descNeedle);
    if (pos >= 0) {
      score += 4;
      firstPos = Math.min(firstPos, pos);
    }
  }

  if (firstPos !== Number.MAX_SAFE_INTEGER && firstPos < 260) score += 1;
  return { score, firstPos };
}

const NAME_STOP_WORDS = new Set([
  "общий",
  "общая",
  "свободный",
  "свободная",
  "абс",
  "индекс",
  "коэффициент",
  "расчетный",
  "расчётный",
]);

function meaningfulNameStems(name: string): string[] {
  const tokens = normalizeSearchText(name)
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !NAME_STOP_WORDS.has(t));
  const stems = tokens.map((t) => {
    if (t.length <= 5) return t;
    return t.slice(0, Math.min(7, Math.max(5, t.length - 2)));
  });
  return Array.from(new Set(stems));
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}



function cleanProse(chunk: string): string {
  return chunk
    .replace(HTML_COMMENT_RE, "")
    // Служебный fallback-заголовок из edge-функции analyze-biomarkers
    // (вставляется программно перед «добором» биомаркеров без якорей).
    .replace(/^[ \t]*#{1,6}[ \t]*Ключевые показатели системы[ \t]*$\n?/gim, "")
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
