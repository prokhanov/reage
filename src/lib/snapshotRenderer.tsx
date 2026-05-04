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
import { BiomarkerScale } from "@/components/BiomarkerScale";
import {
  PdfBiomarkerData,
  STATUS_HEX_MUTED,
  STATUS_HEX_BG,
  buildRangeBarCanvas,
  parseMarkdownToPdfContent,
} from "@/lib/pdfExportHelpers";

// ─── Index biomarkers by UUID ──────────────────────────────────────────────

function indexById(biomarkers: PdfBiomarkerData[]): Map<string, PdfBiomarkerData> {
  const map = new Map<string, PdfBiomarkerData>();
  for (const bm of biomarkers) {
    if (bm.id) map.set(bm.id, bm);
  }
  return map;
}

function normalizeSnapshotBlocks(blocks: ReportSnapshot["blocks"], byId: Map<string, PdfBiomarkerData>): ReportSnapshot["blocks"] {
  const skip = new Set<number>();
  let currentSection = "";

  return blocks.flatMap((block, idx) => {
    if (skip.has(idx)) return [];
    if (block.type === "section") currentSection = block.title;

    if (block.type !== "text" || !block.content.trim()) return [block];

    const text = block.content.trim();
    const looksLikeSummary = /^(Общая оценка|Сильные стороны|Дефициты|Заключение|Резюме|Итоги|Выводы|Далее|Теперь|Ключевые показатели)/i.test(text);
    const looksLikeBiomarkerComment = /\b(Ваш(?:\s+уровень|\s+показатель)?|уровень|показатель|значение)\b/i.test(text);
    if (looksLikeSummary || !looksLikeBiomarkerComment) return [block];

    for (let j = idx + 1; j < blocks.length; j++) {
      const next = blocks[j];
      if (next.type === "section") break;
      if (next.type !== "biomarker" || (next.commentary || "").trim()) continue;
      const bm = byId.get(next.biomarker_id);
      if (!bm || (currentSection && bm.category !== currentSection)) continue;
      skip.add(j);
      return [{ ...next, commentary: text }];
    }

    return [block];
  });
}

function buildFallbackCommentary(bm: PdfBiomarkerData): string {
  const range = bm.rangeDisplay ? ` Ориентир целевого диапазона: ${bm.rangeDisplay} ${bm.unit}.` : "";
  const description = bm.biomarker?.description ? ` ${bm.biomarker.description}` : "";

  return [
    `${bm.name} (${bm.code}) — показатель системы «${bm.category}». Ваш результат: ${bm.value} ${bm.unit}; текущая оценка по шкале — ${bm.statusLabel.toLowerCase()}.${range}`,
    description || `Этот показатель необходимо оценивать не изолированно, а вместе с соседними маркерами этой системы и общей клинической картиной.`,
  ].join("\n\n");
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
  const blocks = normalizeSnapshotBlocks(snapshot.blocks, byId);

  return (
    <div className="space-y-8">
      {blocks.map((block, idx) => renderBlockWeb(block, idx, byId, age, gender))}
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
      // Якорь нужен для навигации сайдбара отчёта (Recommendations.tsx →
      // sections.id = `snapshot-section-${i}`, scrollToSection ищет
      // элемент `section-${id}` ⇒ итоговый DOM id = `section-snapshot-section-${i}`).
      return (
        <div key={idx} id={`section-snapshot-section-${idx}`} className="pt-4 scroll-mt-6">
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
      if (!bm) return null;
      const trimmedCommentary = (block.commentary || "").trim() || buildFallbackCommentary(bm);

      return (
        <div
          key={idx}
          className={`rounded-xl border shadow-sm p-4 space-y-3 ${
            bm ? statusBgMap[bm.status] : "border-border/40 bg-card/50"
          }`}
        >
          {bm && (
            <div className="space-y-2">
              {/* Имя + код + статус */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{bm.name}</span>
                  <span className="text-xs text-muted-foreground">({bm.code})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] ${statusColorMap[bm.status]}`}>●</span>
                  <span className={`text-xs font-medium ${statusColorMap[bm.status]}`}>
                    {bm.statusLabel}
                  </span>
                </div>
              </div>
              {/* Унифицированная шкала */}
              <BiomarkerScale
                biomarker={bm.biomarker}
                value={bm.value}
                age={age}
                gender={gender}
                unit={bm.unit}
                showHeader
              />
            </div>
          )}
          {trimmedCommentary && (
            <div className={bm ? "pt-1 border-t border-border/20" : ""}>
              <MarkdownContent content={trimmedCommentary} />
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
  const blocks = normalizeSnapshotBlocks(snapshot.blocks, byId);

  for (const block of blocks) {
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
        if (!bm) break;
        const trimmedCommentary = (block.commentary || "").trim() || buildFallbackCommentary(bm);

        const cardStack: any[] = [];

        if (bm) {
          const statusColor = STATUS_HEX_MUTED[bm.status] || "#9CA3AF";
          const tallBarHeight = 14;
          const bar = buildRangeBarCanvas(bm, barWidth, tallBarHeight, age, gender);

          // Имя + код
          cardStack.push({
            text: [
              { text: bm.name, bold: true, fontSize: 10, color: "#1F2937" },
              { text: ` (${bm.code})`, fontSize: 8, color: "#6B7280" },
            ],
            margin: [0, 0, 0, 4],
          });

          // Шкала
          if (bar) {
            cardStack.push({ ...bar, height: tallBarHeight, margin: [0, 0, 0, 4] });
          }

          // Значение + статус
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
            margin: [0, 0, 0, 0],
          });
        }

        if (trimmedCommentary) {
          cardStack.push(...parseMarkdownToPdfContent(trimmedCommentary));
        }

        if (cardStack.length === 0) break;

        const accentColor = bm ? STATUS_HEX_MUTED[bm.status] || "#D1D5DB" : "#D1D5DB";
        const fillColor = bm ? STATUS_HEX_BG[bm.status] || "#FAFAFA" : "#FAFAFA";

        out.push({
          table: {
            widths: [3, "*"],
            body: [
              [
                { text: "", fillColor: accentColor },
                { stack: cardStack, margin: [8, 8, 8, 8], fillColor: fillColor },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 6, 0, 6],
        });
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
