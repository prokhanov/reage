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
  critical: "bg-status-critical/10 border-status-critical/30",
  risk: "bg-status-risk/10 border-status-risk/30",
  acceptable: "bg-status-acceptable/10 border-status-acceptable/30",
  optimal: "bg-status-optimal/10 border-status-optimal/30",
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
              <div key={idx} className="space-y-3">
                {bm && (
                  <div className={`rounded-lg border px-3 py-2 ${statusBgMap[bm.status]}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{statusEmojiMap[bm.status]}</span>
                        <span className="font-semibold text-xs text-foreground">{bm.name}</span>
                        <span className="text-[10px] text-muted-foreground">({bm.code})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs ${statusColorMap[bm.status]}`}>
                          {bm.value} {bm.unit}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${statusColorMap[bm.status]}`}>
                          {bm.statusLabel}
                        </Badge>
                      </div>
                    </div>
                    <BiomarkerRangeBar
                      biomarker={bm.biomarker}
                      value={bm.value}
                      age={age}
                      gender={gender}
                    />
                  </div>
                )}
                {block.content && <MarkdownContent content={block.content} />}
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
        if (bm) {
          // Row 1: dot + name + value/status
          pdfContent.push({
            columns: [
              { canvas: [{ type: 'ellipse', x: 5, y: 6, r1: 4, r2: 4, color: STATUS_HEX[bm.status] || '#888' }], width: 14, height: 14 },
              { text: [{ text: bm.name, bold: true, fontSize: 10 }, { text: ` (${bm.code})`, fontSize: 8, color: '#888' }], width: '*', margin: [0, 1, 0, 0] },
              { text: [{ text: `${bm.value} ${bm.unit} `, bold: true, fontSize: 10, color: STATUS_HEX[bm.status] || '#333' }, { text: bm.statusLabel, fontSize: 8, color: STATUS_HEX[bm.status] || '#888' }], alignment: 'right', width: 'auto', margin: [0, 1, 0, 0] },
            ],
            columnGap: 4,
            margin: [0, 8, 0, 1],
          });
          // Row 2: full-width range bar
          const bar = buildRangeBarCanvas(bm, barWidth, barHeight, age, gender);
          if (bar) pdfContent.push({ ...bar, margin: [0, 0, 0, 2] });
        }
        // Biomarker description text
        if (block.content) {
          pdfContent.push(...parseMarkdownToPdfContent(block.content));
        }
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
