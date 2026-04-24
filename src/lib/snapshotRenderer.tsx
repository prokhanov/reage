/**
 * snapshotRenderer.tsx — единый рендерер для ReportSnapshot.
 *
 * Источник истины: `ReportSnapshot` (см. src/lib/reportSnapshot.ts).
 * Один и тот же snapshot рендерится:
 *   - в Web (renderSnapshotWeb → React JSX)
 *   - в PDF (buildSnapshotPdf → pdfmake content[])
 *
 * Биомаркеры привязаны по UUID (`biomarker_id`), что полностью устраняет
 * проблему ненадёжного матчинга по строковому коду.
 *
 * Известные проблемы PDF, которые здесь решены:
 *   - Карточка биомаркера разрывалась между страницами и теряла фон. Решение:
 *     `unbreakable: true` на всю карточку + `dontBreakRows`. Цветной accent
 *     встроен левым padding'ом + fillColor через layout, а не отдельной
 *     колонкой-полоской.
 *   - Заголовок section отрывался от своего контента → теперь section всегда
 *     начинается с pageBreak (кроме первого блока) и держится с следующим.
 *   - parseMarkdownToPdfContent создавал пустые fontSize:1 параграфы → теперь
 *     blank-line внутри блока snapshot не рендерится, отступы делаются margin.
 *   - Двойной .prose в web-вьюхе → snapshotRenderer возвращает чистые
 *     элементы без prose-обёртки, prose навешивает родитель только при
 *     необходимости.
 *   - Prescriptions block теперь полноценно рендерится в Web и PDF из
 *     переданного списка.
 *   - Каждая section получает стабильный id (`section-snapshot-{idx}`)
 *     для бокового меню.
 */
import React from "react";
import type { ReportSnapshot, ReportBlock } from "@/lib/reportSnapshot";
import { MarkdownContent } from "@/components/MarkdownContent";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import {
  PdfBiomarkerData,
  STATUS_HEX_MUTED,
  STATUS_HEX_BG,
  buildRangeBarCanvas,
  parseMarkdownToPdfContent,
} from "@/lib/pdfExportHelpers";

// ─── Public types ──────────────────────────────────────────────────────────

export interface PrescriptionRenderItem {
  id: string;
  prescription: string;
  reason?: string | null;
  effect?: string | null;
  control_date?: string | null;
  /** Длительность в виде «3 мес.» — посчитанная в Recommendations.tsx. */
  durationLabel?: string | null;
}

// ─── Index biomarkers by UUID ──────────────────────────────────────────────

function indexById(biomarkers: PdfBiomarkerData[]): Map<string, PdfBiomarkerData> {
  const map = new Map<string, PdfBiomarkerData>();
  for (const bm of biomarkers) {
    if (bm.id) map.set(bm.id, bm);
  }
  return map;
}

// ─── Stable section ids (for sidebar navigation) ───────────────────────────

export function getSnapshotSectionAnchors(
  snapshot: ReportSnapshot,
): Array<{ id: string; label: string }> {
  const anchors: Array<{ id: string; label: string }> = [];
  snapshot.blocks.forEach((b, i) => {
    if (b.type === "section") {
      anchors.push({
        id: `snapshot-section-${i}`,
        label: b.emoji ? `${b.emoji} ${b.title}` : b.title,
      });
    }
  });
  return anchors;
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
  prescriptions: PrescriptionRenderItem[] = [],
): React.ReactNode {
  const byId = indexById(biomarkers);

  return (
    <div className="space-y-6">
      {snapshot.blocks.map((block, idx) =>
        renderBlockWeb(block, idx, byId, age, gender, prescriptions),
      )}
    </div>
  );
}

function renderBlockWeb(
  block: ReportBlock,
  idx: number,
  byId: Map<string, PdfBiomarkerData>,
  age: number,
  gender: "male" | "female",
  prescriptions: PrescriptionRenderItem[],
): React.ReactNode {
  switch (block.type) {
    case "text":
      return (
        <div key={idx} className="snapshot-text">
          <MarkdownContent content={block.content} />
        </div>
      );

    case "section":
      return (
        <div
          key={idx}
          id={`section-snapshot-${idx}`}
          className="pt-6 scroll-mt-6"
        >
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
          className={
            block.scope === "overall"
              ? "rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 p-6 shadow-sm"
              : "rounded-xl border border-primary/20 bg-primary/5 p-5"
          }
        >
          <MarkdownContent content={block.content} />
        </div>
      );

    case "biomarker": {
      const bm = byId.get(block.biomarker_id);
      const trimmedCommentary = (block.commentary || "").trim();
      // Без метаданных и без комментария — нечего показывать.
      if (!bm && !trimmedCommentary) return null;

      return (
        <div
          key={idx}
          className={`rounded-xl border shadow-sm p-4 space-y-3 ${
            bm ? statusBgMap[bm.status] : "border-border/40 bg-card/50"
          }`}
        >
          {bm && (
            <div className="space-y-2">
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
          {trimmedCommentary && (
            <div className={bm ? "pt-2 border-t border-border/20" : ""}>
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

    case "prescriptions":
      return (
        <div
          key={idx}
          id={`section-snapshot-${idx}`}
          className="pt-6 scroll-mt-6 space-y-4"
        >
          <div>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              {block.title || "Назначения"}
            </h2>
            <div className="h-1 w-20 bg-gradient-primary rounded-full" />
          </div>
          {prescriptions.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">
              Назначения для этого отчёта отсутствуют.
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p, i) => (
                <div
                  key={p.id}
                  className="p-5 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm"
                >
                  <h3 className="font-semibold text-base mb-2">
                    {i + 1}. {p.prescription}
                  </h3>
                  {p.reason && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/10 mb-2">
                      <span className="text-primary mt-0.5">📊</span>
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-medium">Причина:</span> {p.reason}
                      </p>
                    </div>
                  )}
                  {p.effect && (
                    <p className="text-sm text-muted-foreground italic mb-2">{p.effect}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {p.durationLabel && <span>Длительность: {p.durationLabel}</span>}
                    {p.control_date && (
                      <>
                        <span className="opacity-50">•</span>
                        <span>Контрольная дата: {p.control_date}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ─── PDF renderer ──────────────────────────────────────────────────────────

/**
 * Возвращает массив pdfmake-блоков для ReportSnapshot.
 *
 * Главные приёмы анти-разрыва:
 *   - перед каждой section (кроме первой) принудительный pageBreak;
 *   - карточки биомаркеров обёрнуты в одну таблицу с `dontBreakRows: true`
 *     и unbreakable стеком — карточка либо целиком на странице, либо
 *     переносится на следующую;
 *   - summary тоже unbreakable — короткие резюме не разрезаются.
 */
export function buildSnapshotPdf(
  snapshot: ReportSnapshot,
  biomarkers: PdfBiomarkerData[],
  barWidth: number,
  age: number,
  gender: "male" | "female",
  prescriptions: PrescriptionRenderItem[] = [],
): any[] {
  const byId = indexById(biomarkers);
  const out: any[] = [];
  let firstSectionEmitted = false;

  for (const block of snapshot.blocks) {
    switch (block.type) {
      case "text": {
        if (block.content) out.push(...parseMarkdownToPdfContent(block.content));
        break;
      }

      case "section": {
        const title = block.emoji ? `${block.emoji} ${block.title}` : block.title;
        if (firstSectionEmitted) {
          out.push({ text: "", pageBreak: "before" });
        }
        firstSectionEmitted = true;
        out.push({
          text: title,
          fontSize: 16,
          bold: true,
          color: "#1F2937",
          margin: [0, 0, 0, 4],
        });
        out.push({
          canvas: [{ type: "rect", x: 0, y: 0, w: 60, h: 2, color: "#7C3AED" }],
          margin: [0, 0, 0, 12],
        });
        break;
      }

      case "summary": {
        const summaryParsed = parseMarkdownToPdfContent(block.content);
        const isOverall = block.scope === "overall";
        out.push({
          unbreakable: summaryParsed.length <= 6, // unbreakable для коротких summary
          table: {
            widths: ["*"],
            body: [[{ stack: summaryParsed, margin: [10, 8, 10, 8] }]],
          },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0.6,
            hLineColor: () => (isOverall ? "#A78BFA" : "#C4B5FD"),
            vLineColor: () => (isOverall ? "#A78BFA" : "#C4B5FD"),
            fillColor: () => (isOverall ? "#EDE9FE" : "#F5F3FF"),
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 4, 0, 12],
        });
        break;
      }

      case "biomarker": {
        const bm = byId.get(block.biomarker_id);
        const trimmedCommentary = (block.commentary || "").trim();
        if (!bm && !trimmedCommentary) break;

        const cardStack: any[] = [];
        const accentColor = bm ? STATUS_HEX_MUTED[bm.status] || "#D1D5DB" : "#D1D5DB";
        const fillColor = bm ? STATUS_HEX_BG[bm.status] || "#FAFAFA" : "#FAFAFA";

        if (bm) {
          const statusColor = STATUS_HEX_MUTED[bm.status] || "#9CA3AF";
          const tallBarHeight = 14;
          const innerWidth = barWidth - 24; // компенсация padding'а карточки
          const bar = buildRangeBarCanvas(bm, innerWidth, tallBarHeight, age, gender);

          cardStack.push({
            text: [
              { text: bm.name, bold: true, fontSize: 10, color: "#1F2937" },
              { text: ` (${bm.code})`, fontSize: 8, color: "#6B7280" },
            ],
            margin: [0, 0, 0, 4],
          });

          if (bar) {
            cardStack.push({ ...bar, height: tallBarHeight, margin: [0, 0, 0, 4] });
          }

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
          if (bm) {
            // тонкий разделитель
            cardStack.push({
              canvas: [{ type: "line", x1: 0, y1: 4, x2: barWidth - 24, y2: 4, lineWidth: 0.5, lineColor: "#E5E7EB" }],
              margin: [0, 4, 0, 4],
            });
          }
          cardStack.push(...parseMarkdownToPdfContent(trimmedCommentary));
        }

        if (cardStack.length === 0) break;

        // Цельная карточка: фон + слева цветной accent через padding+rect.
        out.push({
          unbreakable: true,
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: cardStack,
                  fillColor,
                  margin: [12, 10, 12, 10],
                },
              ],
            ],
            dontBreakRows: true,
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (i: number) => (i === 0 ? 3 : 0),
            vLineColor: () => accentColor,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 5, 0, 5],
        });
        break;
      }

      case "spacer": {
        const sizeMap = { small: 4, medium: 8, large: 14 } as const;
        out.push({ text: "", margin: [0, sizeMap[block.size], 0, 0] });
        break;
      }

      case "pagebreak": {
        out.push({ text: "", pageBreak: "after" });
        break;
      }

      case "prescriptions": {
        if (firstSectionEmitted) {
          out.push({ text: "", pageBreak: "before" });
        }
        firstSectionEmitted = true;
        out.push({
          text: block.title || "Назначения",
          fontSize: 16,
          bold: true,
          color: "#1F2937",
          margin: [0, 0, 0, 4],
        });
        out.push({
          canvas: [{ type: "rect", x: 0, y: 0, w: 60, h: 2, color: "#7C3AED" }],
          margin: [0, 0, 0, 12],
        });

        if (prescriptions.length === 0) {
          out.push({
            text: "Назначения для этого отчёта отсутствуют.",
            italics: true,
            color: "#6B7280",
            fontSize: 10,
          });
          break;
        }

        prescriptions.forEach((p, i) => {
          const stack: any[] = [
            { text: `${i + 1}. ${p.prescription}`, bold: true, fontSize: 11, margin: [0, 0, 0, 4] },
          ];
          if (p.reason) {
            stack.push({
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      text: [
                        { text: "Причина: ", bold: true, fontSize: 9 },
                        { text: p.reason, fontSize: 9 },
                      ],
                      fillColor: "#F5F3FF",
                      margin: [8, 6, 8, 6],
                    },
                  ],
                ],
              },
              layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
              margin: [0, 0, 0, 4],
            });
          }
          if (p.effect) {
            stack.push({
              text: p.effect,
              italics: true,
              fontSize: 9,
              color: "#6B7280",
              margin: [0, 0, 0, 4],
            });
          }
          const meta: string[] = [];
          if (p.durationLabel) meta.push(`Длительность: ${p.durationLabel}`);
          if (p.control_date) meta.push(`Контрольная дата: ${p.control_date}`);
          if (meta.length) {
            stack.push({ text: meta.join("  •  "), fontSize: 8, color: "#9CA3AF" });
          }
          out.push({
            unbreakable: true,
            table: {
              widths: ["*"],
              body: [[{ stack, fillColor: "#FAFAFA", margin: [12, 10, 12, 10] }]],
              dontBreakRows: true,
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => "#E5E7EB",
              vLineColor: () => "#E5E7EB",
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
            margin: [0, 5, 0, 5],
          });
        });
        break;
      }
    }
  }

  return out;
}
