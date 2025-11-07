/**
 * Normalizes markdown text by converting single line breaks into double line breaks
 * for proper paragraph rendering, while preserving code blocks, lists, headings, etc.
 */
export function normalizeMarkdown(text: string): string {
  // Step 1: Hide code blocks temporarily
  const codeBlocks: string[] = [];
  let processed = text.replace(/```[\s\S]*?```/g, (match) => {
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
