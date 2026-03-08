/**
 * Unified anchor-based parser for AI-generated reports.
 * Parses <!-- anchor:TYPE DATA --> tags; falls back to legacy splitTextByBiomarkers.
 */
// ═══ Types ═══

export type AnchorBlock =
  | { type: 'text'; content: string }
  | { type: 'summary'; content: string }
  | { type: 'biomarker'; code: string; content: string }
  | { type: 'section'; name: string; content: string }
  | { type: 'spacer' }
  | { type: 'pagebreak' };

// Known paired section names (open_start → close_end)
const SECTION_NAMES = new Set([
  'intro', 'insights', 'strengths', 'risks', 'aging',
  'features', 'actions', 'trends', 'connections',
]);

// Emoji/keyword → section name mapping for auto-injection
const SECTION_HEADER_MAP: Array<{ pattern: RegExp; section: string }> = [
  { pattern: /🔬|интерпретация|расшифровка/i, section: 'insights' },
  { pattern: /✅|💪|сильные|в норме|оптимал/i, section: 'strengths' },
  { pattern: /⚠️|🔴|риск|отклонен|внимани/i, section: 'risks' },
  { pattern: /⏳|🕰|старени|биовозраст|aging/i, section: 'aging' },
  { pattern: /🧬|роль|взаимосвяз|систем/i, section: 'connections' },
  { pattern: /📋|резюме|итог|выводы|заключен/i, section: 'intro' },
  { pattern: /🎯|действ|рекоменд|план/i, section: 'actions' },
  { pattern: /📈|тренд|динамик/i, section: 'trends' },
  { pattern: /⭐|особенност|feature/i, section: 'features' },
];

// ═══ Main parser ═══

/**
 * Parse report text into AnchorBlock[].
 * If no anchors found, falls back to legacy regex-based splitting.
 */
export function parseAnchors(text: string, biomarkerCodes: string[]): AnchorBlock[] {
  if (!text) return [];

  // If no explicit anchors, auto-inject them from ## Name (CODE) headers
  let processedText = text;
  if (!text.includes('<!-- anchor:') && biomarkerCodes.length > 0) {
    processedText = autoInjectAnchors(text, biomarkerCodes);
  }

  // If still no anchors after injection, return as single text block
  if (!processedText.includes('<!-- anchor:')) {
    return [{ type: 'text', content: processedText }];
  }

  const blocks: AnchorBlock[] = [];
  // Match all anchor tags: <!-- anchor:TYPE [DATA] -->
  const anchorRegex = /<!--\s*anchor:(\w+)(?:\s+([^\s>]+))?\s*-->/g;
  const matches = [...processedText.matchAll(anchorRegex)];

  if (matches.length === 0) {
    return [{ type: 'text', content: processedText }];
  }

  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const tag = match[1];
    const data = match[2];
    const tagStart = match.index!;
    const tagEnd = tagStart + match[0].length;

    // Skip matches already consumed by a previous block
    if (tagStart < lastIndex) continue;

    // Text before this tag
    const beforeText = processedText.slice(lastIndex, tagStart).trim();
    if (beforeText) {
      blocks.push({ type: 'text', content: beforeText });
    }

    if (tag === 'spacer') {
      blocks.push({ type: 'spacer' });
      lastIndex = tagEnd;
    } else if (tag === 'pagebreak') {
      blocks.push({ type: 'pagebreak' });
      lastIndex = tagEnd;
    } else if (tag === 'summary_start') {
      const endPos = findEndTagPos(processedText, 'summary_end', tagEnd);
      const content = processedText.slice(tagEnd, endPos.start).trim();
      if (content) blocks.push({ type: 'summary', content });
      lastIndex = endPos.end;
    } else if (tag === 'biomarker' && data) {
      const endPos = findEndTagPos(processedText, 'biomarker_end', tagEnd);
      const content = processedText.slice(tagEnd, endPos.start).trim();
      blocks.push({ type: 'biomarker', code: data, content: stripLeadingBiomarkerName(content, data) });
      lastIndex = endPos.end;
    } else if (tag.endsWith('_start')) {
      const baseName = tag.replace('_start', '');
      if (SECTION_NAMES.has(baseName)) {
        const endPos = findEndTagPos(processedText, `${baseName}_end`, tagEnd);
        const content = processedText.slice(tagEnd, endPos.start).trim();
        if (content) blocks.push({ type: 'section', name: baseName, content });
        lastIndex = endPos.end;
      } else {
        lastIndex = tagEnd;
      }
    } else if (tag.endsWith('_end')) {
      // Orphaned end tag — skip
      lastIndex = tagEnd;
    } else {
      lastIndex = tagEnd;
    }
  }

  // Remaining text after last tag
  const remaining = processedText.slice(lastIndex).trim();
  if (remaining) {
    blocks.push({ type: 'text', content: remaining });
  }

  return blocks;
}

// ═══ Auto-inject anchors from ## Name (CODE) headers + section headers ═══

function autoInjectAnchors(text: string, biomarkerCodes: string[]): string {
  let result = text;

  // Pass 1: Biomarker headers — ## Название (CODE)
  if (biomarkerCodes.length > 0) {
    const codePattern = biomarkerCodes.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const headerRegex = new RegExp(
      `^(#{2,4})\\s+(.+?)\\s*\\((${codePattern})\\)\\s*$`,
      'gm'
    );

    const biomarkerMatches = [...result.matchAll(headerRegex)];
    // Process in reverse to preserve indices
    for (let i = biomarkerMatches.length - 1; i >= 0; i--) {
      const match = biomarkerMatches[i];
      const code = match[3];
      const headerStart = match.index!;
      const headerEnd = headerStart + match[0].length;

      const level = match[1].length;
      const nextHeaderRegex = new RegExp(`^#{1,${level}}\\s+`, 'gm');
      nextHeaderRegex.lastIndex = headerEnd;
      const nextMatch = nextHeaderRegex.exec(result);
      const sectionEnd = nextMatch ? nextMatch.index! : result.length;

      result = result.slice(0, sectionEnd) + `\n<!-- anchor:biomarker_end -->\n` + result.slice(sectionEnd);
      result = result.slice(0, headerStart) + `<!-- anchor:biomarker ${code} -->\n` + result.slice(headerEnd);
    }
  }

  // Pass 2: Section headers — ## 🧬 Заголовок (non-biomarker headers with emoji/keywords)
  // Only if we haven't already wrapped them as biomarkers
  const sectionHeaderRegex = /^(#{2,3})\s+(.+?)\s*$/gm;
  const sectionMatches = [...result.matchAll(sectionHeaderRegex)];
  const usedSections = new Set<string>();

  // Process in reverse to preserve indices
  for (let i = sectionMatches.length - 1; i >= 0; i--) {
    const match = sectionMatches[i];
    const headerStart = match.index!;
    const headerEnd = headerStart + match[0].length;
    const headerText = match[2];

    // Skip if already inside an anchor block
    const textBefore = result.slice(Math.max(0, headerStart - 100), headerStart);
    if (textBefore.includes('<!-- anchor:biomarker') || textBefore.includes('<!-- anchor:')) {
      // Check if this header is between a start and end anchor
      const lastAnchorStart = result.lastIndexOf('<!-- anchor:', headerStart);
      const lastAnchorEnd = result.lastIndexOf('_end -->', headerStart);
      if (lastAnchorStart > lastAnchorEnd) continue; // inside an open anchor block
    }

    // Find matching section name
    let sectionName: string | null = null;
    for (const { pattern, section } of SECTION_HEADER_MAP) {
      if (pattern.test(headerText) && !usedSections.has(section)) {
        sectionName = section;
        break;
      }
    }

    if (!sectionName) continue;
    usedSections.add(sectionName);

    // Find where section ends (next header of same or higher level, or end)
    const level = match[1].length;
    const nextHeaderRegex = new RegExp(`^#{1,${level}}\\s+`, 'gm');
    nextHeaderRegex.lastIndex = headerEnd;
    const nextMatch = nextHeaderRegex.exec(result);
    const sectionEnd = nextMatch ? nextMatch.index! : result.length;

    // Insert end anchor before next section
    result = result.slice(0, sectionEnd) + `\n<!-- anchor:${sectionName}_end -->\n` + result.slice(sectionEnd);
    // Insert start anchor before header (keep the header inside the section)
    result = result.slice(0, headerStart) + `<!-- anchor:${sectionName}_start -->\n` + result.slice(headerStart);
  }

  return result;
}

// ═══ Helpers ═══

/** Strip leading redundant biomarker name+code from content (e.g. "• **Название (CODE)** — ...") */
function stripLeadingBiomarkerName(content: string, code: string): string {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^[\\s•\\-*]*\\*{0,2}[^(\\n]*\\(${escaped}\\)\\*{0,2}\\s*[—–\\-:]?\\s*`, '');
  const cleaned = content.replace(re, '').trim();
  return cleaned || content;
}

function findEndTagPos(text: string, endTagName: string, afterPos: number): { start: number; end: number } {
  const pattern = new RegExp(`<!--\\s*anchor:${endTagName}\\s*-->`, 'g');
  pattern.lastIndex = afterPos;
  const m = pattern.exec(text);
  if (m) {
    return { start: m.index!, end: m.index! + m[0].length };
  }
  // No end tag found — use rest of text
  return { start: text.length, end: text.length };
}
