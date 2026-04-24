import ReactMarkdown from 'react-markdown';
import { cleanMarkdownArtifacts } from '@/lib/markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  // Guard against accidental indented lines (tabs / 4+ spaces) that Markdown
  // interprets as code blocks. We only de-indent lines that start with bold
  // "headers" like "**2. ...:**".
  // Also strip leftover HTML anchor comments and stray ``` fences via cleanMarkdownArtifacts.
  // Strip leading indentation that Markdown would interpret as a code block.
  // Reports never contain real code, so flatten ALL indented lines (tabs or 4+ spaces)
  // and collapse runs of internal whitespace so AI's "aligned" text doesn't keep its
  // monospace look once we've stripped the indent.
  const safeContent = cleanMarkdownArtifacts(content)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      // Skip list items (their leading spaces are semantic)
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) return line;
      // De-indent any line that would otherwise become a code block
      const deindented = line.replace(/^(?:\t+| {4,})/, "");
      // Collapse runs of 2+ internal spaces (AI sometimes pads text to align columns)
      return deindented.replace(/ {2,}/g, " ");
    })
    .join("\n");

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-6 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2 mt-3 text-foreground">{children}</h4>
          ),
          p: ({ children }) => {
            // Only treat as spacer if children is literally a string that is empty/NBSP
            if (typeof children === 'string') {
              const text = children.trim();
              if (text === '\u00A0' || text === '') {
                return <div style={{ height: '1em' }} />;
              }
            }
            // Check for array with single NBSP string child
            if (Array.isArray(children) && children.length === 1 && typeof children[0] === 'string') {
              const text = children[0].trim();
              if (text === '\u00A0' || text === '') {
                return <div style={{ height: '1em' }} />;
              }
            }
            return <p className="mb-4 text-foreground leading-relaxed">{children}</p>;
          },
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-6 mb-4 space-y-2 text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-6 mb-4 space-y-2 text-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Render inline code as plain text (no monospace background)
          code: ({ children }) => (
            <span className="text-foreground">{children}</span>
          ),
          // Render code blocks as a normal paragraph (no monospace, no scroll, no background)
          pre: ({ children }) => (
            <div className="mb-4 text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {children}
            </div>
          ),
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
