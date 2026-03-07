

## Problem

`MarkdownContent` receives raw markdown text with multiple blank lines (`\n\n\n`), but `react-markdown` collapses them per the Markdown spec. The custom paragraph renderer checks for `\u00A0` spacers, but those are only created by `cleanMarkdownArtifacts` — which is never called before passing content to `MarkdownContent`.

## Solution

Run `cleanMarkdownArtifacts` on the content inside `MarkdownContent` before passing it to `ReactMarkdown`. This converts triple+ newlines into `\u00A0` spacer paragraphs, which the existing custom `p` renderer already handles.

### Changes: `src/components/MarkdownContent.tsx`

- Import `cleanMarkdownArtifacts` from `@/lib/markdown`
- Apply it to `safeContent` before passing to `ReactMarkdown`:
  ```ts
  const processed = cleanMarkdownArtifacts(safeContent);
  ```
- Pass `processed` instead of `safeContent` to `<ReactMarkdown>`

One file, one line of import, one line of processing. Everything else (custom `p` renderer, PDF export) already works correctly.

