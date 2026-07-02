import { useEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Previewer } from "pagedjs";
import { ReportDocument } from "./ReportDocument";
import type { ProkhanovReport } from "../types";
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
  min-height: 261mm !important;
  height: 261mm !important;
  padding: 0 !important;
}
.pagedjs_pages { display: block; }
.pagedjs_page {
  background: var(--paper, #fbfaf7);
  margin: 0 auto 24px !important;
  box-shadow: 0 20px 45px -25px rgba(20, 36, 56, 0.35), 0 1px 0 rgba(0, 0, 0, 0.03);
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
  .pagedjs_page { margin: 0 !important; box-shadow: none !important; }
}
`;

interface Props {
  report: ProkhanovReport;
  height?: number | string;
  signalReady?: boolean;
  chrome?: "framed" | "plain";
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

export function PagedReportPreview({
  report,
  height = "85vh",
  signalReady,
  chrome = "framed",
}: Props) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const html = useMemo(
    () => renderToStaticMarkup(<ReportDocument report={report} />),
    [report],
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
  }, [html, signalReady]);

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
      <div ref={outputRef} className="rl-paged-output" />
    </div>
  );
}