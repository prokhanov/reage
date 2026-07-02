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
