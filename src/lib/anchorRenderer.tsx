/**
 * Unified rendering for AnchorBlock[] — both Web (JSX) and PDF (pdfmake).
 * Single source of truth for report layout.
 */
import React from "react";
import { AnchorBlock, parseAnchors } from "@/lib/anchorParser";
import { MarkdownContent } from "@/components/MarkdownContent";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { Badge } from "@/components/ui/badge";
import {
  PdfBiomarkerData,
  STATUS_HEX,
  buildRangeBarCanvas,
  parseMarkdownToPdfContent,
} from "@/lib/pdfExportHelpers";

// ═══ Status styling maps ═══

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

const statusEmojiMap: Record<string, string> = {
  critical: "🔴", risk: "🟠", acceptable: "🟡", optimal: "🟢",
};

// ═══ Web renderer ═══

export function renderInterleavedWeb(
  reportText: string,
  biomarkers: PdfBiomarkerData[],
  age: number,
  gender: 'male' | 'female',
): React.ReactNode {
  const codes = biomarkers.map(b => b.code);
  const blocks = parseAnchors(reportText, codes);

  return (
    <div className="space-y-12">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'summary':
            return (
              <div key={idx} className="rounded-xl border border-primary/15 bg-primary/5 p-5">
                <MarkdownContent content={block.content} />
              </div>
            );

          case 'biomarker': {
            const bm = biomarkers.find(b => b.code === block.code);
            return (
              <div key={idx} className={`rounded-xl border shadow-sm p-4 space-y-3 ${bm ? statusBgMap[bm.status] : 'border-border/40 bg-card/50'}`}>
                {bm && (
                  <div className="space-y-2">
                    {/* Row 1: name (code) */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">{bm.name}</span>
                      <span className="text-xs text-muted-foreground">({bm.code})</span>
                    </div>
                    {/* Row 2: range bar */}
                    <BiomarkerRangeBar
                      biomarker={bm.biomarker}
                      value={bm.value}
                      age={age}
                      gender={gender}
                    />
                    {/* Row 3: value + status */}
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-lg font-bold tracking-tight ${statusColorMap[bm.status]}`}>
                          {bm.value}
                        </span>
                        <span className="text-xs text-muted-foreground">{bm.unit}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] ${statusColorMap[bm.status]}`}>●</span>
                        <span className={`text-xs font-medium ${statusColorMap[bm.status]}`}>{bm.statusLabel}</span>
                      </div>
                    </div>
                  </div>
                )}
                {block.content && (
                  <div className="pt-1 border-t border-border/20">
                    <MarkdownContent content={block.content} />
                  </div>
                )}
              </div>
            );
          }

          case 'section':
            return (
              <div key={idx}>
                <MarkdownContent content={block.content} />
              </div>
            );

          case 'text':
            return (
              <div key={idx}>
                <MarkdownContent content={block.content} />
              </div>
            );

          case 'spacer':
            return <div key={idx} className="h-8" />;

          case 'pagebreak':
            return null; // invisible on web

          default:
            return null;
        }
      })}
    </div>
  );
}

// ═══ PDF renderer ═══

export function buildInterleavedPdf(
  reportText: string,
  biomarkers: PdfBiomarkerData[],
  barWidth: number,
  barHeight: number,
  age: number,
  gender: 'male' | 'female',
): any[] {
  const codes = biomarkers.map(b => b.code);
  const blocks = parseAnchors(reportText, codes);
  const pdfContent: any[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'summary': {
        const summaryParsed = parseMarkdownToPdfContent(block.content);
        pdfContent.push({
          table: { widths: ['*'], body: [[{ stack: summaryParsed, margin: [8, 8, 8, 8] }]] },
          layout: {
            hLineWidth: () => 0.8,
            vLineWidth: () => 0.8,
            hLineColor: () => '#C4B5FD',
            vLineColor: () => '#C4B5FD',
            fillColor: () => '#F5F3FF',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 0, 0, 12],
        });
        break;
      }

      case 'biomarker': {
        const bm = biomarkers.find(b => b.code === block.code);
        const cardStack: any[] = [];

        if (bm) {
          const tallBarHeight = 20;
          const bar = buildRangeBarCanvas(bm, barWidth, tallBarHeight, age, gender);
          // Full-width bar with text overlaid via relativePosition
          const barWithOverlay: any = {
            stack: [
              bar ? { ...bar, height: tallBarHeight + 2, margin: [0, 0, 0, 0] } : { text: '' },
              {
                columns: [
                  { text: [{ text: bm.name, bold: true, fontSize: 9, color: '#FFFFFF' }, { text: ` (${bm.code})`, fontSize: 7, color: 'rgba(255,255,255,0.8)' }], width: '*' },
                  { text: [{ text: `${bm.value} ${bm.unit} `, bold: true, fontSize: 9, color: '#FFFFFF' }, { text: bm.statusLabel, fontSize: 7, color: 'rgba(255,255,255,0.85)' }], alignment: 'right', width: 'auto' },
                ],
                margin: [6, 0, 6, 0],
                relativePosition: { x: 0, y: -(tallBarHeight + 2) + 3 },
              },
            ],
            margin: [0, 0, 0, 4],
          };
          cardStack.push(barWithOverlay);
        }
        if (block.content) {
          cardStack.push(...parseMarkdownToPdfContent(block.content));
        }

        // Wrap in a bordered card
        const borderColor = bm ? (STATUS_HEX[bm.status] || '#D1D5DB') : '#D1D5DB';
        pdfContent.push({
          table: { widths: ['*'], body: [[{ stack: cardStack, margin: [6, 6, 6, 6] }]] },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0.6,
            hLineColor: () => borderColor,
            vLineColor: () => borderColor,
            fillColor: () => '#FAFAFA',
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 6, 0, 6],
        });
        break;
      }

      case 'section':
      case 'text':
        if (block.content) {
          pdfContent.push(...parseMarkdownToPdfContent(block.content));
        }
        break;

      case 'spacer':
        pdfContent.push({ text: '', margin: [0, 15, 0, 0] });
        break;

      case 'pagebreak':
        pdfContent.push({ text: '', pageBreak: 'after' });
        break;
    }
  }

  return pdfContent;
}
