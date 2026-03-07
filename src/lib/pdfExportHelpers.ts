/**
 * Shared PDF export helpers used by both ReportVisualsTest and Recommendations pages.
 * Includes: range bar canvas, markdown parsing, text-biomarker interleaving.
 */
import { getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge } from "@/lib/biomarkerNorms";
import { cleanMarkdownArtifacts } from "@/lib/markdown";

// ═══ Types ═══

export interface PdfBiomarkerData {
  name: string;
  code: string;
  value: number;
  unit: string;
  category: string;
  biomarker: any;
  status: string;
  statusLabel: string;
  rangeDisplay: string;
}

// ═══ Color map ═══

export const STATUS_HEX: Record<string, string> = {
  critical: '#EF4444',
  risk: '#F59E0B',
  acceptable: '#EAB308',
  optimal: '#22C55E',
};

function getZoneColorHex(
  v: number,
  normMin: number | null, normMax: number | null,
  optMin: number | null, optMax: number | null,
  critMin: number | null, critMax: number | null,
): string {
  if ((critMin !== null && v < critMin) || (critMax !== null && v > critMax)) return STATUS_HEX.critical;
  if (optMin !== null || optMax !== null) {
    const inOpt = (optMin === null || v >= optMin) && (optMax === null || v <= optMax);
    if (inOpt) return STATUS_HEX.optimal;
  }
  if ((normMin !== null && v < normMin) || (normMax !== null && v > normMax)) return STATUS_HEX.risk;
  if (optMin !== null || optMax !== null) return STATUS_HEX.acceptable;
  return STATUS_HEX.optimal;
}

// ═══ Range bar canvas builder ═══

export function buildRangeBarCanvas(
  bm: PdfBiomarkerData,
  barWidth: number,
  barHeight: number,
  age: number,
  gender: 'male' | 'female',
): any {
  const b = bm.biomarker;
  const normal = getNormalRangeForAge(b, age, gender);
  const optimal = getOptimalRangeForAge(b, age, gender);
  const critical = getCriticalRangeForAge(b, age, gender);

  if (normal.min === null && normal.max === null) return null;

  const normMin = normal.min, normMax = normal.max;
  const optMin = optimal.min, optMax = optimal.max;
  const critMin = critical.min, critMax = critical.max;

  const pointSet = new Set<number>();
  [bm.value, normMin, normMax, optMin, optMax, critMin, critMax].forEach(v => { if (v !== null) pointSet.add(v); });
  const allPoints = Array.from(pointSet);
  const dataMin = Math.min(...allPoints);
  const dataMax = Math.max(...allPoints);
  const range = dataMax - dataMin;
  const padding = range * 0.15 || 1;
  const scaleMin = dataMin - padding;
  const scaleMax = dataMax + padding;
  const scaleRange = scaleMax - scaleMin;
  const toX = (v: number) => ((v - scaleMin) / scaleRange) * barWidth;

  const boundaries = new Set<number>();
  boundaries.add(scaleMin); boundaries.add(scaleMax);
  if (critMin !== null) boundaries.add(critMin);
  if (normMin !== null) boundaries.add(normMin);
  if (optMin !== null) boundaries.add(optMin);
  if (optMax !== null) boundaries.add(optMax);
  if (normMax !== null) boundaries.add(normMax);
  if (critMax !== null) boundaries.add(critMax);

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const canvasItems: any[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i], end = sorted[i + 1];
    const mid = (start + end) / 2;
    const x = toX(start);
    const w = toX(end) - x;
    if (w > 0.5) {
      canvasItems.push({
        type: 'rect', x, y: 0, w, h: barHeight,
        color: getZoneColorHex(mid, normMin, normMax, optMin, optMax, critMin, critMax),
        r: i === 0 ? 4 : (i === sorted.length - 2 ? 4 : 0),
      });
    }
  }

  // Value marker
  const mx = Math.max(3, Math.min(barWidth - 3, toX(bm.value)));
  canvasItems.push({ type: 'ellipse', x: mx, y: barHeight / 2, r1: 5, r2: 5, color: '#1F2937' });
  canvasItems.push({ type: 'ellipse', x: mx, y: barHeight / 2, r1: 3, r2: 3, color: '#FFFFFF' });

  return {
    canvas: canvasItems,
    width: barWidth,
    height: barHeight + 2,
    margin: [0, 2, 0, 4],
  };
}

// ═══ Markdown → pdfmake content ═══

export function parseInlineMarkdownPdf(text: string): any[] {
  const parts: any[] = [];
  // Bold + italic combined
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

function cleanMarkdownEscapes(text: string): string {
  return text
    .replace(/(\d+)\\\.(?=\s)/g, '$1.')
    .replace(/\\\./g, '.');
}

export function parseMarkdownToPdfContent(markdown: string): any[] {
  const content: any[] = [];
  const cleaned = cleanMarkdownArtifacts(markdown);
  const lines = cleaned.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { content.push({ text: ' ', margin: [0, 0, 0, 0], fontSize: 1 }); continue; }
    if (trimmed === '&nbsp;' || trimmed === '\u00A0') { content.push({ text: ' ', margin: [0, 3, 0, 3] }); continue; }
    if (trimmed.match(/^[-*_]{3,}$/) || trimmed.match(/^[\*\-_](\s+[\*\-_]){2,}$/)) { content.push({ text: ' ', margin: [0, 4, 0, 4] }); continue; }
    if (trimmed.match(/^[*•]+\s*$/)) continue;

    // List-style subheadings (* **Name**: or - **Name**:)
    if (trimmed.match(/^[*\-]\s+\*\*.+\*\*:?\s*$/)) {
      const cleanedHeader = trimmed.replace(/^[*\-]\s+/, '');
      content.push({ text: parseInlineMarkdownPdf(cleanedHeader), style: 'h3', margin: [0, 8, 0, 4] });
      continue;
    }

    // Headers #### and deeper → h3
    if (trimmed.match(/^#{4,}\s+/)) {
      content.push({ text: parseInlineMarkdownPdf(cleanMarkdownEscapes(trimmed.replace(/^#{4,}\s+/, ''))), style: 'h3', margin: [0, 8, 0, 2] });
    } else if (trimmed.startsWith('### ')) {
      content.push({ text: parseInlineMarkdownPdf(cleanMarkdownEscapes(trimmed.replace('### ', ''))), style: 'h3', margin: [0, 8, 0, 2] });
    } else if (trimmed.startsWith('## ')) {
      content.push({ text: parseInlineMarkdownPdf(cleanMarkdownEscapes(trimmed.replace('## ', ''))), style: 'h2', margin: [0, 10, 0, 3] });
    } else if (trimmed.startsWith('# ')) {
      content.push({ text: parseInlineMarkdownPdf(cleanMarkdownEscapes(trimmed.replace('# ', ''))), style: 'h1', margin: [0, 12, 0, 4] });
    } else if (trimmed.match(/^[-*]\s+\S/)) {
      content.push({ text: [{ text: '• ' }, ...parseInlineMarkdownPdf(cleanMarkdownEscapes(trimmed.replace(/^[-*]\s+/, '')))], style: 'listItem', margin: [15, 0, 0, 2] });
    } else if (trimmed.match(/^\d+\\?\.\s+/)) {
      const m = trimmed.match(/^(\d+)\\?\.\s+(.*)$/);
      if (m) {
        const listText = cleanMarkdownEscapes(m[2]);
        const words = listText.trim().split(/\s+/);
        const isSubheading = words.length >= 2 && words.length <= 7 && /^[А-ЯЁA-Z]/.test(listText.trim()) && !/[.!?:;,]$/.test(listText.trim());
        if (isSubheading) {
          content.push({ text: parseInlineMarkdownPdf(listText), style: 'h3', margin: [0, 8, 0, 2] });
        } else {
          content.push({ text: [{ text: `${m[1]}. ` }, ...parseInlineMarkdownPdf(listText)], style: 'listItem', margin: [15, 0, 0, 2] });
        }
      }
    } else {
      content.push({ text: parseInlineMarkdownPdf(cleanMarkdownEscapes(trimmed)), style: 'paragraph', margin: [0, 0, 0, 4] });
    }
  }
  return content;
}

// ═══ Text ↔ Biomarker interleaving ═══

export function splitTextByBiomarkers(text: string, biomarkerCodes: string[]): { type: "text" | "biomarker"; content: string; code?: string }[] {
  if (!text || biomarkerCodes.length === 0) return [{ type: "text", content: text }];

  const codePattern = biomarkerCodes.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:^[ \\t]*[-*•]\\s+)?(\\*\\*[^*]+\\((?:${codePattern})\\)\\*\\*:?)`, 'gm');

  const parts: { type: "text" | "biomarker"; content: string; code?: string }[] = [];
  let lastIndex = 0;
  const matches = [...text.matchAll(regex)];

  if (matches.length === 0) return [{ type: "text", content: text }];

  matches.forEach((match, idx) => {
    const matchStart = match.index!;
    if (matchStart > lastIndex) {
      const beforeText = text.slice(lastIndex, matchStart).trim();
      if (beforeText) parts.push({ type: "text", content: beforeText });
    }
    const nextMatch = matches[idx + 1];
    const sectionEnd = nextMatch ? nextMatch.index! : text.length;
    const codeMatch = match[1].match(/\(([A-Za-z0-9\-\/+]+)\)/);
    const code = codeMatch ? codeMatch[1] : undefined;
    const headerEnd = matchStart + match[0].length;
    const contentAfterHeader = text.slice(headerEnd, sectionEnd).trim();
    parts.push({ type: "biomarker", content: contentAfterHeader, code });
    lastIndex = sectionEnd;
  });

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", content: remaining });
  }

  return parts;
}

// ═══ Build interleaved PDF content for a category section ═══

export function buildInterleavedPdfSection(
  reportText: string,
  catBiomarkers: PdfBiomarkerData[],
  barWidth: number,
  barHeight: number,
  age: number,
  gender: 'male' | 'female',
): any[] {
  const pdfContent: any[] = [];
  const codes = catBiomarkers.map(b => b.code);
  const chunks = splitTextByBiomarkers(reportText, codes);

  let isFirstTextChunk = true;
  chunks.forEach(chunk => {
    if (chunk.type === 'text') {
      if (isFirstTextChunk) {
        isFirstTextChunk = false;
        // Extract "Краткое резюме" block for bordered box
        const summaryMatch = chunk.content.match(/##\s*Краткое резюме\s*\n([\s\S]*?)(?=\n##|\n🧬|\n🔬|$)/);
        if (summaryMatch) {
          const summaryParsed = parseMarkdownToPdfContent(summaryMatch[1].trim());
          pdfContent.push({
            table: { widths: ['*'], body: [[ { stack: summaryParsed, margin: [8, 8, 8, 8] } ]] },
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
          const restContent = chunk.content
            .replace(/##\s*Краткое резюме\s*\n[\s\S]*?(?=\n##|\n🧬|\n🔬|$)/, '')
            .trim();
          if (restContent) pdfContent.push(...parseMarkdownToPdfContent(restContent));
        } else {
          pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
        }
      } else {
        pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
      }
    } else {
      const bm = chunk.code ? catBiomarkers.find(b => b.code === chunk.code) : null;
      if (bm) {
        // Biomarker header with colored dot
        pdfContent.push({
          columns: [
            { canvas: [{ type: 'ellipse', x: 5, y: 6, r1: 4, r2: 4, color: STATUS_HEX[bm.status] || '#888' }], width: 14, height: 14 },
            { text: [{ text: bm.name, bold: true, fontSize: 11 }, { text: ` (${bm.code})`, fontSize: 9, color: '#888' }], width: '*', margin: [0, 1, 0, 0] },
            { text: [{ text: `${bm.value} ${bm.unit} `, bold: true, fontSize: 11, color: STATUS_HEX[bm.status] || '#333' }, { text: bm.statusLabel, fontSize: 9, color: STATUS_HEX[bm.status] || '#888' }], alignment: 'right', width: 'auto', margin: [0, 1, 0, 0] },
          ],
          columnGap: 4,
          margin: [0, 10, 0, 3],
        });
        // Range bar
        const bar = buildRangeBarCanvas(bm, barWidth, barHeight, age, gender);
        if (bar) pdfContent.push(bar);
      }
      // Biomarker description text
      if (chunk.content) {
        pdfContent.push(...parseMarkdownToPdfContent(chunk.content));
      }
    }
  });

  return pdfContent;
}

// ═══ Standard PDF styles ═══

export const PDF_STYLES = {
  header: { fontSize: 22, bold: true, color: '#000000' },
  date: { fontSize: 12, color: '#666666' },
  tocHeader: { fontSize: 16, bold: true, color: '#000000' },
  tocItem: { fontSize: 11, color: '#000000' },
  sectionHeader: { fontSize: 15, bold: true, decoration: 'underline', color: '#000000' },
  h1: { fontSize: 14, bold: true },
  h2: { fontSize: 13, bold: true },
  h3: { fontSize: 12, bold: true },
  paragraph: { fontSize: 10, lineHeight: 1.45, alignment: 'justify' },
  listItem: { fontSize: 10, lineHeight: 1.4 },
};
