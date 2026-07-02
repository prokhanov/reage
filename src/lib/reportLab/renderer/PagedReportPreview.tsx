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
.pagedjs_pages { display: block; }
.pagedjs_page {
  background: #ffffff;
  margin: 0 auto !important;
  outline: none;
  box-shadow: none;
  position: relative;
}
.pagedjs_page + .pagedjs_page {
  margin-top: 32px !important;
}
.pagedjs_page + .pagedjs_page::before {
  content: "";
  position: absolute;
  top: -16px;
  left: 0;
  right: 0;
  border-top: 1px dashed #c8c8c8;
  pointer-events: none;
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
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
  body.report-pdf-printing .pagedjs_pages { display: block !important; }
  .pagedjs_page { margin: 0 !important; box-shadow: none !important; outline: none !important; }
}

/* Inline editor markers */
.reportlab [data-editable-id] {
  border-radius: 2px;
  transition: outline-color 0.15s ease, background-color 0.15s ease;
}
.reportlab [data-editable-id][contenteditable="true"] {
  outline: 1.5px dashed rgba(20, 36, 56, 0.28);
  outline-offset: 4px;
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
  onEditBlur?: (editableId: string, markdown: string) => void;
}

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
  onEditBlur,
}: Props) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const onEditBlurRef = useRef(onEditBlur);
  onEditBlurRef.current = onEditBlur;

  const draftsSnapshot = drafts ?? {};
  const html = useMemo(
    () =>
      renderToStaticMarkup(
        <StaticReportEditorProvider
          drafts={draftsSnapshot}
          mode={editable ? "edit" : "view"}
        >
          <ReportDocument report={report} />
        </StaticReportEditorProvider>,
      ),
    [report, draftsSnapshot, editable],
  );

  useEffect(() => {
    let cancelled = false;
    const output = outputRef.current;
    const source = sourceRef.current;
    if (!output || !source) return;

    output.innerHTML = "";
    const content = document.createElement("template");
    content.innerHTML = html;

    const run = async () => {
      try {
        await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
        if (cancelled) return;
        const previewer = new Previewer({});
        const flow = await previewer.preview(
          content.content,
          [{ "reportLab.css": `${themeCss}\n${pagedCss}` }],
          output,
        );
        if (cancelled) return;
        output.dataset.paged = "ready";

        if (editable) {
          installEditableOverlay(output, (id, mdParts) => {
            onEditBlurRef.current?.(id, mdParts);
          });
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
    void run();

    return () => {
      cancelled = true;
      output.innerHTML = "";
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

/**
 * После того как paged.js отрисовал страницы, ищем блоки `[data-editable-id]`
 * и превращаем их в contentEditable. paged.js может расщепить один блок на две
 * страницы — тогда мы соединяем HTML всех фрагментов при blur.
 */
function installEditableOverlay(
  output: HTMLElement,
  onBlur: (id: string, markdown: string) => void,
) {
  const toolbar = ensureToolbar(output);

  const editables = Array.from(
    output.querySelectorAll<HTMLElement>("[data-editable-id]"),
  );
  editables.forEach((el) => {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");

    el.addEventListener("blur", () => {
      const id = el.getAttribute("data-editable-id");
      if (!id) return;
      // собираем все фрагменты этого блока (paged.js мог разделить на 2 страницы)
      const parts = Array.from(
        output.querySelectorAll<HTMLElement>(`[data-editable-id="${id}"]`),
      );
      const combined = parts.map((p) => p.innerHTML).join("");
      const md = htmlToMarkdown(combined);
      onBlur(id, md);
      // прячем toolbar
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
