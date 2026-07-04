import ReactMarkdown from "react-markdown";
import { useReportEditor } from "../editor/ReportEditorContext";

interface Props {
  markdown: string;
  className?: string;
  editableId?: string;
}

/**
 * Локальный, изолированный рендерер Markdown для отчёта.
 * Не использует глобальные prose-классы Tailwind — стили приходят из
 * reportLab/theme.css (класс `.rl-prose`).
 *
 * Если передан `editableId` и контекст в режиме `edit` — оборачивает блок
 * в `<div data-editable-id>` и рендерит из драфта, если он есть. Сам блок
 * НЕ становится contentEditable здесь: это делает PagedReportPreview после
 * того, как paged.js завершит вёрстку страниц (иначе клонирование ломает
 * интерактив).
 */
export function ProseMarkdown({ markdown, className = "", editableId }: Props) {
  const ctx = useReportEditor();
  const source =
    (editableId && ctx?.getDraft(editableId)) ?? markdown ?? "";
  const clean = source
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?(?:-->|→|\n)/g, "")
    .replace(/\$\$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    // Всегда выделяем ключевые подзаголовки отчёта жирным,
    // даже если AI прислал их без разметки.
    .replace(
      /^[ \t]*(?:#{1,6}[ \t]+)?(Сильные\s+стороны(?:\s+организма)?|Дефициты\s+и\s+дисфункции|Интерпретация\s+биомаркеров|Общая\s+оценка(?:\s+системы[^\n]*)?)[ \t]*$/gim,
      "**$1**",
    )
    // Если строка уже была **bold** — избавляемся от двойных звёздочек.
    .replace(/\*{4}([^*\n]+)\*{4}/g, "**$1**")
    .trim();

  const editing = ctx?.mode === "edit" && !!editableId;

  if (!clean && !editing) return null;

  const wrapperProps = editableId
    ? { "data-editable-id": editableId }
    : {};

  return (
    <div
      className={`rl-prose${editing ? " rl-prose-editable" : ""} ${className}`}
      {...wrapperProps}
    >
      {clean ? (
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h2>{children}</h2>,
            p: ({ children, ...props }) => {
              const text = extractText(children).trim();
              if (text === "Интерпретация биомаркеров") {
                return (
                  <p
                    {...props}
                    className="rl-page-break-before rl-subheading"
                  >
                    {children}
                  </p>
                );
              }
              return <p {...props}>{children}</p>;
            },
          }}
        >
          {clean}
        </ReactMarkdown>
      ) : (
        // пустой параграф, чтобы редактор мог получить фокус
        <p>&nbsp;</p>
      )}
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return extractText((node as { props: { children?: React.ReactNode } }).props?.children);
  }
  return "";
}
