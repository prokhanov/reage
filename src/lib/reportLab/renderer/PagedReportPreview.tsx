import { useEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Previewer } from "pagedjs";
import { ReportDocument } from "./ReportDocument";
import type { CoverOverrides, LabReport } from "../types";

import { StaticReportEditorProvider } from "../editor/ReportEditorContext";
import { htmlToMarkdown } from "../editor/markdown";
// eslint-disable-next-line import/no-unresolved
import themeCss from "../theme.css?raw";

const pagedCss = `
.reportlab { padding: 0 !important; background: transparent !important; min-height: 0 !important; }
.reportlab .rl-page {
  width: 210mm !important;
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
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.reportlab .rl-page.rl-cover > * {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
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
.rl-paged-shell-framed > .rl-paged-output > .pagedjs_pages {
  background: #e6e7ea !important;
}
.rl-paged-shell-framed .rl-paged-output {
  padding: 32px 0 !important;
}
.rl-paged-shell-framed > .rl-paged-output > .pagedjs_pages > .pagedjs_page {
  margin: 0 auto 48px !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.08),
    0 16px 36px -14px rgba(20, 36, 56, 0.38) !important;
}
.rl-paged-shell-framed > .rl-paged-output > .pagedjs_pages > .pagedjs_page:last-child {
  margin-bottom: 0 !important;
}
/* Fit-to-width для узких экранов (планшет/мобиль). Используем transform: scale
   вместо CSS zoom: zoom пересчитывает layout детей и в связке с
   .pagedjs_page { overflow: hidden } визуально режет содержимое (последние
   биомаркеры на странице). transform: scale — чисто визуальный, layout и
   пагинация остаются идентичными десктопу — как просмотр PDF. */
.rl-paged-shell-framed .rl-paged-output {
  --rl-fit-zoom: 1;
  margin-inline: auto;
}
.rl-paged-shell-framed > .rl-paged-output > .pagedjs_pages {
  transform: scale(var(--rl-fit-zoom, 1));
  transform-origin: top left;
  width: 210mm;
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
/* В режиме редактирования снимаем clip: если текст мгновенно вылез за низ
   листа до срабатывания debounced reflow, он должен оставаться видимым,
    а не «пропадать» под нижней границей страницы. Paged.js клипает не только
    .pagedjs_page: во время live-editing overflow может резаться на pagebox / area /
    page_content, поэтому снимаем clip со всей внутренней иерархии. */
.rl-paged-output[data-editing="1"] .pagedjs_pages,
.rl-paged-output[data-editing="1"] .pagedjs_page,
.rl-paged-output[data-editing="1"] .pagedjs_pagebox,
.rl-paged-output[data-editing="1"] .pagedjs_area,
.rl-paged-output[data-editing="1"] .pagedjs_page_content {
  overflow: visible !important;
}

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
.reportlab .rl-prose-editable p {
  orphans: 1 !important;
  widows: 1 !important;
  break-inside: auto !important;
  page-break-inside: auto !important;
}
.reportlab .rl-biomarker-editable,
.reportlab .rl-conclusion-editable,
.reportlab .rl-callout-editable {
  break-inside: auto !important;
  page-break-inside: auto !important;
}
`;

interface Props {
  report: LabReport;
  height?: number | string;
  signalReady?: boolean;
  chrome?: "framed" | "plain";
  editable?: boolean;
  drafts?: Record<string, string>;
  /** Стартовые overrides обложки (из БД / контекста). */
  coverOverrides?: CoverOverrides | null;
  /** Коллбэк на любое изменение обложки в инлайн-редакторе. */
  onCoverOverridesChange?: (next: CoverOverrides | null) => void;

  /**
   * Реалтайм-коллбэк: срабатывает и во время ввода (debounced),
   * и на blur — родитель должен положить markdown в drafts, что
   * триггерит перепагинацию.
   */
  onEditChange?: (editableId: string, markdown: string) => void;
  /** @deprecated используйте onEditChange — вызывается для совместимости на blur. */
  onEditBlur?: (editableId: string, markdown: string) => void;
}

type CaretSnapshot = {
  editableId: string;
  startOffset: number;
  endOffset: number;
  /** Viewport-Y каретки на момент снапшота — для компенсации скролла после reflow. */
  caretViewportY: number | null;
} | null;

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
    // Заставляем execCommand использовать теги (<b>/<i>) вместо inline-style,
    // иначе htmlToMarkdown теряет форматирование при ре-рендере.
    try {
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      /* ignore */
    }
    document.execCommand(cmd, false, val);
    // Проверить, изменилась ли высота: bold обычно нет — без reflow;
    // списки/H2/H3 — почти всегда да.
    const sched = (container as HTMLElement & {
      __rlScheduleReflow?: (force?: boolean) => void;
    }).__rlScheduleReflow;
    if (sched) sched(cmd !== "bold" && cmd !== "italic");
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
  coverOverrides = null,
  onCoverOverridesChange,
  onEditChange,
  onEditBlur,
}: Props) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const onEditChangeRef = useRef(onEditChange);
  onEditChangeRef.current = onEditChange;
  const onEditBlurRef = useRef(onEditBlur);
  onEditBlurRef.current = onEditBlur;
  const onCoverOverridesChangeRef = useRef(onCoverOverridesChange);
  onCoverOverridesChangeRef.current = onCoverOverridesChange;
  const coverOverridesRef = useRef<CoverOverrides | null>(coverOverrides);
  coverOverridesRef.current = coverOverrides;
  // Сериализация ребилдов: один Previewer одновременно, иначе Paged.js падает
  // на getBoundingClientRect.
  const runQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Ссылка на функцию перепагинации — вызывается из DOM-оверлея на overflow.
  const triggerReflowRef = useRef<(force?: boolean) => void>(() => {});

  const draftsSnapshot = drafts ?? {};
  const html = useMemo(
    () =>
      renderToStaticMarkup(
        <StaticReportEditorProvider
          drafts={draftsSnapshot}
          mode={editable ? "edit" : "view"}
          coverOverrides={coverOverrides}
        >
          <ReportDocument report={report} />
        </StaticReportEditorProvider>,
      ),
    [report, draftsSnapshot, editable, coverOverrides],
  );
  // Актуальный html доступен из imperative триггера reflow.
  const htmlRef = useRef(html);
  htmlRef.current = html;
  const editableRef = useRef(editable);
  editableRef.current = editable;
  const reportRef = useRef(report);
  reportRef.current = report;

  useEffect(() => {
    const output = outputRef.current;
    const source = sourceRef.current;
    if (!output || !source) return;
    const token = { cancelled: false };

    const build = async () => {
      if (token.cancelled) return;

      const isEditable = editableRef.current;

      // ВАЖНО: если в DOM уже есть contentEditable-правки, React state их
      // не видит (setDraft — no-op при наборе). Для ручного reflow НЕ гоняем
      // контент через html→markdown→ReactMarkdown: этот roundtrip склеивает
      // мягкие Enter'ы и поднимает текст обратно вверх. Вместо этого берём
      // live HTML из текущих editable-фрагментов и подставляем его в чистый
      // исходный HTML отчёта перед Paged.js.
      let currentHtml = htmlRef.current;
      if (isEditable && output.querySelector("[data-editable-id]")) {
        const liveHtmlDrafts = collectEditableHtmlDrafts(output);
        if (Object.keys(liveHtmlDrafts).length > 0) {
          currentHtml = applyEditableHtmlDrafts(currentHtml, liveHtmlDrafts);
        }
      }


      // Сохраняем caret/scroll ДО перепагинации.
      const hasExisting = !!output.querySelector(".pagedjs_pages");
      const caret: CaretSnapshot = hasExisting && isEditable ? saveCaret(output) : null;
      const scrollContainer = getScrollContainer(output);
      const scrollTop = scrollContainer?.scrollTop ?? 0;

      const content = document.createElement("template");
      content.innerHTML = currentHtml;

      // Paged.js нельзя запускать прямо в output со старыми страницами:
      // его resize/underflow observers могут смотреть на соседей из прошлого
      // прогона и падать/резать фрагменты. Считаем в невидимом scratch-слое,
      // а после успешного preview атомарно меняем старые страницы на новые.
      const oldPages = Array.from(output.querySelectorAll(".pagedjs_pages"));
      const scratch = document.createElement("div");
      scratch.setAttribute("aria-hidden", "true");
      scratch.style.cssText = [
        "position:absolute",
        "inset:0",
        "z-index:-1",
        "visibility:hidden",
        "pointer-events:none",
        "overflow:visible",
        "width:210mm",
        "min-width:210mm",
        "max-width:210mm",
      ].join(";");
      output.appendChild(scratch);

      try {
        await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
        if (token.cancelled) {
          scratch.remove();
          return;
        }
        const previewer = new Previewer({});
        const flow = await previewer.preview(
          content.content,
          [{ "reportLab.css": `${themeCss}\n${pagedCss}` }],
          scratch,
        );
        if (token.cancelled) {
          scratch.remove();
          return;
        }

        oldPages.forEach((el) => el.remove());
        Array.from(scratch.childNodes).forEach((node) => output.appendChild(node));
        scratch.remove();
        output.dataset.paged = "ready";

        if (isEditable) {
          installEditableOverlay(
            output,
            (id, md) => onEditChangeRef.current?.(id, md),
            (id, md) => {
              onEditBlurRef.current?.(id, md);
              onEditChangeRef.current?.(id, md);
            },
            (force) => triggerReflowRef.current(force),
          );
          installCoverInlineEditor(
            output,
            coverOverridesRef.current,
            (next) => onCoverOverridesChangeRef.current?.(next),
          );
          if (scrollContainer) scrollContainer.scrollTop = scrollTop;
          if (caret) {
            const newY = restoreCaret(output, caret);
            // Scroll-компенсация: если после reflow каретка визуально
            // ускакала — доскроллим на разницу, чтобы пользователь не
            // почувствовал прыжок (важно для клика Bold и вставки Enter).
            if (
              scrollContainer &&
              caret.caretViewportY != null &&
              newY != null
            ) {
              const dy = newY - caret.caretViewportY;
              if (Math.abs(dy) > 2) scrollContainer.scrollTop += dy;
            }
          }
        }
        // Метка «только что перепагинировали» — блокирует немедленный
        // повторный reflow (в новой раскладке overflow-check ещё может
        // ложно сработать на первом кадре).
        output.dataset.rlReflowedAt = String(Date.now());

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
        scratch.remove();
      }
    };

    // Imperative-триггер: доступен во время всей жизни useEffect.
    triggerReflowRef.current = (force = false) => {
      if (output.dataset.rlReflowPending === "1") return;
      // Cooldown: не даём обычному reflow пойти в цикл сразу после предыдущего.
      // Force используется при вводе у нижней границы листа — иначе символы
      // успевают уйти под clip до следующего спокойного debounce.
      const last = Number(output.dataset.rlReflowedAt || 0);
      if (!force && last && Date.now() - last < 600) return;
      output.dataset.rlReflowPending = "1";
      const run = async () => {
        try {
          await build();
        } finally {
          delete output.dataset.rlReflowPending;
        }
      };
      runQueueRef.current = runQueueRef.current.then(run, run);
    };

    // Публичный триггер для ручной кнопки «Обновить страницы» —
    // без cooldown, без проверок: пользователь явно попросил пересчёт.
    const w = window as typeof window & {
      __reportLabReflow?: () => void;
    };
    w.__reportLabReflow = () => {
      runQueueRef.current = runQueueRef.current.then(build, build);
    };

    // Сериализация через .then-цепочку: следующий build стартует только
    // ПОСЛЕ того как предыдущий завершил свой Previewer.preview.
    runQueueRef.current = runQueueRef.current.then(build, build);

    return () => {
      token.cancelled = true;
      triggerReflowRef.current = () => {};
      const ww = window as typeof window & { __reportLabReflow?: () => void };
      if (ww.__reportLabReflow === w.__reportLabReflow) delete ww.__reportLabReflow;
      // output НЕ чистим — swap следующего успешного билда его обновит.
    };
  }, [html, signalReady, editable]);


  // Fit-to-width на планшете/мобиле: страница A4 (~794px CSS-пикселей) не
  // влезает в контейнер. Применяем чисто визуальный transform: scale (CSS-переменная
  // --rl-fit-zoom), при этом layout и пагинация остаются идентичными десктопу —
  // как в PDF-viewer. Transform не меняет reserved-размер, поэтому вручную
  // задаём высоту .rl-paged-output = scaledHeight, чтобы вертикальный скролл
  // соответствовал видимому контенту, а горизонтальный не появлялся.
  const shellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chrome !== "framed") return;
    const shell = shellRef.current;
    const output = outputRef.current;
    if (!shell || !output) return;
    // A4 при 96dpi ≈ 794 CSS px. Реальную ширину берём из Paged.js DOM,
    // чтобы мобильный масштаб считался от того же листа, что и десктоп/PDF.
    const DEFAULT_PAGE_W = 794;
    let zoom = 1;

    const measurePages = () => {
      const pages = output.querySelector<HTMLElement>(".pagedjs_pages");
      if (!pages) return null;
      const firstPage = pages.querySelector<HTMLElement>(".pagedjs_page");
      const naturalW = pages.scrollWidth || firstPage?.scrollWidth || DEFAULT_PAGE_W;
      const naturalH = pages.scrollHeight || firstPage?.scrollHeight || 0;
      return { pages, naturalW, naturalH };
    };

    const applyOutputSize = () => {
      const measured = measurePages();
      if (!measured) return;
      const { naturalH, naturalW } = measured;
      // 64px = padding 32px сверху и снизу у .rl-paged-shell-framed .rl-paged-output
      output.style.width = `${Math.ceil(naturalW * zoom)}px`;
      output.style.height = `${Math.ceil(naturalH * zoom) + 64}px`;
    };

    const applyZoom = () => {
      const measured = measurePages();
      const w = shell.clientWidth || shell.getBoundingClientRect().width;
      if (!w) return;
      const naturalW = measured?.naturalW || DEFAULT_PAGE_W;
      zoom = Math.min(1, w / naturalW);
      output.style.setProperty("--rl-fit-zoom", zoom.toFixed(4));
      applyOutputSize();
    };

    let raf = 0;
    const timers: number[] = [];
    const scheduleZoom = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        applyZoom();
        // Paged.js и диалог могут стабилизировать ширину на следующем кадре.
        requestAnimationFrame(applyZoom);
      });
    };
    const scheduleStabilizedZoom = () => {
      scheduleZoom();
      [80, 250, 800].forEach((delay) => timers.push(window.setTimeout(applyZoom, delay)));
    };

    scheduleStabilizedZoom();
    const roShell = new ResizeObserver(scheduleStabilizedZoom);
    roShell.observe(shell);
    const roPages = new ResizeObserver(scheduleZoom);
    const existingPages = output.querySelector<HTMLElement>(".pagedjs_pages");
    if (existingPages) roPages.observe(existingPages);
    // MutationObserver — Paged.js подменяет .pagedjs_pages целиком.
    const mo = new MutationObserver(() => {
      const pages = output.querySelector<HTMLElement>(".pagedjs_pages");
      if (pages) roPages.observe(pages);
      // Важно пересчитать именно zoom, а не только высоту: при открытии в
      // мобильном диалоге первый замер иногда приходит из ещё нераскрытого
      // контейнера, из-за чего лист оставался в половину экрана.
      scheduleStabilizedZoom();
    });
    mo.observe(output, { childList: true, subtree: true });
    window.visualViewport?.addEventListener("resize", scheduleStabilizedZoom);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
      roShell.disconnect();
      roPages.disconnect();
      mo.disconnect();
      window.visualViewport?.removeEventListener("resize", scheduleStabilizedZoom);
    };
  }, [chrome]);

  return (
    <div
      ref={shellRef}
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
        data-editing={editable ? "1" : undefined}
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

  // Плоский offset считаем в plain-text по всем фрагментам этого id, в DOM-порядке.
  // (paged.js мог расщепить блок на 2+ страницы).
  const fragments = Array.from(
    output.querySelectorAll<HTMLElement>(`[data-editable-id="${id}"]`),
  );

  const offsetIn = (container: Node, containerOffset: number): number => {
    let acc = 0;
    for (const frag of fragments) {
      if (frag.contains(container) || frag === container) {
        const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          if (n === container) return acc + containerOffset;
          acc += (n.textContent || "").length;
        }
        // сам фрагмент — контейнер без текстовых потомков
        return acc + containerOffset;
      }
      acc += (frag.textContent || "").length;
    }
    return acc;
  };

  const startOffset = offsetIn(range.startContainer, range.startOffset);
  const endOffset = range.collapsed
    ? startOffset
    : offsetIn(range.endContainer, range.endOffset);

  // Y-координата каретки в viewport — для scroll-компенсации после reflow.
  let caretViewportY: number | null = null;
  try {
    const r = range.getClientRects()[0] ?? range.getBoundingClientRect();
    if (r && (r.top || r.bottom)) caretViewportY = r.top;
  } catch {
    /* ignore */
  }

  return { editableId: id, startOffset, endOffset, caretViewportY };
}

/** Возвращает viewport-Y каретки после restore — для scroll-компенсации. */
function restoreCaret(
  output: HTMLElement,
  caret: NonNullable<CaretSnapshot>,
): number | null {
  const fragments = Array.from(
    output.querySelectorAll<HTMLElement>(
      `[data-editable-id="${caret.editableId}"]`,
    ),
  );
  if (!fragments.length) return null;

  // Находит { node, offset } внутри списка фрагментов для плоского text-offset.
  const locate = (
    target: number,
  ): { node: Node; offset: number; frag: HTMLElement } | null => {
    let remaining = target;
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
          return { node: n, offset: Math.max(0, Math.min(remaining, len)), frag };
        }
        remaining -= len;
      }
      return { node: frag, offset: 0, frag };
    }
    const last = fragments[fragments.length - 1];
    return { node: last, offset: 0, frag: last };
  };

  const startLoc = locate(caret.startOffset);
  const endLoc =
    caret.endOffset !== caret.startOffset ? locate(caret.endOffset) : startLoc;
  if (!startLoc || !endLoc) return null;

  try {
    const range = document.createRange();
    range.setStart(startLoc.node, startLoc.offset);
    range.setEnd(endLoc.node, endLoc.offset);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    startLoc.frag.focus({ preventScroll: true });

    const r = range.getClientRects()[0] ?? range.getBoundingClientRect();
    return r && (r.top || r.bottom) ? r.top : null;
  } catch {
    return null;
  }
}

/**
 * Проверяет, требуется ли полная перепагинация Paged.js после live-правок
 * в contentEditable. Быстро, ~O(N страниц).
 *   overflow  — контент вылез за низ страницы;
 *   underfill — на предыдущей странице освободилось место (актуально при
 *               массовом удалении), и первый блок следующей мог бы подтянуться.
 */
function needsReflow(output: HTMLElement): boolean {
  const pages = Array.from(output.querySelectorAll<HTMLElement>(".pagedjs_page"));
  if (!pages.length) return false;

  for (const page of pages) {
    const box =
      page.querySelector<HTMLElement>(".pagedjs_page_content") ??
      page.querySelector<HTMLElement>(".pagedjs_area") ??
      page;
    const pageBottom = box.getBoundingClientRect().bottom;
    const descendants = Array.from(
      box.querySelectorAll<HTMLElement>(".reportlab [data-editable-id], .reportlab .rl-biomarker, .reportlab .rl-prose, .reportlab p, .reportlab li"),
    );
    for (const node of descendants) {
      const rects = Array.from(node.getClientRects());
      if (rects.some((rect) => rect.bottom - pageBottom > 1)) return true;
    }
    // scrollHeight больше не надёжен после overflow:visible на Paged.js-обёртках,
    // но оставляем как быстрый fallback для не-editable элементов.
    if (box.scrollHeight - box.clientHeight > 1) return true;
  }

  for (let i = 0; i < pages.length - 1; i++) {
    const content = pages[i].querySelector<HTMLElement>(".pagedjs_page_content");
    if (!content) continue;
    const free = content.clientHeight - content.scrollHeight;
    if (free <= 24) continue;
    const nextContent = pages[i + 1].querySelector<HTMLElement>(".pagedjs_page_content");
    const firstBlock = nextContent?.firstElementChild as HTMLElement | null;
    if (!firstBlock) continue;
    // если самый первый блок следующей страницы физически влез бы наверх — reflow
    if (firstBlock.offsetHeight + 8 <= free) return true;
  }
  return false;
}

function caretNearPageBottom(output: HTMLElement, thresholdPx = 72): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const activeRange = sel.getRangeAt(0);
  const range = activeRange.cloneRange();
  range.collapse(false);
  const rangeRect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  if (rangeRect && (rangeRect.top || rangeRect.bottom)) {
    const node = range.endContainer.nodeType === Node.ELEMENT_NODE
      ? (range.endContainer as Element)
      : range.endContainer.parentElement;
    const content = node?.closest(".pagedjs_page")?.querySelector<HTMLElement>(".pagedjs_page_content") ?? null;
    if (!content) return false;
    return content.getBoundingClientRect().bottom - rangeRect.bottom <= thresholdPx;
  }

  const restoreRange = activeRange.cloneRange();
  const marker = document.createElement("span");
  marker.setAttribute("data-rl-caret-probe", "");
  marker.style.cssText = "display:inline-block;width:0;height:1px;overflow:hidden;line-height:1px;";
  try {
    range.insertNode(marker);
    const page = marker.closest(".pagedjs_page");
    const content = page?.querySelector<HTMLElement>(".pagedjs_page_content") ?? null;
    if (!content) return false;
    const caretBottom = marker.getBoundingClientRect().bottom;
    const pageBottom = content.getBoundingClientRect().bottom;
    return pageBottom - caretBottom <= thresholdPx;
  } catch {
    return false;
  } finally {
    marker.remove();
    try {
      sel.removeAllRanges();
      sel.addRange(restoreRange);
    } catch {
      // selection могла стать невалидной после внешней мутации DOM — это не критично
    }
  }
}

function editableSelector(id: string): string {
  return `[data-editable-id="${id.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

function sanitizeEditableHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content
    .querySelectorAll<HTMLElement>("[data-ref], [data-split-from], [data-split-to], [data-previous-break-after]")
    .forEach((el) => {
      el.removeAttribute("data-ref");
      el.removeAttribute("data-split-from");
      el.removeAttribute("data-split-to");
      el.removeAttribute("data-previous-break-after");
    });
  return template.innerHTML;
}

function collectEditableHtmlDrafts(output: HTMLElement): Record<string, string> {
  const ids = new Set(
    Array.from(output.querySelectorAll<HTMLElement>("[data-editable-id]"))
      .map((el) => el.getAttribute("data-editable-id"))
      .filter((id): id is string => Boolean(id)),
  );
  const next: Record<string, string> = {};
  ids.forEach((id) => {
    const parts = Array.from(output.querySelectorAll<HTMLElement>(editableSelector(id)));
    next[id] = sanitizeEditableHtml(parts.map((p) => p.innerHTML).join(""));
  });
  return next;
}

function applyEditableHtmlDrafts(baseHtml: string, drafts: Record<string, string>): string {
  const template = document.createElement("template");
  template.innerHTML = baseHtml;
  Object.entries(drafts).forEach(([id, draftHtml]) => {
    template.content.querySelectorAll<HTMLElement>(editableSelector(id)).forEach((el) => {
      el.innerHTML = draftHtml || "<p></p>";
    });
  });
  return template.innerHTML;
}

/**
 * После того как paged.js отрисовал страницы, ищем блоки `[data-editable-id]`
 * и превращаем их в contentEditable. paged.js может расщепить один блок на две
 * страницы — тогда мы соединяем HTML всех фрагментов.
 *
 * onChange вызывается на blur (для совместимости — драфты собираются
 * из DOM в момент «Сохранить», см. window.__reportLabCollectDrafts).
 * Полная перепагинация Paged.js запускается ТОЛЬКО когда контент реально
 * вылез за границу страницы или наверху освободилось место — как в Google
 * Docs, набор без переполнения обходится без реф-лоу.
 */
function installEditableOverlay(
  output: HTMLElement,
  onChange: (id: string, markdown: string) => void,
  onBlur: (id: string, markdown: string) => void,
  triggerReflow: (force?: boolean) => void,
) {
  const toolbar = ensureToolbar(output);

  const collectMarkdown = (id: string): string => {
    const combined = collectEditableHtmlDrafts(output)[id] ?? "";
    return htmlToMarkdown(combined);
  };

  const collectAllMarkdown = (): Record<string, string> => {
    const ids = new Set(
      Array.from(output.querySelectorAll<HTMLElement>("[data-editable-id]"))
        .map((el) => el.getAttribute("data-editable-id"))
        .filter((id): id is string => Boolean(id)),
    );
    const next: Record<string, string> = {};
    ids.forEach((id) => {
      next[id] = collectMarkdown(id);
    });
    return next;
  };

  const w = window as typeof window & {
    __reportLabCollectDrafts?: () => Record<string, string>;
  };
  w.__reportLabCollectDrafts = collectAllMarkdown;

  // ─── Live-reflow: debounced авто-перепагинация при переполнении ─────────
  // Во время набора текста периодически проверяем, вылез ли контент за низ
  // страницы (или, наоборот, освободилось место сверху). Если да — запускаем
  // полный Paged.js reflow. Роунтдрип HTML→MD больше не теряет текст: build()
  // берёт live-HTML из contentEditable фрагментов и подставляет его напрямую
  // в исходный html до Paged.js (см. collectEditableHtmlDrafts выше).
  let reflowTimer: number | null = null;
  const scheduleReflowCheck = (force = false) => {
    if (reflowTimer != null) window.clearTimeout(reflowTimer);
    reflowTimer = window.setTimeout(() => {
      reflowTimer = null;
        if (force || needsReflow(output)) triggerReflow(force);
      }, force ? 80 : 180);
  };
  // Экспонируем для совместимости с bubble-toolbar (Bold/Italic/H2/H3).
  (output as HTMLElement & { __rlScheduleReflow?: (force?: boolean) => void }).
    __rlScheduleReflow = scheduleReflowCheck;

  const editables = Array.from(
    output.querySelectorAll<HTMLElement>("[data-editable-id]"),
  );
  editables.forEach((el) => {
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
    // Live-reflow: при вводе / вставке проверяем переполнение и, если нужно,
    // пересобираем страницы, чтобы текст не «улетал» за пределы листа.
    el.addEventListener("input", () => scheduleReflowCheck(caretNearPageBottom(output)));

    // Для insert-слотов между биомаркерами показываем плейсхолдер
    // «+ добавить текст здесь», пока пользователь не ввёл текст.
    if (el.classList.contains("rl-insert-slot")) {
      const updateEmpty = () => {
        const txt = (el.textContent || "").replace(/\u00A0/g, "").trim();
        if (!txt) el.setAttribute("data-empty", "");
        else el.removeAttribute("data-empty");
      };
      updateEmpty();
      el.addEventListener("input", updateEmpty);
      el.addEventListener("focus", () => {
        // Гарантируем наличие фокусируемого <p><br></p>, если пусто.
        if (!el.querySelector("p")) {
          const p = document.createElement("p");
          p.appendChild(document.createElement("br"));
          el.appendChild(p);
        }
      });
    }


    // ─── Enter → <br>, а не новый <p> ─────────────────────────────────────
    // Причина: у `.rl-prose p` заданы вертикальные margin. Дефолтное
    // поведение Chrome в contentEditable — на Enter расщепить текущий <p>
    // на два, каждый со своим margin. При нескольких Enter margin
    // накапливается, между курсором и следующим абзацем растёт «пустота»,
    // а Paged.js уже разложил страницы и не пересчитывает их на лету —
    // отсюда раздувание блока и слом пагинации.
    // insertLineBreak вставляет <br> в точке курсора: без margin,
    // предсказуемая высота, текст до/после остаётся в одном блоке.
    // Ctrl/Cmd+Enter оставляем на дефолтное поведение (новый абзац) на
    // случай, если пользователю нужен именно параграф.
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      try {
        document.execCommand("insertLineBreak");
      } catch {
        // fallback: ручная вставка <br>
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement("br");
        range.insertNode(br);
        // сдвигаем каретку за <br>
        const after = document.createRange();
        after.setStartAfter(br);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
      }
    });

    el.addEventListener("blur", () => {
      const id = el.getAttribute("data-editable-id");
      if (!id) return;
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
    const ww = window as typeof window & {
      __reportLabCollectDrafts?: () => Record<string, string>;
    };
    if (ww.__reportLabCollectDrafts === collectAllMarkdown) {
      delete ww.__reportLabCollectDrafts;
    }
  };
  const mo = new MutationObserver(() => {
    if (!output.querySelector(".pagedjs_pages")) {
      cleanup();
      mo.disconnect();
    }
  });
  mo.observe(output, { childList: true });
}

/**
 * Прямое редактирование обложки:
 *  - клик — выделение, drag — перемещение блока, dblclick — правка текста,
 *  - плавающая панель: B / I / цвет текста / выравнивание / A±/ стрелки / ↺,
 *  - постоянная панель обложки (сверху справа): фон обложки, сброс всего.
 *
 * Живёт целиком в DOM, без React state и без ре-пагинации.
 * Переменные ({{patientName}}, {{age}}, {{date}}, {{bioAge}},
 * {{healthIndex}}, {{issueNumber}}) в edit-режиме рендерятся как raw-токены
 * прямо в ReportCover, а в view-режиме — заменяются реальными значениями.
 */


// Дефолтные значения градиента — соответствуют theme.css (rl-cover).
const DEFAULT_C1 = "#1c2f47";
const DEFAULT_C2 = "#0f1b2d";
const DEFAULT_C3 = "#0a1220";
const DEFAULT_ANGLE = 160;

function installCoverInlineEditor(
  output: HTMLElement,
  initialOverrides: CoverOverrides | null,
  onChange: (next: CoverOverrides | null) => void,
) {
  const cover = output.querySelector<HTMLElement>("[data-cover-root]");
  if (!cover) return;

  const els = Array.from(
    cover.querySelectorAll<HTMLElement>("[data-cover-el]"),
  );
  if (!els.length) return;

  cover.style.position = "relative";

  // Подсветить существующие переменные в обложке — как «чипы-подсказки».
  cover.querySelectorAll<HTMLElement>("[data-var]").forEach((v) => {
    v.style.background = "rgba(217,195,150,0.22)";
    v.style.borderBottom = "1px dashed rgba(181,138,68,0.55)";
    v.style.padding = "0 2px";
    v.style.borderRadius = "2px";
  });

  // Помечаем элементы, у которых пользователь правил innerHTML.
  const htmlDirty = new Set<string>();

  // ─── Постоянная панель обложки (фон / сброс всего) ─────────────────────
  const bgBar = document.createElement("div");
  bgBar.className = "rl-cover-bgbar";
  bgBar.contentEditable = "false";
  bgBar.style.cssText = [
    "position:absolute",
    "top:8px",
    "right:8px",
    "z-index:55",
    "display:flex",
    "gap:6px",
    "align-items:center",
    "padding:6px 8px",
    "border-radius:8px",
    "background:rgba(20,24,32,0.85)",
    "color:#fff",
    "border:1px solid rgba(255,255,255,0.15)",
    "box-shadow:0 8px 24px -8px rgba(0,0,0,0.5)",
    "font:12px/1 Inter, system-ui, sans-serif",
    "user-select:none",
  ].join(";");

  const bgLabel = document.createElement("span");
  bgLabel.textContent = "Фон";
  bgLabel.style.opacity = "0.8";

  const initialBg = initialOverrides?.background ?? null;
  const state = {
    mode: (initialBg?.mode ?? "gradient") as "solid" | "gradient",
    c1: initialBg?.c1 ?? DEFAULT_C1,
    c2: initialBg?.c2 ?? DEFAULT_C2,
    c3: initialBg?.c3 ?? DEFAULT_C3,
    angle: initialBg?.angle ?? DEFAULT_ANGLE,
    solid: initialBg?.solid ?? DEFAULT_C2,
    hasBgOverride: !!initialBg,
  };

  // Собираем актуальный snapshot overrides из DOM и локального state.
  const collectOverrides = (): CoverOverrides | null => {
    const elements: NonNullable<CoverOverrides["elements"]> = {};
    for (const el of els) {
      const key = el.getAttribute("data-cover-el");
      if (!key) continue;
      const rec: NonNullable<CoverOverrides["elements"]>[string] = {};
      const s = el.style;
      if (s.transform) rec.transform = s.transform;
      if (s.fontSize) rec.fontSize = s.fontSize;
      if (s.color) rec.color = s.color;
      if (s.textAlign) rec.textAlign = s.textAlign;
      if (s.fontWeight) rec.fontWeight = s.fontWeight;
      if (s.fontStyle) rec.fontStyle = s.fontStyle;
      if (htmlDirty.has(key)) rec.html = el.innerHTML;
      if (Object.keys(rec).length > 0) elements[key] = rec;
    }
    const background = state.hasBgOverride
      ? state.mode === "solid"
        ? { mode: "solid" as const, solid: state.solid }
        : {
            mode: "gradient" as const,
            c1: state.c1,
            c2: state.c2,
            c3: state.c3,
            angle: state.angle,
          }
      : null;
    if (!background && Object.keys(elements).length === 0) return null;
    return { background, elements };
  };

  const emit = () => onChange(collectOverrides());

  const applyBg = () => {
    state.hasBgOverride = true;
    if (state.mode === "solid") {
      cover.style.background = state.solid;
    } else {
      cover.style.background = `linear-gradient(${state.angle}deg, ${state.c1} 0%, ${state.c2} 55%, ${state.c3} 100%)`;
    }
  };

  const mkColor = (val: string, onChange: (v: string) => void) => {
    const i = document.createElement("input");
    i.type = "color";
    i.value = val;
    i.style.cssText =
      "width:24px;height:22px;border:none;background:transparent;cursor:pointer;padding:0";
    i.addEventListener("input", () => {
      onChange(i.value);
      applyBg();
      emit();
    });
    return i;
  };

  const modeSel = document.createElement("select");
  modeSel.style.cssText =
    "background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 4px;font:inherit;cursor:pointer";
  modeSel.innerHTML =
    '<option value="gradient">Градиент</option><option value="solid">Однотонный</option>';
  modeSel.value = state.mode;
  const solidWrap = document.createElement("span");
  const gradWrap = document.createElement("span");
  gradWrap.style.cssText = `display:${state.mode === "gradient" ? "flex" : "none"};gap:4px;align-items:center`;
  solidWrap.style.cssText = `display:${state.mode === "solid" ? "flex" : "none"};gap:4px;align-items:center`;

  const c1 = mkColor(state.c1, (v) => (state.c1 = v));
  const c2 = mkColor(state.c2, (v) => (state.c2 = v));
  const c3 = mkColor(state.c3, (v) => (state.c3 = v));
  const angle = document.createElement("input");
  angle.type = "range";
  angle.min = "0";
  angle.max = "360";
  angle.value = String(state.angle);
  angle.title = "Угол градиента";
  angle.style.cssText = "width:70px;accent-color:#d9c396";
  angle.addEventListener("input", () => {
    state.angle = parseInt(angle.value, 10);
    applyBg();
    emit();
  });
  gradWrap.append(c1, c2, c3, angle);

  const solidC = mkColor(state.solid, (v) => (state.solid = v));
  solidWrap.append(solidC);

  modeSel.addEventListener("change", () => {
    state.mode = modeSel.value as "solid" | "gradient";
    gradWrap.style.display = state.mode === "gradient" ? "flex" : "none";
    solidWrap.style.display = state.mode === "solid" ? "flex" : "none";
    applyBg();
    emit();
  });

  const bgReset = document.createElement("button");
  bgReset.type = "button";
  bgReset.textContent = "Сброс";
  bgReset.title = "Сбросить фон и все правки блоков";
  bgReset.style.cssText = [
    "background:transparent",
    "color:#fff",
    "border:1px solid rgba(255,255,255,0.25)",
    "border-radius:5px",
    "padding:3px 8px",
    "cursor:pointer",
    "font:inherit",
  ].join(";");
  bgReset.addEventListener("mousedown", (e) => e.preventDefault());
  bgReset.addEventListener("click", () => {
    cover.style.background = "";
    state.mode = "gradient";
    state.c1 = DEFAULT_C1;
    state.c2 = DEFAULT_C2;
    state.c3 = DEFAULT_C3;
    state.angle = DEFAULT_ANGLE;
    state.solid = DEFAULT_C2;
    state.hasBgOverride = false;
    modeSel.value = "gradient";
    c1.value = DEFAULT_C1;
    c2.value = DEFAULT_C2;
    c3.value = DEFAULT_C3;
    angle.value = String(DEFAULT_ANGLE);
    solidC.value = DEFAULT_C2;
    gradWrap.style.display = "flex";
    solidWrap.style.display = "none";
    els.forEach((e) => {
      e.style.transform = "";
      e.style.fontSize = "";
      e.style.color = "";
      e.style.textAlign = "";
      e.style.fontWeight = "";
      e.style.fontStyle = "";
      const key = e.getAttribute("data-cover-el");
      if (key) htmlDirty.delete(key);
    });
    // Полный сброс: overrides снимаются, БД получит NULL.
    onChange(null);
  });

  bgBar.append(bgLabel, modeSel, gradWrap, solidWrap, bgReset);
  cover.appendChild(bgBar);

  // ─── Плавающая панель форматирования выбранного блока ──────────────────
  const panel = document.createElement("div");
  panel.className = "rl-cover-panel";
  panel.contentEditable = "false";
  panel.style.cssText = [
    "position:absolute",
    "z-index:60",
    "display:none",
    "flex-direction:column",
    "gap:4px",
    "padding:6px",
    "border-radius:8px",
    "background:rgba(20,24,32,0.94)",
    "color:#fff",
    "border:1px solid rgba(255,255,255,0.15)",
    "box-shadow:0 10px 28px -8px rgba(0,0,0,0.55)",
    "font:12px/1 Inter, system-ui, sans-serif",
    "backdrop-filter:blur(6px)",
    "user-select:none",
    "min-width:280px",
  ].join(";");
  cover.appendChild(panel);

  const rowStyle =
    "display:flex;gap:2px;align-items:center;flex-wrap:wrap";

  const row1 = document.createElement("div");
  row1.style.cssText = rowStyle;
  const row2 = document.createElement("div");
  row2.style.cssText = rowStyle;

  panel.append(row1, row2);



  let selected: HTMLElement | null = null;

  const mkBtn = (label: string, title: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.title = title;
    b.innerHTML = label;
    b.style.cssText = [
      "min-width:26px",
      "height:26px",
      "padding:0 7px",
      "border-radius:5px",
      "border:none",
      "background:transparent",
      "color:inherit",
      "cursor:pointer",
      "font:inherit",
    ].join(";");
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("mouseenter", () => (b.style.background = "rgba(255,255,255,0.12)"));
    b.addEventListener("mouseleave", () => (b.style.background = "transparent"));
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
    return b;
  };

  const currentPx = (el: HTMLElement) =>
    parseFloat(getComputedStyle(el).fontSize || "0") || 16;

  const setFontSize = (delta: number) => {
    if (!selected) return;
    const next = Math.max(6, currentPx(selected) + delta);
    selected.style.fontSize = `${next}px`;
    positionPanel();
    emit();
  };

  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    const t = selected.style.transform || "";
    const m = /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/.exec(t);
    const x = (m ? parseFloat(m[1]) : 0) + dx;
    const y = (m ? parseFloat(m[2]) : 0) + dy;
    selected.style.transform = `translate(${x}px, ${y}px)`;
    positionPanel();
    emit();
  };

  const resetEl = () => {
    if (!selected) return;
    selected.style.transform = "";
    selected.style.fontSize = "";
    selected.style.color = "";
    selected.style.textAlign = "";
    selected.style.fontWeight = "";
    selected.style.fontStyle = "";
    const key = selected.getAttribute("data-cover-el");
    if (key) htmlDirty.delete(key);
    positionPanel();
    emit();
  };

  const toggleStyle = (prop: "fontWeight" | "fontStyle" | "textAlign", on: string, off: string) => {
    if (!selected) return;
    const cur = selected.style[prop];
    selected.style[prop] = cur === on ? off : on;
    positionPanel();
    emit();
  };

  // Row 1: text formatting
  row1.append(
    mkBtn("<b>B</b>", "Полужирный", () => toggleStyle("fontWeight", "700", "")),
    mkBtn("<i>I</i>", "Курсив", () => toggleStyle("fontStyle", "italic", "")),
    mkBtn("⇤", "По левому краю", () => toggleStyle("textAlign", "left", "")),
    mkBtn("≡", "По центру", () => toggleStyle("textAlign", "center", "")),
    mkBtn("⇥", "По правому краю", () => toggleStyle("textAlign", "right", "")),
  );

  const colorLabel = document.createElement("span");
  colorLabel.textContent = "Цвет";
  colorLabel.style.cssText = "opacity:0.7;margin-left:4px;font-size:11px";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = "#16181d";
  colorInput.style.cssText =
    "width:26px;height:22px;border:none;background:transparent;cursor:pointer;padding:0";
  colorInput.addEventListener("mousedown", (e) => e.stopPropagation());
  colorInput.addEventListener("input", () => {
    if (!selected) return;
    selected.style.color = colorInput.value;
    emit();
  });
  row1.append(colorLabel, colorInput);

  // Row 2: size / position / text edit / reset
  row2.append(
    mkBtn("A−", "Уменьшить шрифт", () => setFontSize(-1)),
    mkBtn("A+", "Увеличить шрифт", () => setFontSize(1)),
    mkBtn("←", "Влево", () => nudge(-4, 0)),
    mkBtn("→", "Вправо", () => nudge(4, 0)),
    mkBtn("↑", "Вверх", () => nudge(0, -4)),
    mkBtn("↓", "Вниз", () => nudge(0, 4)),
    mkBtn("✎", "Редактировать текст (двойной клик)", () => {
      if (!selected) return;
      selected.contentEditable = "true";
      selected.focus();
    }),
    mkBtn("↺", "Сбросить блок", resetEl),
  );

  // Чипы переменных перенесены в верхний баннер (ModeBanner) — здесь их нет.


  // ─── Selection / position / drag ───────────────────────────────────────
  const positionPanel = () => {
    if (!selected) return;
    const cr = cover.getBoundingClientRect();
    const er = selected.getBoundingClientRect();
    const panelH = panel.offsetHeight || 96;
    let top = er.top - cr.top - panelH - 8;
    if (top < 4) top = er.bottom - cr.top + 8;
    let left = er.left - cr.left;
    const maxLeft = cover.clientWidth - panel.offsetWidth - 8;
    if (left > maxLeft) left = maxLeft;
    panel.style.top = `${Math.max(4, top)}px`;
    panel.style.left = `${Math.max(4, left)}px`;
    panel.style.display = "flex";
  };

  const syncColorInput = () => {
    if (!selected) return;
    const c = getComputedStyle(selected).color;
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    if (m) {
      const hex = "#" + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, "0")).join("");
      colorInput.value = hex;
    }
  };

  const clearSel = () => {
    if (selected) {
      selected.style.outline = "";
      selected.style.outlineOffset = "";
      if (selected.contentEditable === "true") selected.contentEditable = "false";
    }
    selected = null;
    panel.style.display = "none";
  };

  const select = (el: HTMLElement) => {
    if (selected === el) return;
    clearSel();
    selected = el;
    el.style.outline = "1.5px dashed rgba(217,195,150,0.9)";
    el.style.outlineOffset = "3px";
    syncColorInput();
    positionPanel();
  };

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startTX = 0;
  let startTY = 0;

  els.forEach((el) => {
    el.style.cursor = "move";
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      select(el);
    });
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (selected !== el) select(el);
      el.contentEditable = "true";
      el.focus();
    });
    // Отслеживаем ручную правку текста в contentEditable.
    el.addEventListener("input", () => {
      const key = el.getAttribute("data-cover-el");
      if (key) htmlDirty.add(key);
      emit();
    });
    el.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).isContentEditable) return;
      if (el.contentEditable === "true") return;
      e.preventDefault();
      select(el);
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const t = el.style.transform || "";
      const m = /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/.exec(t);
      startTX = m ? parseFloat(m[1]) : 0;
      startTY = m ? parseFloat(m[2]) : 0;
    });
  });

  const onMove = (e: MouseEvent) => {
    if (!dragging || !selected) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    selected.style.transform = `translate(${startTX + dx}px, ${startTY + dy}px)`;
    positionPanel();
  };
  const onUp = () => {
    if (dragging) emit();
    dragging = false;
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);

  const onCoverClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".rl-cover-panel")) return;
    if (t.closest(".rl-cover-bgbar")) return;
    if (t.closest("[data-cover-el]")) return;
    clearSel();
  };
  cover.addEventListener("click", onCoverClick);

  const mo = new MutationObserver(() => {
    if (!output.contains(cover)) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      mo.disconnect();
    }
  });
  mo.observe(output, { childList: true, subtree: true });
}
