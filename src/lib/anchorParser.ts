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

const LEGACY_BIOMARKER_OVERFLOW_MARKERS = [
  /^\s*`{3,}.*$/m,
  /^\s*["'` ]*`{3,}["'` ]*$/m,
  /^\s*\\?={3,}.*?={3,}\s*$/m,
  /<!--\s*anchor:\w+_(?:start|end)\s*-->/i,
  /^\s*(?:Сильные стороны организма|Дефициты и дисфункции|Зоны внимания|Системные взаимосвязи|Общая оценка системы организма|Итог по системе)\s*$/im,
  /^\s*#{1,6}\s*(?:Сильные стороны организма|Дефициты и дисфункции|Зоны внимания|Системные взаимосвязи|Общая оценка системы организма|Итог по системе)\s*$/im,
];

function splitLegacyBiomarkerOverflow(content: string): { biomarkerContent: string; overflowContent: string } {
  if (!content) return { biomarkerContent: '', overflowContent: '' };

  let splitIndex = -1;
  for (const pattern of LEGACY_BIOMARKER_OVERFLOW_MARKERS) {
    const match = pattern.exec(content);
    if (!match || match.index <= 0) continue;
    splitIndex = splitIndex === -1 ? match.index : Math.min(splitIndex, match.index);
  }

  if (splitIndex === -1) {
    return { biomarkerContent: content.trim(), overflowContent: '' };
  }

  return {
    biomarkerContent: content.slice(0, splitIndex).trim(),
    overflowContent: content.slice(splitIndex).replace(/^\s*<!--\s*anchor:\w+_(?:start|end)\s*-->\s*/gi, '').trim(),
  };
}

// ═══ Main parser ═══

/**
 * Parse report text into AnchorBlock[].
 * If no anchors found, falls back to legacy regex-based splitting.
 * @param nameToCode — optional map of biomarker name → code for plain-text matching
 */
/**
 * Normalize typographic artifacts that LLMs frequently introduce into HTML comments:
 * - en-dash (–) and em-dash (—) get auto-substituted for `--` by some models
 * - non-breaking spaces inside the comment payload
 * Restores `<!-- ... -->` form so the anchor regex can match.
 */
export function normalizeAnchorTypography(text: string): string {
  if (!text) return text;
  return text
    // Opening: `<!–`, `<!—`, `<!--`, with optional spaces
    .replace(/<\s*!\s*[-–—]{1,3}\s*(anchor:)/gi, '<!-- $1')
    // Closing: `–>`, `—>`, `-->`, even when preceded by stray spaces
    .replace(/(anchor:[^\n<>]*?)\s*[-–—]{1,3}\s*>/gi, '$1 -->')
    // Stray non-breaking spaces inside the payload
    .replace(/<!--\s*anchor:([^\n>]*?)-->/gi, (_m, body) => `<!-- anchor:${body.replace(/\u00A0/g, ' ').trim()} -->`);
}

export function parseAnchors(
  text: string,
  biomarkerCodes: string[],
  nameToCode?: Record<string, string>,
): AnchorBlock[] {
  if (!text) return [];

  // Normalize typographic dashes the AI may have inserted (–, —) back to `--`
  const normalized = normalizeAnchorTypography(text);

  // Always try to supplement missing biomarker anchors.
  // Real reports can contain a mixed state: some biomarker blocks are already anchored,
  // while later biomarkers are still plain text. If we only inject when there are zero
  // anchors in the whole report, the parser will render only the first anchored marker
  // and leave the rest as plain markdown with visible HTML comments.
  let processedText = normalized;
  if (biomarkerCodes.length > 0) {
    processedText = autoInjectAnchors(normalized, biomarkerCodes, nameToCode);
  }

  const codeToNames = Object.entries(nameToCode || {}).reduce((acc, [name, code]) => {
    if (!acc[code]) acc[code] = [];
    acc[code].push(name);
    return acc;
  }, {} as Record<string, string[]>);

  // If still no anchors after injection, return as single text block
  if (!processedText.includes('<!-- anchor:')) {
    return [{ type: 'text', content: processedText }];
  }

  const blocks: AnchorBlock[] = [];
  // Match all anchor tags: <!-- anchor:TYPE [DATA] -->
  const anchorRegex = /<!--\s*anchor:(\w+)(?:\s+([^\n]*?))?\s*-->/g;
  const matches = [...processedText.matchAll(anchorRegex)];

  if (matches.length === 0) {
    return [{ type: 'text', content: processedText }];
  }

  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const tag = match[1];
    const data = match[2]?.trim();
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
      // Find explicit `biomarker_end`, but also stop at the NEXT biomarker open
      // tag — many AI outputs forget the closing tag and would otherwise merge
      // multiple biomarkers into one card.
      const explicitEnd = findEndTagPos(processedText, 'biomarker_end', tagEnd);
      const nextOpenRegex = /<!--\s*anchor:biomarker\s+([^\n]*?)\s*-->/g;
      nextOpenRegex.lastIndex = tagEnd;
      const nextOpen = nextOpenRegex.exec(processedText);
      let endStart = explicitEnd.start;
      let endAfter = explicitEnd.end;
      if (nextOpen && nextOpen.index < explicitEnd.start) {
        endStart = nextOpen.index;
        endAfter = nextOpen.index; // do NOT consume the next open tag
      }
      const content = processedText.slice(tagEnd, endStart).trim();
      const normalizedContent = stripLeadingBiomarkerName(content, data, codeToNames[data] || []);
      const { biomarkerContent, overflowContent } = splitLegacyBiomarkerOverflow(normalizedContent);
      blocks.push({ type: 'biomarker', code: data, content: biomarkerContent });
      if (overflowContent) {
        blocks.push({ type: 'text', content: overflowContent });
      }
      lastIndex = endAfter;
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalize biomarker code so AI variants (Greek vs Latin, case, +/- modifiers) match DB codes. */
function normalizeBiomarkerCode(code: string): string {
  if (!code) return '';
  return code
    .toLowerCase()
    .trim()
    .replace(/α/g, 'a')
    .replace(/β/g, 'b')
    .replace(/γ/g, 'g')
    .replace(/δ/g, 'd')
    .replace(/μ/g, 'u')
    .replace(/[\s\-_+()]/g, '');
}

function hasBiomarkerAnchor(text: string, code: string): boolean {
  // Exact match (fast path)
  const exactRegex = new RegExp(`<!--\\s*anchor:biomarker\\s+${escapeRegex(code)}\\s*-->`, 'i');
  if (exactRegex.test(text)) return true;
  // Fallback: scan all anchors and compare normalized codes
  const target = normalizeBiomarkerCode(code);
  const anyAnchorRegex = /<!--\s*anchor:biomarker\s+([^\n>]+?)\s*-->/g;
  for (const match of text.matchAll(anyAnchorRegex)) {
    if (normalizeBiomarkerCode(match[1]) === target) return true;
  }
  return false;
}

function autoInjectAnchors(text: string, biomarkerCodes: string[], nameToCode?: Record<string, string>): string {
  let result = text;

  const buildStandaloneBiomarkerLineRegex = (name: string, code: string, includeMarkdownHeaders = false) => {
    const escapedName = escapeRegex(name);
    const escapedCode = escapeRegex(code);
    const prefix = includeMarkdownHeaders ? '(?:#{2,4}\\s+|\\s*)' : '(?!#{1,6}\\s)(?!\\s*[-*•])\\s*';

    return new RegExp(
      `^${prefix}(?:${escapedName}(?:\\s*\\(${escapedCode}\\))?)\\s*$`,
      'gm'
    );
  };

  const buildLeadingBiomarkerParagraphRegex = (name: string, code: string) => {
    const escapedName = escapeRegex(name);
    const escapedCode = escapeRegex(code);

    return new RegExp(
      `^(?!#{1,6}\\s)(?!\\s*[-*•])\\s*(?:${escapedName})(?:\\s*\\(${escapedCode}\\))?(?=\\s|$).+$`,
      'gm'
    );
  };

  // Pass 0: Plain-text biomarker lines — "Название" or exact "Название (КОД)" on a standalone line.
  // Use the exact code from DB instead of a generic parenthesis matcher, otherwise markers like
  // "Липопротеин (а) (Lp(a))" break because the code itself contains parentheses.
  if (nameToCode && Object.keys(nameToCode).length > 0) {
    const nameEntries = Object.entries(nameToCode)
      .sort((a, b) => b[0].length - a[0].length); // longer names first

    for (const [name, code] of nameEntries) {
      if (hasBiomarkerAnchor(result, code)) continue;
      const plainLineRegex = buildStandaloneBiomarkerLineRegex(name, code);
      const paragraphLineRegex = buildLeadingBiomarkerParagraphRegex(name, code);
      const match = plainLineRegex.exec(result) || paragraphLineRegex.exec(result);
      if (!match) continue;

      const lineStart = match.index!;
      const lineEnd = lineStart + match[0].length;

      // Find end of this biomarker section: next standalone biomarker name,
      // already-inserted biomarker anchor, or top-level markdown header.
      let sectionEnd = result.length;
      for (const [otherName, otherCode] of nameEntries) {
        if (otherName === name) continue;
        const nextRegex = buildStandaloneBiomarkerLineRegex(otherName, otherCode, true);
        nextRegex.lastIndex = lineEnd;
        const nextMatch = nextRegex.exec(result);
        if (nextMatch && nextMatch.index! < sectionEnd) {
          sectionEnd = nextMatch.index!;
        }
      }

      const nextAnchorRegex = /<!--\s*anchor:biomarker\s+([^\n]*?)\s*-->/g;
      nextAnchorRegex.lastIndex = lineEnd;
      const nextAnchor = nextAnchorRegex.exec(result);
      if (nextAnchor && nextAnchor.index! < sectionEnd) {
        sectionEnd = nextAnchor.index!;
      }

      const nextHeaderRegex = /^#{1,2}\s+/gm;
      nextHeaderRegex.lastIndex = lineEnd;
      const nh = nextHeaderRegex.exec(result);
      if (nh && nh.index! < sectionEnd) {
        sectionEnd = nh.index!;
      }

      // Inject anchors (process in one shot since we do one at a time)
      result = result.slice(0, sectionEnd) + `\n<!-- anchor:biomarker_end -->\n` + result.slice(sectionEnd);
      result = result.slice(0, lineStart) + `<!-- anchor:biomarker ${code} -->\n` + result.slice(lineEnd);
    }
  }

  // Pass 1: Biomarker markers — supports BOTH formats:
  //   (a) Markdown headers:  ## Название (CODE)  /  ### Название (CODE)
  //   (b) Bold list items:   - **Название (CODE)**  /  * **Название (CODE)** — ...
  if (biomarkerCodes.length > 0) {
    const codePattern = biomarkerCodes
      .filter(c => !hasBiomarkerAnchor(result, c))
      .map(c => escapeRegex(c)).join('|');

    if (codePattern) {
      const markerRegex = new RegExp(
        `^(?:(#{2,4})\\s+[^\\n]*?\\((${codePattern})\\)\\s*$|[ \\t]*[-*•]\\s+\\*\\*[^*\\n]*?\\((${codePattern})\\)\\*\\*[^\\n]*$)`,
        'gm'
      );

      const matches = [...result.matchAll(markerRegex)];
      if (matches.length > 0) {
        const markers = matches.map(m => {
          const isHeader = !!m[1];
          return {
            start: m.index!,
            end: m.index! + m[0].length,
            code: m[2] || m[3],
            isHeader,
            level: isHeader ? m[1].length : 99,
          };
        });

        for (let i = markers.length - 1; i >= 0; i--) {
          const cur = markers[i];
          const next = markers[i + 1];

          let sectionEnd: number;
          if (next) {
            sectionEnd = next.start;
          } else {
            const nextHeaderRegex = /^#{1,2}\s+/gm;
            nextHeaderRegex.lastIndex = cur.end;
            const nh = nextHeaderRegex.exec(result);
            sectionEnd = nh ? nh.index! : result.length;
          }

          result = result.slice(0, sectionEnd) + `\n<!-- anchor:biomarker_end -->\n` + result.slice(sectionEnd);
          if (cur.isHeader) {
            result = result.slice(0, cur.start) + `<!-- anchor:biomarker ${cur.code} -->\n` + result.slice(cur.end);
          } else {
            result = result.slice(0, cur.start) + `<!-- anchor:biomarker ${cur.code} -->\n` + result.slice(cur.start);
          }
        }
      }
    }
  }

  // Pass 2: Section headers — ## 🧬 Заголовок (non-biomarker headers with emoji/keywords)
  const sectionHeaderRegex = /^(#{2,3})\s+(.+?)\s*$/gm;
  const sectionMatches = [...result.matchAll(sectionHeaderRegex)];
  const usedSections = new Set<string>();

  for (let i = sectionMatches.length - 1; i >= 0; i--) {
    const match = sectionMatches[i];
    const headerStart = match.index!;
    const headerEnd = headerStart + match[0].length;
    const headerText = match[2];

    const textBefore = result.slice(Math.max(0, headerStart - 100), headerStart);
    if (textBefore.includes('<!-- anchor:biomarker') || textBefore.includes('<!-- anchor:')) {
      const lastAnchorStart = result.lastIndexOf('<!-- anchor:', headerStart);
      const lastAnchorEnd = result.lastIndexOf('_end -->', headerStart);
      if (lastAnchorStart > lastAnchorEnd) continue;
    }

    let sectionName: string | null = null;
    for (const { pattern, section } of SECTION_HEADER_MAP) {
      if (pattern.test(headerText) && !usedSections.has(section)) {
        sectionName = section;
        break;
      }
    }

    if (!sectionName) continue;
    usedSections.add(sectionName);

    const level = match[1].length;
    const nextHeaderRegex = new RegExp(`^#{1,${level}}\\s+`, 'gm');
    nextHeaderRegex.lastIndex = headerEnd;
    const nextMatch = nextHeaderRegex.exec(result);
    const sectionEnd = nextMatch ? nextMatch.index! : result.length;

    // Do not wrap biomarker anchors in a generic section block,
    // otherwise the parser will consume the whole range as plain text
    // and the colored biomarker cards / scales won't render.
    const sectionSlice = result.slice(headerEnd, sectionEnd);
    if (sectionSlice.includes('<!-- anchor:biomarker ')) {
      continue;
    }

    result = result.slice(0, sectionEnd) + `\n<!-- anchor:${sectionName}_end -->\n` + result.slice(sectionEnd);
    result = result.slice(0, headerStart) + `<!-- anchor:${sectionName}_start -->\n` + result.slice(headerStart);
  }

  return result;
}

// ═══ Helpers ═══

/** Strip leading redundant biomarker name+code from content (e.g. "• **Название (CODE)** — ...") */
function stripLeadingBiomarkerName(content: string, code: string, biomarkerNames: string[] = []): string {
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namePattern = biomarkerNames
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
    .join('|');

  const codeHeadingRe = new RegExp(`^[\\s•\\-*]*\\*{0,2}[^(\\n]*\\(${escapedCode}\\)\\*{0,2}\\s*[—–\\-:]?\\s*`, '');
  const nameHeadingRe = namePattern
    ? new RegExp(`^[\\s•\\-*]*\\*{0,2}(?:${namePattern})(?:\\s*\\(${escapedCode}\\))?\\*{0,2}\\s*[—–\\-:]?\\s*`, '')
    : null;

  const cleaned = content
    .replace(codeHeadingRe, '')
    .replace(nameHeadingRe ?? /$^/, '')
    .trim();
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
