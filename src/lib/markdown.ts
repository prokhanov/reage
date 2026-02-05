/**
 * Cleans markdown artifacts that shouldn't be displayed:
 * - Lone bullet points (•, *, -)
 * - Horizontal rules (---, ***, ___)
 * - Empty list markers
 * - Trailing asterisks used for emphasis that weren't closed
 */
export function cleanMarkdownArtifacts(text: string): string {
  // Pre-normalize common inline bullet artifacts produced by AI.
  // Example:
  // "... ассоциируется с: * Пункт 1. * Пункт 2." ->
  // "... ассоциируется с:\n\n- Пункт 1.\n- Пункт 2."
  // This makes markdown parsers treat them as real lists (UI + editor + PDF).
  let preprocessed = text
    .replace(/\r\n/g, "\n")
    // Start list after a colon/semicolon
    .replace(/([:;])\s*[•*]\s+/g, "$1\n\n- ")
    // Continue list after sentence endings
    .replace(/([.!?])\s*[•*]\s+/g, "$1\n- ")
    // Also handle bullets after a closing parenthesis
    .replace(/(\))\s*[•*]\s+/g, "$1\n- ");

  // Fix numbered lists that got split across lines:
  // "1.\nТекст" or "1.\n\n\nТекст" -> "1. Текст"
  preprocessed = preprocessed.replace(/(^|\n)(\d+\.)\s*\n+\s*(?=\S)/g, "$1$2 ");
  
  // Fix missing space after number: "13.Все" -> "13. Все"
  preprocessed = preprocessed.replace(/^(\s*\d+)\.(\S)/gm, '$1. $2');
  
  // Remove naked numbered markers without content (lines like "1." "2." "3." alone)
  preprocessed = preprocessed.replace(/^\d+\.\s*$/gm, "");
  
  // Detect numbered list items that are actually subheadings (short phrases without punctuation)
  // Pattern: "12. Системные взаимосвязи" -> "### Системные взаимосвязи"
  // Criteria: 2-7 words, starts with capital letter, no sentence-ending punctuation
  preprocessed = preprocessed.replace(
    /^(\d+)\.\s+([А-ЯЁA-Z][^\n]{3,60})$/gm,
    (match, num, text) => {
      const trimmedText = text.trim();
      const words = trimmedText.split(/\s+/);
      // Subheading: 2-7 words, no punctuation at end (. ! ? : ; ,)
      if (words.length >= 2 && words.length <= 7 && !/[.!?:;,]$/.test(trimmedText)) {
        return `### ${trimmedText}`;
      }
      return match;
    }
  );
  
  // Remove number from the item immediately after a subheading (make it a paragraph)
  preprocessed = preprocessed.replace(
    /(### [^\n]+\n\n)(\d+)\.\s+/g,
    '$1'
  );
  
  // Convert standalone bold lines to headers (these are sub-headers, not list items)
  // Pattern: line that is ONLY bold text (with optional colon), surrounded by empty lines or list items
  // "**Системные взаимосвязи**" or "**Заголовок:**" -> "### Системные взаимосвязи" or "### Заголовок:"
  preprocessed = preprocessed.replace(/^(\*\*[^*\n]+\*\*):?\s*$/gm, (match, boldText) => {
    // Extract text inside ** **
    const headerText = boldText.replace(/^\*\*/, '').replace(/\*\*$/, '');
    return `### ${headerText}`;
  });

  // Split into lines for processing
  const lines = preprocessed.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip horizontal rules (---, ***, ___) including with spaces (* * *, - - -)
    if (/^[-*_]{3,}$/.test(trimmed) || /^[\*\-_](\s+[\*\-_]){2,}$/.test(trimmed)) {
      cleanedLines.push('');
      continue;
    }
    
    // Skip lines that are just bullet artifacts (•, *, • * *, etc.)
    if (/^[•*\-\s]+$/.test(trimmed) && trimmed.length < 10) {
      continue;
    }
    
    // Skip empty list markers (just a bullet/dash with nothing after)
    if (/^[-*•]\s*$/.test(trimmed)) {
      continue;
    }
    
    // Remove list markers before bold section headers (e.g., "*   **Цинк**" or "    *   **Добавки...**")
    // BUT NOT if it's a numbered list like "1. **Header**"
    // This handles both top-level and nested list items with bold headers
    // Also ensure paragraph break by adding empty line before
    const isBoldHeader = /^\s*[*\-]\s+\*\*.+\*\*:?\s*$/.test(trimmed) || /^\s*[*\-]\s+\*\*[^*]+\*\*/.test(line);
    const isNumberedList = /^\s*\d+\.\s+/.test(trimmed);
    
    if (isBoldHeader && !isNumberedList) {
      // Add blank line before to ensure paragraph separation
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() !== '') {
        cleanedLines.push('');
      }
      // Remove leading whitespace and list marker, keep the bold text
      cleanedLines.push(line.replace(/^\s*[*\-]\s+/, ''));
      continue;
    }
    
    // If a lone number marker survived, keep it as-is (we already tried joining above).
    // Removing it can destroy legitimate lists coming from AI.
    // (Visual layout of lists is handled in Markdown renderer.)
    
    cleanedLines.push(line);
  }
  
  // Clean up trailing/leading asterisks that aren't proper emphasis
  let result = cleanedLines.join('\n');
  
  // Fix escaped periods in numbered lists (1\. → 1.)
  result = result.replace(/(\d+)\\\.(?=\s)/g, '$1.');
  
  // Remove trailing asterisk followed by period (e.g., "text.*.")
  result = result.replace(/\*\.(?=\s|$)/g, '.');
  
  // Remove lone asterisks at end of lines
  result = result.replace(/\s+\*\s*$/gm, '');
  
  // Clean up multiple consecutive empty lines
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
}

/**
 * Normalizes markdown text by converting single line breaks into double line breaks
 * for proper paragraph rendering, while preserving code blocks, lists, headings, etc.
 */
export function normalizeMarkdown(text: string): string {
  // First clean artifacts
  let processed = cleanMarkdownArtifacts(text);
  
  // Step 1: Hide code blocks temporarily
  const codeBlocks: string[] = [];
  processed = processed.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    codeBlocks.push(match);
    return placeholder;
  });

  // Step 2: Convert single newlines to double newlines
  // But skip lines that are:
  // - Already double newlines
  // - List items (-, *, +, 1., etc.)
  // - Headings (#)
  // - Blockquotes (>)
  // - Tables (|)
  processed = processed.replace(
    /([^\n])\n(?!\n|[-*+]\s|\d+\.\s|#{1,6}\s|>|\|)/g,
    '$1\n\n'
  );

  // Step 3: Restore code blocks
  codeBlocks.forEach((block, index) => {
    processed = processed.replace(`___CODE_BLOCK_${index}___`, block);
  });

  // Step 4: Collapse triple+ newlines to double newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');

  return processed;
}
