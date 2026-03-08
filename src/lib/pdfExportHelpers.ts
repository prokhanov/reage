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

// Muted/softer versions for PDF card indicators
export const STATUS_HEX_MUTED: Record<string, string> = {
  critical: '#F87171',
  risk: '#FBBF24',
  acceptable: '#FDE047',
  optimal: '#4ADE80',
};

export const STATUS_HEX_BG: Record<string, string> = {
  critical: '#FEF2F2',
  risk: '#FFFBEB',
  acceptable: '#FEFCE8',
  optimal: '#F0FDF4',
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

  // Track blank lines for paragraph separation
  let prevWasBlank = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      prevWasBlank = true;
      content.push({ text: ' ', margin: [0, 0, 0, 0], fontSize: 1 });
      continue;
    }
    if (trimmed === '&nbsp;' || trimmed === '\u00A0') { prevWasBlank = true; content.push({ text: ' ', margin: [0, 3, 0, 3] }); continue; }
    if (trimmed.match(/^[-*_]{3,}$/) || trimmed.match(/^[\*\-_](\s+[\*\-_]){2,}$/)) { prevWasBlank = true; content.push({ text: ' ', margin: [0, 4, 0, 4] }); continue; }
    if (trimmed.match(/^[*•]+\s*$/)) continue;

    // Extra top margin if preceded by a blank line (paragraph break)
    const paraBreakMargin = prevWasBlank ? 6 : 0;
    prevWasBlank = false;

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
      content.push({ text: parseInlineMarkdownPdf(cleanMarkdownEscapes(trimmed)), style: 'paragraph', margin: [0, paraBreakMargin, 0, 4] });
    }
  }
  return content;
}

// ═══ Text ↔ Biomarker interleaving ═══

export function splitTextByBiomarkers(text: string, biomarkerCodes: string[]): { type: "text" | "biomarker"; content: string; code?: string }[] {
  if (!text || biomarkerCodes.length === 0) return [{ type: "text", content: text }];

  const codePattern = biomarkerCodes.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // Match biomarker headers in multiple formats:
  // 1. **Name (CODE)** or **Name (CODE)**:  (bold)
  // 2. ## Name (CODE) or ### Name (CODE)  (markdown headers)
  // 3. Optional leading list markers (- * •)
  const boldPattern = `(?:^[ \\t]*[-*•]\\s+)?\\*\\*[^*]+\\((?:${codePattern})\\)\\*\\*:?`;
  const headerPattern = `^#{2,4}\\s+[^\\n]*\\((?:${codePattern})\\)`;
  const regex = new RegExp(`(${boldPattern}|${headerPattern})`, 'gm');

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
    const codeMatch = match[0].match(/\(([A-Za-z0-9\-\/+_.]+)\)/);
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

// ═══ Interleaved rendering moved to anchorRenderer.tsx ═══
// Import buildInterleavedPdf / renderInterleavedWeb from "@/lib/anchorRenderer" directly

// ═══ Image → Base64 ═══

export async function imageToBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ═══ Cover page ═══

export function buildCoverPageContent(
  patientName: string,
  date: string,
  markerCount: number,
  logoBase64: string,
): any[] {
  // Compensate for page margins (40 left/right, 50 top/bottom) with negative margins
  // so cover content is visually centered on the full page
  return [
    { text: '', margin: [0, 130, 0, 0] },
    { image: logoBase64, width: 160, alignment: 'center', margin: [0, 0, 0, 30] },
    { text: 'Персональный отчёт', fontSize: 28, bold: true, color: '#FFFFFF', alignment: 'center', margin: [0, 0, 0, 6] },
    { text: 'здоровья и старения', fontSize: 20, color: '#FFFFFF', alignment: 'center', margin: [0, 0, 0, 40] },
    { text: patientName, fontSize: 18, bold: true, color: '#FFFFFF', alignment: 'center', margin: [0, 0, 0, 6] },
    { text: date, fontSize: 14, color: '#FFFFFF', alignment: 'center', margin: [0, 0, 0, 20] },
    { text: `${markerCount} биомаркеров`, fontSize: 13, color: '#FFFFFF', alignment: 'center' },
    { text: '', pageBreak: 'after' },
  ];
}

export function buildCoverBackground(bgBase64: string): (currentPage: number) => any[] {
  return (currentPage: number) => {
    if (currentPage === 1) {
      return [{ image: bgBase64, width: 595, height: 842, absolutePosition: { x: 0, y: 0 } }];
    }
    return [];
  };
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
