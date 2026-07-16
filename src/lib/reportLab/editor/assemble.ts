import type { LabReport, ReportRecommendationRow } from "../types";
import { buildBiomarkerIndex, parseCategory } from "../parser";

/**
 * Собирает текст рекомендации обратно из draft-блоков.
 * Формат `editableId`:
 *   - "rec:<id>#prose:<index>"      — обычный prose-блок в оригинальном порядке
 *   - "rec:<id>#bio:<code>"         — комментарий к биомаркеру
 *   - "rec:<id>#body"               — одиночное тело (summary, данные пациента, назначения)
 */
const ANCHOR_RE = /<!--\s*anchor:([^\n>→]+?)\s*(?:-->|→)/g;

interface Segment {
  kind: "prose" | "biomarker" | "header";
  proseIndex?: number;
  bioCode?: string;
  content: string; // исходный markdown для fallback
  raw: string; // «сырое» вхождение (для склейки)
}

function splitRecommendation(text: string): Segment[] {
  const segments: Segment[] = [];
  if (!text) return segments;
  const matches = [...text.matchAll(ANCHOR_RE)];
  if (matches.length === 0) {
    segments.push({ kind: "prose", proseIndex: 0, content: text.trim(), raw: text });
    return segments;
  }
  let cursor = 0;
  let proseIndex = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const tag = m[1].trim();
    const start = m.index ?? 0;
    if (start < cursor) continue;
    if (tag.startsWith("biomarker ")) {
      const preRaw = text.slice(cursor, start);
      const preClean = preRaw.replace(/<!--[\s\S]*?-->/g, "").trim();
      if (preClean) {
        segments.push({
          kind: "prose",
          proseIndex: proseIndex++,
          content: preClean,
          raw: preRaw,
        });
      }
      const code = tag.slice("biomarker ".length).trim();
      // Ищем конец блока
      let end = text.length;
      let endMatch: RegExpMatchArray | undefined;
      for (let j = i + 1; j < matches.length; j++) {
        const t = matches[j][1].trim();
        if (t === "biomarker_end" || t.startsWith("biomarker ")) {
          end = matches[j].index ?? text.length;
          if (t === "biomarker_end") {
            endMatch = matches[j];
          }
          break;
        }
      }
      const inner = text.slice(start + m[0].length, end);
      segments.push({
        kind: "biomarker",
        bioCode: code,
        content: inner.replace(/<!--[\s\S]*?-->/g, "").trim(),
        raw: inner,
      });
      cursor = endMatch ? end + endMatch[0].length : end;
    } else {
      // прочие якоря игнорируем — они относятся к предыдущему prose
      const preRaw = text.slice(cursor, start + m[0].length);
      const preClean = preRaw.replace(/<!--[\s\S]*?-->/g, "").trim();
      if (preClean) {
        segments.push({
          kind: "prose",
          proseIndex: proseIndex++,
          content: preClean,
          raw: preRaw,
        });
      }
      cursor = start + m[0].length;
    }
  }
  if (cursor < text.length) {
    const tail = text.slice(cursor);
    const clean = tail.replace(/<!--[\s\S]*?-->/g, "").trim();
    if (clean) {
      segments.push({
        kind: "prose",
        proseIndex: proseIndex++,
        content: clean,
        raw: tail,
      });
    }
  }
  return segments;
}

export function assembleRecommendationText(
  rec: ReportRecommendationRow,
  drafts: Record<string, string>,
): string {
  const originalText = rec.text || "";
  const idPrefix = `rec:${rec.id}#`;

  // Проверим, есть ли для этой записи любые правки — если нет, возвращаем оригинал
  const hasEdits = Object.keys(drafts).some((k) => k.startsWith(idPrefix));
  if (!hasEdits) return originalText;

  // Одиночное тело
  if (drafts[`${idPrefix}body`] !== undefined) {
    // Первую строку с заголовком (# Название / название) сохраняем
    const bodyDraft = drafts[`${idPrefix}body`].trim();
    const firstLine = (originalText.split("\n")[0] || "").trim();
    if (
      /^#{1,3}\s/.test(firstLine) ||
      firstLine.toLowerCase() === rec.type.toLowerCase()
    ) {
      return `${firstLine}\n\n${bodyDraft}`.trim();
    }
    return bodyDraft;
  }

  const segments = splitRecommendation(originalText);
  const parts: string[] = [];

  // Сохраняем заголовок категории (первая строка), если есть
  const firstLine = originalText.split("\n")[0]?.trim() || "";
  const isHeader =
    /^#{1,3}\s/.test(firstLine) ||
    firstLine.toLowerCase() === rec.type.toLowerCase();
  if (isHeader) parts.push(firstLine);

  for (const seg of segments) {
    if (seg.kind === "prose") {
      // Для самого первого prose пропустим строку заголовка внутри raw
      const key = `${idPrefix}prose:${seg.proseIndex}`;
      const draft = drafts[key];
      let content: string;
      if (draft !== undefined) {
        content = draft.trim();
      } else {
        content = seg.content;
        if (isHeader && parts.length === 1 && content.startsWith(firstLine)) {
          content = content.slice(firstLine.length).trim();
        }
      }
      if (content) parts.push(content);
    } else if (seg.kind === "biomarker") {
      const key = `${idPrefix}bio:${seg.bioCode}`;
      const draft = drafts[key];
      const inner = draft !== undefined ? draft.trim() : seg.content;
      parts.push(
        `<!-- anchor:biomarker ${seg.bioCode} -->\n${inner}\n<!-- anchor:biomarker_end -->`,
      );
    }
  }

  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function collectDirtyRecommendations(
  report: LabReport,
  drafts: Record<string, string>,
): Array<{ id: string; text: string }> {
  const changed: Array<{ id: string; text: string }> = [];
  for (const rec of report.recommendations) {
    const next = assembleRecommendationText(rec, drafts);
    if (next !== (rec.text || "")) {
      changed.push({ id: rec.id, text: next });
    }
  }
  return changed;
}
