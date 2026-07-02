import ReactMarkdown from "react-markdown";
import { useReportEditor } from "../editor/ReportEditorContext";
import { EditableProse } from "../editor/EditableProse";

interface Props {
  markdown: string;
  className?: string;
  editableId?: string;
}

/**
 * Локальный, изолированный рендерер Markdown для отчёта.
 * Не использует глобальные prose-классы Tailwind — стили приходят из
 * reportLab/theme.css (класс `.rl-prose`).
 * Если передан `editableId` и контекст редактора в edit-режиме — рендерим Tiptap.
 */
export function ProseMarkdown({ markdown, className = "", editableId }: Props) {
  const ctx = useReportEditor();
  const clean = markdown
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?(?:-->|→|\n)/g, "")
    .replace(/\$\$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (ctx?.mode === "edit" && editableId) {
    return (
      <div className={`rl-prose ${className}`}>
        <EditableProse editableId={editableId} initialMarkdown={clean} />
      </div>
    );
  }

  if (!clean) return null;

  return (
    <div className={`rl-prose ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
        }}
      >
        {clean}
      </ReactMarkdown>
    </div>
  );
}
