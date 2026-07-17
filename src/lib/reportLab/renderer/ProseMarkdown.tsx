import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { useReportEditor } from "../editor/ReportEditorContext";

interface Props {
  markdown: string;
  className?: string;
  editableId?: string;
}

const SUMMARY_SUBHEADING_RE =
  "Сильные\\s+стороны(?:\\s+организма)?|Зоны\\s+внимания|Как\\s+проблемы\\s+связаны\\s+между\\s+собой|Дефициты\\s+и\\s+дисфункции|Интерпретация\\s+биомаркеров|Общая\\s+оценка(?:\\s+системы\\s+организма)?";

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
    .replace(/\u200B/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/<!--[\s\S]*?(?:-->|→|\n)/g, "")
    .replace(/\$\$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    // Фразы-«зачины» перед перечислениями в карточках биомаркеров должны
    // начинаться с новой строки (абзац до и абзац после), даже если AI
    // приклеил их к предыдущему предложению.
    .replace(
      /([^\n])\s+(Что\s+это\s+значит\s+для\s+вас|Это\s+может\s+проявляться)(\s*:)/gi,
      (_m, prev: string, phrase: string, colon: string) => `${prev}\n\n${phrase}${colon}\n`,
    )
    // Если ключевой подзаголовок склеен с последующим текстом в одном абзаце —
    // переносим его на отдельную строку, чтобы он стал самостоятельным заголовком.
    .replace(
      new RegExp(
        `(^|\\n)[ \\t]*(?:#{1,6}[ \\t]+|\\*{1,2})?(${SUMMARY_SUBHEADING_RE})(?:\\*{1,2})?[ \\t]*(?=[:—–-]|[А-ЯЁA-Z])`,
        "gi",
      ),
      (_m, nl: string, title: string) => `${nl}\n**${title.trim()}**\n\n`,
    )
    // Всегда выделяем ключевые подзаголовки отчёта жирным,
    // даже если AI прислал их без разметки.
    .replace(
      new RegExp(
        `^[ \\t]*(?:#{1,6}[ \\t]+)?(${SUMMARY_SUBHEADING_RE})[ \\t]*$`,
        "gim",
      ),
      "**$1**",
    )
    // Если строка уже была **bold** — избавляемся от двойных звёздочек.
    .replace(/\*{4}([^*\n]+)\*{4}/g, "**$1**")

    // Унификация заключительных фраз про раздел «Назначения»:
    //  1) заменяем слово «Назначения» → «Рекомендации»;
    //  2) выносим фразу в отдельный абзац и оборачиваем в курсив.
    //
    // Важно: раньше мы вставляли `*…*` inline, но из-за русских кавычек «»
    // и близко стоящих знаков препинания CommonMark не всегда мог найти
    // «правое обрамление» звёздочки → в отчёт попадали литеральные `*`.
    // Отдельный абзац снимает эту проблему полностью.
    //
    // Сначала снимаем существующие обёртки (`*…*`, `_…_`), чтобы не получить
    // случайный **bold** после нашей обёртки.
    .replace(
      /[*_]?\s*(Все\s+рекомендации\s+по\s+выявленным\s+показателям[^\n*_]*?вы\s+найд[её]-?\s*те\s+в\s+разделе\s+«?)(?:Назначения|Рекомендации)(»?\.?)\s*[*_]?/gi,
      (_m, pre: string, post: string) => {
        const clean = `${pre.replace(/-\s*/g, "")}Рекомендации${post || "."}`;
        return `\n\n*${clean.trim()}*\n\n`;
      },
    )
    .replace(
      /[*_]?\s*(Рекомендации\s+по\s+коррекции[^\n*_]*?вы\s+найд[её]-?\s*те\s+в\s+разделе\s+«?)(?:Назначения|Рекомендации)(»?\.?)\s*[*_]?/gi,
      (_m, pre: string, post: string) => {
        const clean = `${pre.replace(/найд[её]-\s*те/gi, "найдёте")}Рекомендации${post || "."}`;
        return `\n\n*${clean.trim()}*\n\n`;
      },
    )
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
