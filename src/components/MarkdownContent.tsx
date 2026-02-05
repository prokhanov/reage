import ReactMarkdown from 'react-markdown';
import { Children, isValidElement } from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  // Guard against accidental indented lines (tabs / 4+ spaces) that Markdown
  // interprets as code blocks. We only de-indent lines that start with bold
  // "headers" like "**2. ...:**".
  const safeContent = content
    .replace(/\r\n/g, "\n")
    .replace(/^(?:\t| {4,})(?=\*\*)/gm, "");

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
          p: ({ children }) => (
            <p className="mb-4 text-foreground leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-6 mb-4 space-y-2 text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => {
            const items = Children.toArray(children).filter((child) => {
              // Skip empty elements
              if (!isValidElement(child)) return false;
              const content = (child.props as any).children;
              // Check if there's actual content
              if (!content) return false;
              if (typeof content === 'string' && !content.trim()) return false;
              // Check for array of children (e.g., nested elements)
              if (Array.isArray(content)) {
                const hasContent = content.some((c) => {
                  if (typeof c === 'string') return c.trim().length > 0;
                  if (isValidElement(c)) return true;
                  return false;
                });
                if (!hasContent) return false;
              }
              return true;
            });
            
            return (
              <ol className="list-none pl-0 mb-4 space-y-3 text-foreground">
                {items.map((child, idx) => {
                  const itemContent = isValidElement(child) ? (child.props as any).children : child;
                  return (
                    <li key={idx} className="flex gap-3 items-start">
                      <span className="tabular-nums shrink-0 text-foreground select-text">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0 flex-1 [&_p]:m-0 [&_p]:inline [&_p]:leading-relaxed">
                        {itemContent}
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          },
          li: ({ children }) => (
            <li className="text-foreground [&_p]:m-0 [&_p]:inline [&_p]:leading-relaxed">
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
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
              {children}
            </pre>
          ),
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
