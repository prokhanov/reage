import ReactMarkdown from "react-markdown";

interface Props {
  markdown: string;
  className?: string;
}

/**
 * Локальный, изолированный рендерер Markdown для отчёта.
 * Не использует глобальные prose-классы Tailwind — стили приходят из
 * reportLab/theme.css (класс `.rl-prose`), чтобы отчёт был визуально
 * независим от темы приложения.
 */
export function ProseMarkdown({ markdown, className = "" }: Props) {
  const clean = markdown
    .replace(/\r\n/g, "\n")
    // Убираем любые HTML-комментарии-якоря (в т.ч. незакрытые типа `<!-- anchor:summary_start →`)
    .replace(/<!--[\s\S]*?(?:-->|→|\n)/g, "")
    .replace(/\$\$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!clean) return null;

  return (
    <div className={`rl-prose ${className}`}>
      <ReactMarkdown
        components={{
          // Отчёт рисует заголовки категорий сам — если в тексте попался h1,
          // понижаем его до h2, чтобы не было двух «title» на разделе.
          h1: ({ children }) => <h2>{children}</h2>,
        }}
      >
        {clean}
      </ReactMarkdown>
    </div>
  );
}
