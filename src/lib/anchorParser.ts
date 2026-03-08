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

// ═══ Main parser ═══

/**
 * Parse report text into AnchorBlock[].
 * If no anchors found, falls back to legacy regex-based splitting.
 */
export function parseAnchors(text: string, biomarkerCodes: string[]): AnchorBlock[] {
  if (!text) return [];

  // Detect anchor presence
  if (!text.includes('<!-- anchor:')) {
    return [{ type: 'text', content: text }];
  }

  const blocks: AnchorBlock[] = [];
  // Match all anchor tags: <!-- anchor:TYPE [DATA] -->
  const anchorRegex = /<!--\s*anchor:(\w+)(?:\s+([^\s>]+))?\s*-->/g;
  const matches = [...text.matchAll(anchorRegex)];

  if (matches.length === 0) {
    return [{ type: 'text', content: text }];
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
    const beforeText = text.slice(lastIndex, tagStart).trim();
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
      const endPos = findEndTagPos(text, 'summary_end', tagEnd);
      const content = text.slice(tagEnd, endPos.start).trim();
      if (content) blocks.push({ type: 'summary', content });
      lastIndex = endPos.end;
    } else if (tag === 'biomarker' && data) {
      const endPos = findEndTagPos(text, 'biomarker_end', tagEnd);
      const content = text.slice(tagEnd, endPos.start).trim();
      blocks.push({ type: 'biomarker', code: data, content });
      lastIndex = endPos.end;
    } else if (tag.endsWith('_start')) {
      const baseName = tag.replace('_start', '');
      if (SECTION_NAMES.has(baseName)) {
        const endPos = findEndTagPos(text, `${baseName}_end`, tagEnd);
        const content = text.slice(tagEnd, endPos.start).trim();
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
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    blocks.push({ type: 'text', content: remaining });
  }

  return blocks;
}

// ═══ Helpers ═══

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

