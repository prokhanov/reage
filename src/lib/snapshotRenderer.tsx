/**
 * snapshotRenderer.tsx — единый рендерер для ReportSnapshot.
 *
 * Источник истины: `ReportSnapshot` (см. src/lib/reportSnapshot.ts).
 * Один и тот же snapshot рендерится:
 *   - в Web (renderSnapshotWeb → React JSX)
 *   - в PDF (buildSnapshotPdf → pdfmake content[])
 *
 * Биомаркеры привязаны по UUID (`biomarker_id`), что полностью устраняет
 * проблему ненадёжного матчинга по строковому коду (TNF-α vs TNF-a и пр.).
 *
 * Все визуальные данные (значение, статус, шкала) берутся из переданного
 * массива `biomarkers` (PdfBiomarkerData), который ресолвится из БД на
 * момент рендера — это гарантирует свежесть референсов и единые цвета
 * во всех частях приложения.
 */
import React from "react";
import type { ReportSnapshot, ReportBlock } from "@/lib/reportSnapshot";
import { MarkdownContent } from "@/components/MarkdownContent";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
import {
  PdfBiomarkerData,
  STATUS_HEX_MUTED,
  STATUS_HEX_BG,
  buildRangeBarCanvas,
  parseMarkdownToPdfContent,
} from "@/lib/pdfExportHelpers";

// Заголовки секций, которые AI часто оставляет внутри commentary последнего
// биомаркера. Режем по ним, чтобы не «вытекало» на следующий блок.
const COMMENTARY_OVERFLOW_REGEX =
  /^[\s"'`.,;:!?()\[\]\-—–>•]*(?:#{1,6}\s*)?(?:Что это значит для вас|Общая оценка системы организма|Итог по системе|Сильные стороны организма|Дефициты и дисфункции|Зоны внимания|Системные взаимосвязи|Рекомендации|План действий|Что мешает молодеть|Интерпретация биомаркеров)\b.*$/im;

function sanitizeCommentary(raw: string): string {
  if (!raw) return "";
  // 1) Убираем ВСЕ ``` (с языком и без, в любых вариациях)
  let s = raw
    .replace(/\r\n/g, "\n")
    .replace(/`{3,}[a-zA-Z]*/g, "")
    .replace(/^[\s"'`.,;:!?()\[\]\-—–]*`+[\s"'`.,;:!?()\[\]\-—–]*$/gm, "");
  // 2) Режем по первому overflow-заголовку.
  // Если заголовок начинается с первой строки — значит весь блок уже относится
  // к следующей секции и не должен оставаться внутри commentary.
  const m = COMMENTARY_OVERFLOW_REGEX.exec(s);
  if (m) {
    if (m.index === 0) return "";
    s = s.slice(0, m.index);
  }
  // 2.5) Drop only a truly duplicated first-line biomarker heading, but keep
  // normal prose that begins with the biomarker name.
  const normalized = s.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstNonEmptyIndex >= 0) {
    const firstLine = lines[firstNonEmptyIndex].trim();
    if (/^\*{0,2}[^\n]+\([^)]+\)\*{0,2}:?$/i.test(firstLine)) {
      lines.splice(firstNonEmptyIndex, 1);
      while (lines[firstNonEmptyIndex] !== undefined && lines[firstNonEmptyIndex].trim() === "") {
        lines.splice(firstNonEmptyIndex, 1);
      }
      s = lines.join("\n");
    }
  }
  // 3) Финальная нормализация через общий cleaner
  return cleanMarkdownArtifacts(s).trim();
}

// ─── Index biomarkers by UUID ──────────────────────────────────────────────

function indexById(biomarkers: PdfBiomarkerData[]): Map<string, PdfBiomarkerData> {
  const map = new Map<string, PdfBiomarkerData>();
  for (const bm of biomarkers) {
    if (bm.id) map.set(bm.id, bm);
  }
  return map;
}

// ─── Web styles ────────────────────────────────────────────────────────────

const statusColorMap: Record<string, string> = {
  critical: "text-status-critical",
  risk: "text-status-risk",
  acceptable: "text-status-acceptable",
  optimal: "text-status-optimal",
};

const statusBgMap: Record<string, string> = {
  critical: "bg-status-critical/5 border-status-critical/15",
  risk: "bg-status-risk/5 border-status-risk/15",
  acceptable: "bg-status-acceptable/5 border-status-acceptable/15",
  optimal: "bg-status-optimal/5 border-status-optimal/15",
};

// ─── Web renderer ──────────────────────────────────────────────────────────

export function renderSnapshotWeb(
  snapshot: ReportSnapshot,
  biomarkers: PdfBiomarkerData[],
  age: number,
  gender: "male" | "female",
): React.ReactNode {
  const byId = indexById(biomarkers);

  return (
    <div className="space-y-8">
      {snapshot.blocks.map((block, idx) => renderBlockWeb(block, idx, byId, age, gender))}
    </div>
  );
}

function renderBlockWeb(
  block: ReportBlock,
  idx: number,
  byId: Map<string, PdfBiomarkerData>,
  age: number,
  gender: "male" | "female",
): React.ReactNode {
  switch (block.type) {
    case "text":
      return (
        <div key={idx}>
          <MarkdownContent content={block.content} />
        </div>
      );

    case "section":
      return (
        <div key={idx} className="pt-4">
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            {block.emoji ? `${block.emoji} ${block.title}` : block.title}
          </h2>
          <div className="h-1 w-20 bg-gradient-primary rounded-full" />
        </div>
      );

    case "summary":
      return (
        <div
          key={idx}
          className="rounded-xl border border-primary/20 bg-primary/5 p-5"
        >
          <MarkdownContent content={block.content} />
        </div>
      );

    case "biomarker": {
      const bm = byId.get(block.biomarker_id);
      const cleanCommentary = sanitizeCommentary(block.commentary || "");
      // Без метаданных и без комментария — нечего показывать.
      if (!bm && !cleanCommentary) return null;

      return (
        <div key={idx} className="space-y-3">
          {/* Карточка биомаркера со статусным фоном — ТОЛЬКО шкала и значение */}
          {bm && (
            <div
              className={`rounded-xl border shadow-sm p-4 space-y-2 ${statusBgMap[bm.status]}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{bm.name}</span>
                <span className="text-xs text-muted-foreground">({bm.code})</span>
              </div>
              <BiomarkerRangeBar
                biomarker={bm.biomarker}
                value={bm.value}
                age={age}
                gender={gender}
              />
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-lg font-bold tracking-tight ${statusColorMap[bm.status]}`}>
                    {bm.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{bm.unit}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] ${statusColorMap[bm.status]}`}>●</span>
                  <span className={`text-xs font-medium ${statusColorMap[bm.status]}`}>
                    {bm.statusLabel}
                  </span>
                </div>
              </div>
            </div>
          )}
          {/* Комментарий — ОТДЕЛЬНЫМ блоком БЕЗ цветного фона, чтобы не вытекало */}
          {cleanCommentary && (
            <div className="px-1">
              <MarkdownContent content={cleanCommentary} />
            </div>
          )}
        </div>
      );
    }

    case "spacer": {
      const sizeMap = { small: "h-3", medium: "h-6", large: "h-10" } as const;
      return <div key={idx} className={sizeMap[block.size]} />;
    }

    case "pagebreak":
      // Невидим в web — это PDF-only механика.
      return null;

    default:
      return null;
  }
}

// ─── PDF renderer ──────────────────────────────────────────────────────────

export function buildSnapshotPdf(
  snapshot: ReportSnapshot,
  biomarkers: PdfBiomarkerData[],
  barWidth: number,
  age: number,
  gender: "male" | "female",
): any[] {
  const byId = indexById(biomarkers);
  const out: any[] = [];

  for (const block of snapshot.blocks) {
    switch (block.type) {
      case "text": {
        if (block.content) {
          out.push(...parseMarkdownToPdfContent(block.content));
        }
        break;
      }

      case "section": {
        const title = block.emoji ? `${block.emoji} ${block.title}` : block.title;
        out.push({
          text: title,
          style: "h1",
          margin: [0, 14, 0, 6],
        });
        break;
      }

      case "summary": {
        const summaryParsed = parseMarkdownToPdfContent(block.content);
        out.push({
          table: {
            widths: ["*"],
            body: [[{ stack: summaryParsed, margin: [8, 8, 8, 8] }]],
          },
          layout: {
            hLineWidth: () => 0.8,
            vLineWidth: () => 0.8,
            hLineColor: () => "#C4B5FD",
            vLineColor: () => "#C4B5FD",
            fillColor: () => "#F5F3FF",
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 4, 0, 12],
        });
        break;
      }

      case "biomarker": {
        const bm = byId.get(block.biomarker_id);
        const cleanCommentary = sanitizeCommentary(block.commentary || "");
        if (!bm && !cleanCommentary) break;

        // 1) Карточка биомаркера (со статусным фоном) — только шкала и значение
        if (bm) {
          const statusColor = STATUS_HEX_MUTED[bm.status] || "#9CA3AF";
          const tallBarHeight = 14;
          const bar = buildRangeBarCanvas(bm, barWidth, tallBarHeight, age, gender);
          const accentColor = STATUS_HEX_MUTED[bm.status] || "#D1D5DB";
          const fillColor = STATUS_HEX_BG[bm.status] || "#FAFAFA";

          const cardStack: any[] = [
            {
              text: [
                { text: bm.name, bold: true, fontSize: 10, color: "#1F2937" },
                { text: ` (${bm.code})`, fontSize: 8, color: "#6B7280" },
              ],
              margin: [0, 0, 0, 4],
            },
          ];
          if (bar) cardStack.push({ ...bar, height: tallBarHeight, margin: [0, 0, 0, 4] });
          cardStack.push({
            columns: [
              {
                text: [
                  { text: `${bm.value} `, bold: true, fontSize: 11, color: statusColor },
                  { text: bm.unit, fontSize: 8, color: "#9CA3AF" },
                ],
                width: "*",
              },
              {
                text: [
                  { text: "● ", fontSize: 8, color: statusColor },
                  { text: bm.statusLabel, bold: true, fontSize: 9, color: statusColor },
                ],
                alignment: "right",
                width: "auto",
              },
            ],
          });

          out.push({
            table: {
              widths: [3, "*"],
              body: [[
                { text: "", fillColor: accentColor },
                { stack: cardStack, margin: [8, 8, 8, 8], fillColor: fillColor },
              ]],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
            margin: [0, 6, 0, 4],
          });
        }

        // 2) Комментарий — ОТДЕЛЬНЫМ блоком БЕЗ цветного фона
        if (cleanCommentary) {
          out.push(...parseMarkdownToPdfContent(cleanCommentary));
          out.push({ text: "", margin: [0, 0, 0, 6] });
        }
        break;
      }

      case "spacer": {
        const sizeMap = { small: 6, medium: 12, large: 24 } as const;
        out.push({ text: "", margin: [0, sizeMap[block.size], 0, 0] });
        break;
      }

      case "pagebreak": {
        out.push({ text: "", pageBreak: "after" });
        break;
      }
    }
  }

  return out;
}
