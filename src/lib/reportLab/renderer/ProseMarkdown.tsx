import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
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
    // Если ключевой подзаголовок склеен с последующим текстом в одном абзаце —
    // переносим его на отдельную строку, чтобы он стал самостоятельным заголовком.
    .replace(
      /(^|\n)[ \t]*(?:#{1,6}[ \t]+|\*{1,2})?(Сильные\s+стороны(?:\s+организма)?|Зоны\s+внимания|Как\s+проблемы\s+связаны\s+между\s+собой|Дефициты\s+и\s+дисфункции|Интерпретация\s+биомаркеров|Общая\s+оценка(?:\s+системы[^\n]*)?)(?:\*{1,2})?[ \t]*(?=\S)/gi,
      (_m, nl: string, title: string) => `${nl}\n**${title}**\n\n`,
    )
    // Всегда выделяем ключевые подзаголовки отчёта жирным,
    // даже если AI прислал их без разметки.
    .replace(
      /^[ \t]*(?:#{1,6}[ \t]+)?(Сильные\s+стороны(?:\s+организма)?|Зоны\s+внимания|Как\s+проблемы\s+связаны\s+между\s+собой|Дефициты\s+и\s+дисфункции|Интерпретация\s+биомаркеров|Общая\s+оценка(?:\s+системы[^\n]*)?)[ \t]*$/gim,
      "**$1**",
    )
    // Если строка уже была **bold** — избавляемся от двойных звёздочек.
    .replace(/\*{4}([^*\n]+)\*{4}/g, "**$1**")

    // Унификация заключительных фраз про раздел «Назначения»:
    //  1) заменяем слово «Назначения» → «Рекомендации»;
    //  2) оборачиваем всю фразу в курсив.
    // Работает и для карточки биомаркера («Рекомендации по коррекции…»),
    // и для финальной фразы системы («Все рекомендации по выявленным…»).
    .replace(
      /(^|\n)[ \t]*\**\s*(Все\s+рекомендации\s+по\s+выявленным\s+показателям[^\n]*?вы\s+найд[её]те\s+в\s+разделе\s+«?)(?:Назначения|Рекомендации)(»?[^\n]*?)\s*\**\s*(?=\n|$)/gi,
      (_m, nl: string, pre: string, post: string) => `${nl}\n*${pre}Рекомендации${post}*`,
    )
    .replace(
      /(^|\n)[ \t]*\**\s*(Рекомендации\s+по\s+коррекции[^\n]*?вы\s+найд[её]те\s+в\s+разделе\s+«?)(?:Назначения|Рекомендации)(»?[^\n]*?)\s*\**\s*(?=\n|$)/gi,
      (_m, nl: string, pre: string, post: string) => `${nl}\n*${pre}Рекомендации${post}*`,
    )
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
          remarkPlugins={[remarkBreaks]}
          components={{
            h1: ({ children }) => <h2>{children}</h2>,
            p: ({ children, ...props }) => {
              const text = extractText(children).trim();
              if (text === "Интерпретация биомаркеров") {
                return (
                  <p {...props} className="rl-subheading">
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
