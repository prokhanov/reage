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
  text = injectHeadingBiomarkerAnchors(text, biomarkerIndex, title);

  const matches = [...text.matchAll(ANCHOR_RE)];
  if (matches.length === 0) {
    const clean = cleanProse(text);
    if (clean) blocks.push({ kind: "prose", markdown: clean });
    return { title, blocks };
  }

  let cursor = 0;
  const pendingIntroByCode = new Map<string, string>();

  const pushProse = (from: number, to: number) => {
    const chunk = text.slice(from, to);
    const clean = cleanProse(chunk);
    if (clean) blocks.push({ kind: "prose", markdown: clean });
  };

  const takePendingIntro = (code: string): string => {
    const norm = normalizeCode(code);
    const intro = pendingIntroByCode.get(norm) || "";
    pendingIntroByCode.delete(norm);
    return intro;
  };

  const appendPendingIntro = (code: string, intro: string) => {
    const clean = cleanProse(intro);
    if (!clean) return;
    const norm = normalizeCode(code);
    const previous = pendingIntroByCode.get(norm);
    pendingIntroByCode.set(norm, previous ? `${previous}\n\n${clean}` : clean);
  };

  const findNextBiomarkerCode = (fromMatchIndex: number): string | null => {
    for (let j = fromMatchIndex + 1; j < matches.length; j++) {
      const t = matches[j][1].trim();
      if (t.startsWith("biomarker ")) {
        return t.slice("biomarker ".length).trim();
      }
    }
    return null;
  };

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const tag = match[1].trim();
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start < cursor) continue;

    if (tag.startsWith("biomarker ")) {
      // Открывающий якорь биомаркера
      const code = tag.slice("biomarker ".length).trim();
      const before = splitTrailingBiomarkerIntro(
        text.slice(cursor, start),
        code,
        biomarkerIndex,
      );
      const cleanBefore = cleanProse(before.prose);
      if (cleanBefore) blocks.push({ kind: "prose", markdown: cleanBefore });

      // Ищем следующую границу: biomarker_end ИЛИ следующий biomarker
      let nextBoundary = text.length;
      let boundaryMatchIndex = i;
      for (let j = i + 1; j < matches.length; j++) {
        const m = matches[j];
        const t = m[1].trim();
        if (t === "biomarker_end" || t.startsWith("biomarker ")) {
          nextBoundary = m.index ?? text.length;
          boundaryMatchIndex = j;
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

      let currentRawCommentary = text.slice(end, nextBoundary);
      const nextCode = findNextBiomarkerCode(boundaryMatchIndex);
      if (nextCode) {
        const split = splitTailForNextBiomarker(
          currentRawCommentary,
          nextCode,
          biomarkerIndex,
        );
        currentRawCommentary = split.current;
        if (split.nextIntro) appendPendingIntro(nextCode, split.nextIntro);
      }

      const introParts = [takePendingIntro(code), before.intro].filter(Boolean);
      const rawCommentary = introParts.length
        ? `${introParts.join("\n\n")}\n\n${currentRawCommentary}`
        : currentRawCommentary;
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
    !/[.!?…]$/.test(head.trim()) &&
    head.trim().split(/\s+/).length <= 8 &&
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
 * После автодобора карточек в старых отчётах якорь иногда стоит не перед
 * образовательным абзацем, а прямо перед фразой «Ваш показатель …». Тогда
 * вводный текст визуально оказывается НАД карточкой и выглядит как текст
 * предыдущего биомаркера. Если хвост перед якорем начинается с имени/кода
 * текущего маркера — переносим этот хвост внутрь commentary текущей карточки.
 */
function splitTrailingBiomarkerIntro(
  chunk: string,
  code: string,
  biomarkerIndex?: Map<string, ReportBiomarker>,
): { prose: string; intro: string } {
  if (!chunk.trim() || !biomarkerIndex) return { prose: chunk, intro: "" };

  const bio = biomarkerIndex.get(normalizeCode(code));
  if (!bio) return { prose: chunk, intro: "" };

  const marker = findBiomarkerLeadStart(chunk, bio);
  if (marker === -1) return { prose: chunk, intro: "" };

  return {
    prose: chunk.slice(0, marker),
    intro: cleanProse(chunk.slice(marker)),
  };
}

function splitTailForNextBiomarker(
  chunk: string,
  nextCode: string,
  biomarkerIndex?: Map<string, ReportBiomarker>,
): { current: string; nextIntro: string } {
  if (!chunk.trim() || !biomarkerIndex) return { current: chunk, nextIntro: "" };

  const nextBio = biomarkerIndex.get(normalizeCode(nextCode));
  if (!nextBio) return { current: chunk, nextIntro: "" };

  const marker = findBiomarkerLeadStart(chunk, nextBio);
  if (marker === -1) return { current: chunk, nextIntro: "" };

  // ВАЖНО: этот автоперенос — только ремонт старых сдвинутых якорей, где
  // после анализа текущего маркера случайно прилипло intro следующего.
  // Если пользователь вручную вставил текст в пустую карточку, а имя следующего
  // маркера является расширением текущего (например MONO → MONO-ABS,
  // «Моноциты» → «Моноциты (абс.)»), широкий stripped-name матч иначе снова
  // перетаскивает правку в следующую карточку при каждом сохранении.
  const beforeMarker = chunk.slice(0, marker);
  if (!hasPatientValueContext(beforeMarker)) {
    return { current: chunk, nextIntro: "" };
  }

  return {
    current: chunk.slice(0, marker),
    nextIntro: cleanProse(chunk.slice(marker)),
  };
}

function hasPatientValueContext(text: string): boolean {
  return /Ваш(?:и|е|его)?\s+(?:текущ(?:ий|ее|ая)\s+)?(?:показател[ьия]|уровень|значение|индекс|результат)\s+[-]?\d+(?:[.,]\d+)?/iu.test(
    text,
  );
}

function findBiomarkerLeadStart(chunk: string, bio: ReportBiomarker): number {
  const starts: string[] = [];
  const fullName = bio.name.trim();
  const strippedName = fullName.replace(/\s*\([^()]{1,30}\)\s*$/u, "").trim();
  const code = bio.code.trim();
  for (const value of [fullName, strippedName, code]) {
    if (value && !starts.some((s) => normalizeName(s) === normalizeName(value))) {
      starts.push(value);
    }
  }

  for (const lead of starts) {
    const re = new RegExp(
      `(?:^|\\n\\s*\\n|\\n)[ \\t]*(?:#{1,6}[ \\t]+|\\*\\*)?${escapeRegex(lead)}(?:\\*\\*)?(?=[\\s(—–-]|$)`,
      "giu",
    );
    let bestIndex = -1;
    for (const m of chunk.matchAll(re)) {
      const rawIndex = m.index + (m[0].match(/^[\s\S]*?(?=\S)/)?.[0].length ?? 0);
      // Не забираем большой общий intro: маркер должен быть в хвосте перед
      // якорем, а не в середине длинного раздела.
      if (chunk.length - rawIndex <= 1_200) bestIndex = rawIndex;
    }
    if (bestIndex !== -1) return bestIndex;
  }

  return -1;
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
  sectionCategory?: string,
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

  // ── Pass 3: value-driven detection for reports without biomarker headings.
  // Некоторые версии AI-отчёта пропускают заголовки биомаркеров и оставляют
  // только прозу с фразой «Ваш показатель <value> <unit>». Матчим по точному
  // значению против снапшота, чтобы всё равно нарисовать карточки.
  const valuePhraseRegex =
    /Ваш(?:и|е|его)?\s+(?:текущ(?:ий|ее|ая)\s+)?(?:показател[ьия]|уровень|значение|индекс|результат)\s+([-]?\d+(?:[.,]\d+)?)/giu;
  const valueMatches = [...text.matchAll(valuePhraseRegex)];
  if (valueMatches.length > 0) {
    const byValue = new Map<string, string[]>();
    const normalizedSection = sectionCategory
      ? normalizeName(sectionCategory)
      : "";
    for (const bio of biomarkerIndex.values()) {
      if (typeof bio.value !== "number") continue;
      // Pass-3 неоднозначен: разные биомаркеры могут иметь одинаковое значение
      // (напр. K и GLU оба 3.9). Чтобы такие «дубликаты» не ушли в чужую
      // систему, ограничиваем поиск биомаркерами текущей категории.
      if (
        normalizedSection &&
        bio.category &&
        normalizeName(bio.category) !== normalizedSection
      ) {
        continue;
      }
      const key = String(bio.value).replace(/,/g, ".");
      const arr = byValue.get(key) || [];
      arr.push(bio.code);
      byValue.set(key, arr);
    }
    const usedCodes = new Set<string>(anchoredCodes);
    for (const h of hits) usedCodes.add(normalizeCode(h.code));

    // Собираем «границы» — концы уже найденных блоков и позиции всех значений
    // Ваш показатель X. Начало блока Pass-3 маркера = сразу после ближайшей
    // предыдущей границы. Это гарантирует, что весь вводный текст ПЕРЕД фразой
    // «Ваш показатель …» попадёт в этот же маркер, а не в предыдущий.
    const priorEnds: number[] = hits.map((h) => h.end);
    const valuePositions = valueMatches
      .map((m) => m.index ?? -1)
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);

    for (const vm of valueMatches) {
      const rawVal = (vm[1] || "").replace(/,/g, ".");
      const codes = byValue.get(rawVal);
      if (!codes || codes.length === 0) continue;
      const code = codes.find((c) => !usedCodes.has(normalizeCode(c)));
      if (!code) continue;
      const pos = vm.index ?? 0;
      if (hits.some((hh) => pos >= hh.start && pos <= hh.end)) continue;

      // Ближайшая предыдущая граница (конец прошлого якорного блока
      // ИЛИ конец предыдущей фразы «Ваш показатель …»).
      let boundary = 0;
      for (const e of priorEnds) if (e <= pos && e > boundary) boundary = e;
      for (const vp of valuePositions) {
        if (vp >= pos) break;
        // конец предыдущего значения — сама позиция фразы; сдвинемся вперёд
        // до ближайшего конца строки, чтобы не отрезать её саму.
        const nl = text.indexOf("\n", vp);
        const endOfPrev = nl === -1 ? vp : nl;
        if (endOfPrev < pos && endOfPrev > boundary) boundary = endOfPrev;
      }

      // Пропускаем пустые строки/пробелы после границы, чтобы якорь встал
      // прямо перед первым непустым абзацем нового биомаркера.
      let blockStart = boundary;
      while (
        blockStart < pos &&
        /[\s\u200B\u200C\u200D\uFEFF]/.test(text[blockStart])
      ) {
        blockStart++;
      }
      if (blockStart >= pos) {
        // fallback — старое поведение, ближайший \n\n перед pos
        const prev = text.lastIndexOf("\n\n", pos);
        blockStart = prev === -1 ? boundary : prev + 2;
      }

      // Ограничение: карточка Pass-3 не должна поглощать более 2 абзацев
      // образовательного текста перед «Ваш показатель …». Иначе, когда
      // предыдущей границы нет (первый биомаркер категории), в карточку
      // затягивается всё вступление категории и оно исчезает из отчёта.
      {
        const MAX_LEAD_PARAGRAPHS = 2;
        let capped = pos;
        for (let p = 0; p < MAX_LEAD_PARAGRAPHS; p++) {
          const prev = text.lastIndexOf("\n\n", capped - 1);
          if (prev === -1 || prev < blockStart) break;
          capped = prev + 2;
        }
        if (capped > blockStart) blockStart = capped;
      }

      hits.push({
        start: blockStart,
        end: pos + vm[0].length,
        code,
        nameLen: 0,
      });
      usedCodes.add(normalizeCode(code));
      priorEnds.push(pos + vm[0].length);
    }
  }

  if (hits.length === 0) return text;

  // ── Сортировка/дедуп по коду и позиции.
  const boundaryRegex =
    /^[ \t]*(?:#{1,6}[ \t]+)?(?:Общая\s+оценка(?:\s+системы)?|Сильные\s+стороны|Дефициты\s+и\s+дисфункции|Заключение|Резюме|Итоги?|Выводы?)[^\n]*$/gim;
  boundaryRegex.lastIndex = 0;
  const bm = boundaryRegex.exec(text);
  const summaryStart = bm ? bm.index ?? text.length : text.length;

  hits.sort((a, b) => a.start - b.start || b.nameLen - a.nameLen);
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
  if (filtered.length === 0) return text;

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
