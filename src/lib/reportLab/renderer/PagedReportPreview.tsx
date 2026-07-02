import { useEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Previewer } from "pagedjs";
import { ReportDocument } from "./ReportDocument";
import type { ProkhanovReport } from "../types";
// eslint-disable-next-line import/no-unresolved
import themeCss from "../theme.css?raw";

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
          [{ "reportLab.css": themeCss }],
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