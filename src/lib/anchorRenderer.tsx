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
  STATUS_HEX_MUTED,
  STATUS_HEX_BG,
  buildRangeBarCanvas,
  parseMarkdownToPdfContent,
} from "@/lib/pdfExportHelpers";

// ═══ Biomarker code matching ═══

/**
 * Normalize biomarker code for fuzzy matching.
 * AI sometimes writes "TNF-a" (Latin) instead of "TNF-α" (Greek),
 * "HB" instead of "Hb", or omits modifiers like "+" / "-ABS".
 * This collapses those variants so we can match against the DB code.
 */
function normalizeBiomarkerCode(code: string): string {
  if (!code) return '';
  return code
    .toLowerCase()
    .trim()
    // Greek → Latin equivalents (most common AI substitutions)
    .replace(/α/g, 'a')
    .replace(/β/g, 'b')
    .replace(/γ/g, 'g')
    .replace(/δ/g, 'd')
    .replace(/μ/g, 'u')
    // Strip whitespace, dashes, parens, plus signs — keep only alphanumerics
    .replace(/[\s\-_+()]/g, '');
}

/** Find a biomarker by code, with fuzzy fallback for char/case variations. */
function findBiomarkerByCode(biomarkers: PdfBiomarkerData[], code: string): PdfBiomarkerData | undefined {
  if (!code) return undefined;
  // 1. Exact match (fastest)
  const exact = biomarkers.find(b => b.code === code);
  if (exact) return exact;
  // 2. Case-insensitive match
  const ci = biomarkers.find(b => b.code.toLowerCase() === code.toLowerCase());
  if (ci) return ci;
  // 3. Normalized match (handles Greek↔Latin, +/- modifiers, spacing)
  const target = normalizeBiomarkerCode(code);
  return biomarkers.find(b => normalizeBiomarkerCode(b.code) === target);
}

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
  const nameToCode: Record<string, string> = {};
  biomarkers.forEach(b => { nameToCode[b.name] = b.code; });
  const blocks = parseAnchors(reportText, codes, nameToCode);

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
            const bm = findBiomarkerByCode(biomarkers, block.code);
            const trimmedContent = (block.content || '').trim();
            // Skip empty fallback blocks: no metadata + no description = nothing useful to show
            if (!bm && !trimmedContent) return null;
            return (
              <div key={idx} className="space-y-3">
                {bm && (
                  <div className={`rounded-xl border shadow-sm p-4 space-y-2 ${statusBgMap[bm.status]}`}>
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
                {/* Commentary — отдельным блоком БЕЗ цветного фона, чтобы фон не "вытекал" */}
                {trimmedContent && (
                  <div className="px-1">
                    <MarkdownContent content={trimmedContent} />
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
  const nameToCode: Record<string, string> = {};
  biomarkers.forEach(b => { nameToCode[b.name] = b.code; });
  const blocks = parseAnchors(reportText, codes, nameToCode);
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
        const bm = findBiomarkerByCode(biomarkers, block.code);
        // Skip blocks where we have neither metadata nor real content.
        // Treat content with just whitespace / leftover artifacts as empty.
        const trimmedContent = (block.content || '').trim();
        if (!bm && !trimmedContent) break;

        const cardStack: any[] = [];

        if (bm) {
          const statusColor = STATUS_HEX_MUTED[bm.status] || '#9CA3AF';
          const tallBarHeight = 14;
          const bar = buildRangeBarCanvas(bm, barWidth, tallBarHeight, age, gender);

          // Row 1: Name (code)
          cardStack.push({
            text: [
              { text: bm.name, bold: true, fontSize: 10, color: '#1F2937' },
              { text: ` (${bm.code})`, fontSize: 8, color: '#6B7280' },
            ],
            margin: [0, 0, 0, 4],
          });

          // Row 2: Range bar (clean, no overlay text)
          if (bar) {
            cardStack.push({ ...bar, height: tallBarHeight, margin: [0, 0, 0, 4] });
          }

          // Row 3: Value + status
          cardStack.push({
            columns: [
              { text: [{ text: `${bm.value} `, bold: true, fontSize: 11, color: statusColor }, { text: bm.unit, fontSize: 8, color: '#9CA3AF' }], width: '*' },
              { text: [{ text: '● ', fontSize: 8, color: statusColor }, { text: bm.statusLabel, bold: true, fontSize: 9, color: statusColor }], alignment: 'right', width: 'auto' },
            ],
            margin: [0, 0, 0, 0],
          });
        }
        if (trimmedContent) {
          cardStack.push(...parseMarkdownToPdfContent(trimmedContent));
        }

        // If after all the processing the stack is empty, skip rendering the card entirely
        if (cardStack.length === 0) break;

        // Wrap in a visually soft card — no border lines, colored fill, left accent bar
        const accentColor = bm ? (STATUS_HEX_MUTED[bm.status] || '#D1D5DB') : '#D1D5DB';
        const fillColor = bm ? (STATUS_HEX_BG[bm.status] || '#FAFAFA') : '#FAFAFA';
        pdfContent.push({
          table: {
            widths: [3, '*'],
            body: [[
              { text: '', fillColor: accentColor },
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
