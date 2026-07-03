import { useEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Previewer } from "pagedjs";
import { ReportDocument } from "./ReportDocument";
import type { ProkhanovReport } from "../types";
import { StaticReportEditorProvider } from "../editor/ReportEditorContext";
import { htmlToMarkdown } from "../editor/markdown";
// eslint-disable-next-line import/no-unresolved
import themeCss from "../theme.css?raw";

const pagedCss = `
.reportlab { padding: 0 !important; background: transparent !important; min-height: 0 !important; }
.reportlab .rl-page {
  width: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  border: none !important;
  break-before: page;
  page-break-before: always;
}
.reportlab .rl-page:first-child {
  break-before: auto;
  page-break-before: auto;
}
.reportlab .rl-page.rl-cover {
  min-height: 297mm !important;
  height: 297mm !important;
  padding: 0 !important;
}
@page :first {
  margin: 0 !important;
  @top-left { content: none !important; }
  @top-right { content: none !important; }
  @bottom-left { content: none !important; }
  @bottom-right { content: none !important; }
}

/* База для PDF/чистого рендера: листы идут встык, без экранных зазоров. */
.pagedjs_pages { display: block; background: #ffffff !important; }
.pagedjs_page {
  background: #ffffff !important;
  margin: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
  position: relative;
}

/* Экранный режим в админке: как Google Docs — серый холст и отдельные листы. */
.rl-paged-shell-framed {
  background: #e6e7ea !important;
  overflow: auto;
}
.rl-paged-shell-framed .rl-paged-output,
.rl-paged-shell-framed .pagedjs_pages {
  background: #e6e7ea !important;
}
.rl-paged-shell-framed .rl-paged-output {
  padding: 32px 0 !important;
}
.rl-paged-shell-framed .pagedjs_page {
  margin: 0 auto 48px !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.08),
    0 16px 36px -14px rgba(20, 36, 56, 0.38) !important;
}
.rl-paged-shell-framed .pagedjs_page:last-child {
  margin-bottom: 0 !important;
}
.pagedjs_pagebox,
.pagedjs_margin-top,
.pagedjs_margin-bottom,
.pagedjs_margin-left,
.pagedjs_margin-right,
.pagedjs_margin-top-left-corner-holder,
.pagedjs_margin-top-right-corner-holder,
.pagedjs_margin-bottom-left-corner-holder,
.pagedjs_margin-bottom-right-corner-holder {
  background: #ffffff;
}

/* Клипаем только внешний контейнер страницы (не area/pagebox/content — они
   используются паджером как fragmentainer для разбиения). Так живой overflow
   contentEditable во время редактирования не «улетает» в середину следующего
   листа, а сам чанкер продолжает корректно считать разбиение страниц. */
.pagedjs_page { overflow: hidden !important; }

/* Inline editor markers */
.reportlab [data-editable-id] {
  border-radius: 2px;
  transition: outline-color 0.15s ease, background-color 0.15s ease;
}
.reportlab [data-editable-id][contenteditable="true"] {
  outline: 1.5px dashed rgba(20, 36, 56, 0.28);
  outline-offset: 4px;
  /* В режиме редактирования блок должен свободно дробиться между страницами:
     иначе Enter переносит весь блок целиком и создаёт видимый скачок. */
  break-inside: auto !important;
  page-break-inside: auto !important;
}
.reportlab [data-editable-id][contenteditable="true"]:hover {
  outline-color: rgba(181, 138, 68, 0.55);
}
.reportlab [data-editable-id][contenteditable="true"]:focus {
  outline: 2px solid #b58a44;
  background: rgba(181, 138, 68, 0.06);
}
`;

interface Props {
  report: ProkhanovReport;
  height?: number | string;
  signalReady?: boolean;
  chrome?: "framed" | "plain";
  editable?: boolean;
  drafts?: Record<string, string>;
  coverTemplate?: CoverTemplate;
  /**
   * Реалтайм-коллбэк: срабатывает и во время ввода (debounced),
   * и на blur — родитель должен положить markdown в drafts, что
   * триггерит перепагинацию.
   */
  onEditChange?: (editableId: string, markdown: string) => void;
  /** @deprecated используйте onEditChange — вызывается для совместимости на blur. */
  onEditBlur?: (editableId: string, markdown: string) => void;
}

type CaretSnapshot = { editableId: string; offset: number } | null;

function emitReady(extra?: Record<string, unknown>) {
  const w = window as unknown as {
    __reportReady?: boolean;
    __reportLog?: Array<{ t: number; step: string; extra?: unknown }>;
    __reportState?: string;
  };
  if (!w.__reportLog) w.__reportLog = [];
  w.__reportReady = true;
  w.__reportState = "paged_ready";
  w.__reportLog.push({ t: Date.now(), step: "paged_ready", extra });
  // eslint-disable-next-line no-console
  console.log("[report-preview] paged_ready", extra ?? "");
}

/* ─── Плавающий toolbar редактирования (contentEditable + execCommand) ─── */
function ensureToolbar(container: HTMLElement): HTMLDivElement {
  let bar = container.querySelector<HTMLDivElement>(".rl-paged-toolbar");
  if (bar) return bar;
  bar = document.createElement("div");
  bar.className = "rl-paged-toolbar";
  bar.setAttribute("data-rl-toolbar", "1");
  bar.style.cssText = [
    "position:absolute",
    "z-index:50",
    "display:none",
    "gap:4px",
    "padding:4px",
    "border-radius:6px",
    "background:hsl(var(--popover, 0 0% 100%))",
    "color:hsl(var(--popover-foreground, 222 47% 11%))",
    "border:1px solid hsl(var(--border, 214 32% 91%))",
    "box-shadow:0 8px 24px -8px rgba(0,0,0,0.25)",
    "font-family:Inter, system-ui, sans-serif",
    "font-size:12px",
  ].join(";");

  const mkBtn = (label: string, title: string, action: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.title = title;
    b.innerHTML = label;
    b.style.cssText = [
      "min-width:28px",
      "padding:4px 8px",
      "border-radius:4px",
      "border:none",
      "background:transparent",
      "color:inherit",
      "cursor:pointer",
      "font:inherit",
    ].join(";");
    b.addEventListener("mousedown", (e) => {
      // не терять выделение
      e.preventDefault();
    });
    b.addEventListener("click", (e) => {
      e.preventDefault();
      action();
    });
    b.addEventListener("mouseenter", () => (b.style.background = "hsl(var(--muted, 210 40% 96%))"));
    b.addEventListener("mouseleave", () => (b.style.background = "transparent"));
    return b;
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
  };
  bar.append(
    mkBtn("<b>B</b>", "Полужирный", () => exec("bold")),
    mkBtn("<i>I</i>", "Курсив", () => exec("italic")),
    mkBtn("H2", "Заголовок H2", () => exec("formatBlock", "H2")),
    mkBtn("H3", "Заголовок H3", () => exec("formatBlock", "H3")),
    mkBtn("¶", "Обычный текст", () => exec("formatBlock", "P")),
    mkBtn("•", "Маркированный список", () => exec("insertUnorderedList")),
    mkBtn("1.", "Нумерованный список", () => exec("insertOrderedList")),
  );
  container.appendChild(bar);
  return bar;
}

function updateToolbarPosition(
  bar: HTMLDivElement,
  container: HTMLElement,
  targetRect: DOMRect,
) {
  const cRect = container.getBoundingClientRect();
  const top = targetRect.top - cRect.top + container.scrollTop - bar.offsetHeight - 8;
  const left =
    targetRect.left - cRect.left + container.scrollLeft + targetRect.width / 2 - bar.offsetWidth / 2;
  bar.style.top = `${Math.max(4, top)}px`;
  bar.style.left = `${Math.max(4, left)}px`;
  bar.style.display = "flex";
}

export function PagedReportPreview({
  report,
  height = "85vh",
  signalReady,
  chrome = "framed",
  editable = false,
  drafts,
  coverTemplate,
  onEditChange,
  onEditBlur,
}: Props) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const onEditChangeRef = useRef(onEditChange);
  onEditChangeRef.current = onEditChange;
  const onEditBlurRef = useRef(onEditBlur);
  onEditBlurRef.current = onEditBlur;
  // Сериализация ребилдов: один Previewer одновременно, иначе Paged.js падает
  // на getBoundingClientRect.
  const runQueueRef = useRef<Promise<void>>(Promise.resolve());

  const draftsSnapshot = drafts ?? {};
  const html = useMemo(
    () =>
      renderToStaticMarkup(
        <StaticReportEditorProvider
          drafts={draftsSnapshot}
          mode={editable ? "edit" : "view"}
        >
          <ReportDocument report={report} coverTemplate={coverTemplate} />
        </StaticReportEditorProvider>,
      ),
    [report, draftsSnapshot, editable, coverTemplate],
  );

  useEffect(() => {
    const output = outputRef.current;
    const source = sourceRef.current;
    if (!output || !source) return;
    const token = { cancelled: false };

    const build = async () => {
      if (token.cancelled) return;

      // Сохраняем caret/scroll ДО перепагинации.
      const hasExisting = !!output.querySelector(".pagedjs_pages");
      const caret: CaretSnapshot = hasExisting && editable ? saveCaret(output) : null;
      const scrollContainer = getScrollContainer(output);
      const scrollTop = scrollContainer?.scrollTop ?? 0;

      const content = document.createElement("template");
      content.innerHTML = html;

      // Запоминаем существующие страницы: их удалим ПОСЛЕ того, как
      // Paged.js допишет новые — никакого пустого промежутка на экране.
      const oldPages = Array.from(output.querySelectorAll(".pagedjs_pages"));

      try {
        await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
        if (token.cancelled) return;
        const previewer = new Previewer({});
        const flow = await previewer.preview(
          content.content,
          [{ "reportLab.css": `${themeCss}\n${pagedCss}` }],
          output,
        );
        if (token.cancelled) {
          // Rollback: удалим то, что этот build добавил, чтобы не копилось.
          Array.from(output.querySelectorAll(".pagedjs_pages"))
            .filter((el) => !oldPages.includes(el))
            .forEach((el) => el.remove());
          return;
        }

        oldPages.forEach((el) => el.remove());
        output.dataset.paged = "ready";

        if (editable) {
          installEditableOverlay(
            output,
            (id, md) => onEditChangeRef.current?.(id, md),
            (id, md) => {
              onEditBlurRef.current?.(id, md);
              onEditChangeRef.current?.(id, md);
            },
          );
          if (caret) restoreCaret(output, caret);
          if (scrollContainer) scrollContainer.scrollTop = scrollTop;
        }

        if (signalReady) {
          requestAnimationFrame(() => emitReady({ pages: flow.pages?.length ?? flow.total ?? null }));
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        (window as unknown as { __reportError?: unknown }).__reportError = {
          step: "paged_render_failed",
          message,
        };
        // eslint-disable-next-line no-console
        console.error("[report-preview] paged_render_failed", e);
      }
    };

    // Сериализация через .then-цепочку: следующий build стартует только
    // ПОСЛЕ того как предыдущий завершил свой Previewer.preview.
    runQueueRef.current = runQueueRef.current.then(build, build);



    return () => {
      token.cancelled = true;
      // output НЕ чистим — swap следующего успешного билда его обновит.
    };
  }, [html, signalReady, editable]);



  return (
    <div
      className={chrome === "framed" ? "rl-paged-shell rl-paged-shell-framed" : "rl-paged-shell"}
      style={
        chrome === "framed"
          ? { height: typeof height === "number" ? `${height}px` : height }
          : undefined
      }
    >
      <div ref={sourceRef} className="sr-only" aria-hidden="true" />
      <div
        ref={outputRef}
        className="rl-paged-output"
        style={{ position: "relative" }}
      />
    </div>
  );
}

// ─── Caret helpers ───────────────────────────────────────────────────────────

function getScrollContainer(el: HTMLElement): HTMLElement | null {
  let p: HTMLElement | null = el.parentElement;
  while (p) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY)) return p;
    p = p.parentElement;
  }
  return null;
}

function saveCaret(output: HTMLElement): CaretSnapshot {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const anchor =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;
  const el = anchor?.closest("[data-editable-id]") as HTMLElement | null;
  if (!el || !output.contains(el)) return null;
  const id = el.getAttribute("data-editable-id");
  if (!id) return null;

  // Считаем offset в plain-text по всем фрагментам этого id, в порядке DOM.
  const fragments = Array.from(
    output.querySelectorAll<HTMLElement>(`[data-editable-id="${id}"]`),
  );
  let offset = 0;
  for (const frag of fragments) {
    if (frag.contains(range.startContainer) || frag === range.startContainer) {
      const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        if (n === range.startContainer) {
          offset += range.startOffset;
          return { editableId: id, offset };
        }
        offset += (n.textContent || "").length;
      }
      // startContainer сам является фрагментом (нет текстовых потомков)
      return { editableId: id, offset: offset + range.startOffset };
    }
    offset += (frag.textContent || "").length;
  }
  return { editableId: id, offset };
}

function restoreCaret(output: HTMLElement, caret: NonNullable<CaretSnapshot>) {
  const fragments = Array.from(
    output.querySelectorAll<HTMLElement>(
      `[data-editable-id="${caret.editableId}"]`,
    ),
  );
  if (!fragments.length) return;

  let remaining = caret.offset;
  for (const frag of fragments) {
    const total = (frag.textContent || "").length;
    if (remaining > total) {
      remaining -= total;
      continue;
    }
    const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const len = (n.textContent || "").length;
      if (remaining <= len) {
        try {
          const range = document.createRange();
          range.setStart(n, Math.max(0, Math.min(remaining, len)));
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          frag.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
        return;
      }
      remaining -= len;
    }
    // fragment без текстовых узлов
    try {
      frag.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
    return;
  }
  // fallback — фокус в конец последнего фрагмента
  fragments[fragments.length - 1].focus({ preventScroll: true });
}

/**
 * После того как paged.js отрисовал страницы, ищем блоки `[data-editable-id]`
 * и превращаем их в contentEditable. paged.js может расщепить один блок на две
 * страницы — тогда мы соединяем HTML всех фрагментов.
 *
 * onChange вызывается на каждом input (debounced ~150ms) — родитель кладёт
 * markdown в drafts → React перерендеривает превью → Paged.js пересобирает
 * страницы, и весь текст ниже съезжает в реальном времени, как в Google Docs.
 * onBlur вызывается при потере фокуса (используем для финального сохранения).
 */
function installEditableOverlay(
  output: HTMLElement,
  onChange: (id: string, markdown: string) => void,
  onBlur: (id: string, markdown: string) => void,
) {
  const toolbar = ensureToolbar(output);

  const collectMarkdown = (id: string): string => {
    const parts = Array.from(
      output.querySelectorAll<HTMLElement>(`[data-editable-id="${id}"]`),
    );
    const combined = parts.map((p) => p.innerHTML).join("");
    return htmlToMarkdown(combined);
  };

  const editables = Array.from(
    output.querySelectorAll<HTMLElement>("[data-editable-id]"),
  );
  editables.forEach((el) => {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");

    let inputTimer: number | null = null;
    el.addEventListener("input", (event) => {
      const id = el.getAttribute("data-editable-id");
      if (!id) return;
      if (inputTimer !== null) window.clearTimeout(inputTimer);
      const inputType = (event as InputEvent).inputType;
      const delay = inputType === "insertParagraph" || inputType === "insertLineBreak" ? 0 : 150;
      inputTimer = window.setTimeout(() => {
        inputTimer = null;
        onChange(id, collectMarkdown(id));
      }, delay);
    });


    el.addEventListener("blur", () => {
      const id = el.getAttribute("data-editable-id");
      if (!id) return;
      if (inputTimer !== null) {
        window.clearTimeout(inputTimer);
        inputTimer = null;
      }
      onBlur(id, collectMarkdown(id));
      setTimeout(() => {
        if (!output.contains(document.activeElement)) {
          toolbar.style.display = "none";
        }
      }, 100);
    });
  });


  const showToolbar = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      // при курсоре без выделения — показать над активным элементом
      const active = document.activeElement as HTMLElement | null;
      if (active && active.hasAttribute("data-editable-id")) {
        const rect = active.getBoundingClientRect();
        updateToolbarPosition(toolbar, output, rect);
        return;
      }
      toolbar.style.display = "none";
      return;
    }
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer as Node;
    const el =
      container.nodeType === Node.ELEMENT_NODE
        ? (container as HTMLElement)
        : (container.parentElement as HTMLElement | null);
    const editable = el?.closest("[data-editable-id]") as HTMLElement | null;
    if (!editable || !output.contains(editable)) {
      toolbar.style.display = "none";
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      toolbar.style.display = "none";
      return;
    }
    updateToolbarPosition(toolbar, output, rect);
  };

  const onSelectionChange = () => {
    // throttle через rAF
    requestAnimationFrame(showToolbar);
  };
  document.addEventListener("selectionchange", onSelectionChange);
  // при клике вне зоны — прячем
  const onFocusIn = () => showToolbar();
  output.addEventListener("focusin", onFocusIn);

  // cleanup вешаем на сам output — при следующем ре-рендере innerHTML очистится
  // и слушатель на document перевесится заново
  const cleanup = () => {
    document.removeEventListener("selectionchange", onSelectionChange);
    output.removeEventListener("focusin", onFocusIn);
  };
  const mo = new MutationObserver(() => {
    if (!output.querySelector(".pagedjs_pages")) {
      cleanup();
      mo.disconnect();
    }
  });
  mo.observe(output, { childList: true });
}
