/**
 * Unified anchor-based parser for AI-generated reports.
 * Parses <!-- anchor:TYPE DATA --> tags; falls back to legacy splitTextByBiomarkers.
 */
// ═══ Types ═══

export type AnchorBlock =
  | { type: 'text'; content: string }
  | { type: 'summary'; content: string }
  | { type: 'biomarker'; code: string; content: string }
  | { type: 'spacer' }
  | { type: 'pagebreak' };

// NOTE: Legacy `section` blocks (intro/insights/strengths/risks/aging/features/
// actions/connections/trends) полностью удалены. Эти секции никогда не
// рендерились в anchorRenderer.tsx и больше не упоминаются ни в одном
// промпте. Если в старых отчётах встретятся `<!-- anchor:NAME_start -->`,
// парсер просто пропустит их как обычный текст.

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
  if ((globalThis as any)?.process?.env?.ANCHOR_DEBUG) {
    const idx = processedText.indexOf('Гемоглобин (Hb)');
    // eslint-disable-next-line no-console
    console.log('[anchor] around Hb:', JSON.stringify(processedText.slice(Math.max(0, idx - 80), idx + 200)));
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
      blocks.push({ type: 'biomarker', code: data, content: stripLeadingBiomarkerName(content, data, codeToNames[data] || []) });
      lastIndex = endAfter;
    } else if (tag.endsWith('_start')) {
      // Legacy section markers (intro/insights/strengths/risks/aging/...)
      // больше не поддерживаются — пропускаем как обычный текст.
      lastIndex = tagEnd;
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

  // Standalone line:  "Имя (CODE)" — код в скобках ОБЯЗАТЕЛЕН.
  // Без кода ("Гемоглобин") строка может быть просто упоминанием в прозе,
  // что приводило к ложным якорям и пустым карточкам биомаркеров.
  const buildStandaloneBiomarkerLineRegex = (name: string, code: string, includeMarkdownHeaders = false) => {
    const escapedName = escapeRegex(name);
    const escapedCode = escapeRegex(code);
    const prefix = includeMarkdownHeaders ? '(?:#{2,4}\\s+|\\s*)' : '(?!#{1,6}\\s)(?!\\s*[-*•])\\s*';

    return new RegExp(
      `^${prefix}(?:${escapedName})\\s*\\(${escapedCode}\\)\\s*$`,
      'gm'
    );
  };

  // Leading paragraph:  "Имя (CODE) описание..." — код в скобках ОБЯЗАТЕЛЕН.
  const buildLeadingBiomarkerParagraphRegex = (name: string, code: string) => {
    const escapedName = escapeRegex(name);
    const escapedCode = escapeRegex(code);

    return new RegExp(
      `^(?!#{1,6}\\s)(?!\\s*[-*•])\\s*(?:${escapedName})\\s*\\(${escapedCode}\\)(?=\\s|$).+$`,
      'gm'
    );
  };

  // Pass 0: Plain-text biomarker lines — "Название" or exact "Название (КОД)" at the
  // start of a line/paragraph. Two-step strategy:
  //   1) Collect ALL candidate matches across all biomarkers in a SINGLE scan, so we
  //      know boundaries between consecutive biomarkers ahead of time.
  //   2) Sort by position, drop overlaps (longer names first wins), then inject anchors
  //      from last to first using next-marker.start (or next markdown H1/H2 header) as
  //      the section end.
  // This fixes two regressions:
  //   - The previous per-name loop only handled the FIRST occurrence of each name and
  //     used `result.length` as fallback section end, which made the first matched
  //     biomarker swallow ALL trailing text (including subsequent biomarkers and the
  //     closing summary). Visually this presented as "the last biomarker leaks" — its
  //     card kept absorbing the system's strengths/weaknesses paragraphs.
  //   - It could not detect a second biomarker that lives in the same paragraph form
  //     ("Имя (КОД) текст текст…") because `buildStandaloneBiomarkerLineRegex` requires
  //     a line that contains ONLY the name+code.
  if (nameToCode && Object.keys(nameToCode).length > 0) {
    const nameEntries = Object.entries(nameToCode)
      .sort((a, b) => b[0].length - a[0].length); // longer names first → wins on overlap

    type Hit = { start: number; end: number; code: string; nameLen: number };
    const hits: Hit[] = [];

    for (const [name, code] of nameEntries) {
      if (hasBiomarkerAnchor(result, code)) continue;

      const collect = (re: RegExp) => {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(result)) !== null) {
          hits.push({
            start: m.index!,
            end: m.index! + m[0].length,
            code,
            nameLen: name.length,
          });
          if (m[0].length === 0) re.lastIndex++; // safety
        }
      };

      collect(buildStandaloneBiomarkerLineRegex(name, code));
      collect(buildLeadingBiomarkerParagraphRegex(name, code));
    }

    if (hits.length > 0) {
      // Sort by position; for the same position prefer longer name (more specific).
      hits.sort((a, b) => a.start - b.start || b.nameLen - a.nameLen);

      // Detect the start of the system "summary" tail — после неё AI часто
      // упоминает биомаркеры в прозе ("Гемоглобин 145 г/л", "СОЭ 7 мм/ч"),
      // но это НЕ блоки биомаркеров. Игнорируем все хиты после этой границы.
      const summaryBoundaryRegex =
        /^\s*(?:#{1,3}\s+)?(?:Общая\s+оценка(?:\s+системы)?|Сильные\s+стороны|Дефициты\s+и\s+дисфункции|Заключение|Резюме|Итоги?|Выводы?)\b/im;
      const summaryMatch = summaryBoundaryRegex.exec(result);
      const summaryStart = summaryMatch ? summaryMatch.index! : result.length;

      // Drop overlapping hits and duplicates per code (keep the first occurrence).
      const seenCodes = new Set<string>();
      const filtered: Hit[] = [];
      let lastEnd = -1;
      for (const h of hits) {
        if (h.start >= summaryStart) continue; // hit внутри summary секции
        if (h.start < lastEnd) continue; // overlaps a previous hit
        if (seenCodes.has(h.code)) continue;
        filtered.push(h);
        seenCodes.add(h.code);
        lastEnd = h.end;
      }

      // End of biomarker zone = начало summary либо следующий H1/H2 заголовок.
      const findNextHeaderAfter = (pos: number): number => {
        const headerRegex = /^#{1,2}\s+/gm;
        headerRegex.lastIndex = pos;
        const m = headerRegex.exec(result);
        const headerPos = m ? m.index! : result.length;
        return Math.min(headerPos, summaryStart);
      };

      // Inject from last to first to keep earlier indices stable.
      const _dbg = (globalThis as any)?.process?.env?.ANCHOR_DEBUG;
      if (_dbg) {
        // eslint-disable-next-line no-console
        console.log('[anchor] filtered:', filtered.map(f => ({ code: f.code, start: f.start })), 'summaryStart:', summaryStart);
      }
      for (let i = filtered.length - 1; i >= 0; i--) {
        const cur = filtered[i];
        const next = filtered[i + 1];
        const sectionEnd = next ? next.start : findNextHeaderAfter(cur.end);

        // Sanity check: если контент <20 символов — не инжектим (это не блок).
        const candidateLen = (sectionEnd - cur.end);
        if (candidateLen < 20) continue;

        result =
          result.slice(0, sectionEnd) +
          `\n<!-- anchor:biomarker_end -->\n` +
          result.slice(sectionEnd);
        result =
          result.slice(0, cur.start) +
          `<!-- anchor:biomarker ${cur.code} -->\n` +
          result.slice(cur.end);
      }
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

  // Pass 2 (legacy auto-injection of intro/insights/strengths/... section
  // anchors по emoji в заголовках) удалён — эти секции больше не используются
  // ни промптами, ни рендерером.

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
