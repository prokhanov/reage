/**
 * ReportPdfView — просмотр серверного PDF отчёта.
 *
 *   • Пациент: pdf.js по blob (на <iframe> нельзя навесить Authorization,
 *     плюс iOS Safari плохо показывает PDF в iframe).
 *   • Персонал: <iframe> с signed URL из issue-report-pdf-url.
 */

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2 } from "lucide-react";
import { useReportPdf, type ReportPdfPersona } from "@/hooks/useReportPdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Props {
  analysisId: string;
  persona: ReportPdfPersona;
  className?: string;
}

export function PdfCanvas({ url }: { url: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";

    (async () => {
      try {
        const doc = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;
        const scale = Math.min(2, Math.max(1, (host.clientWidth || 800) / 595));
        for (let i = 1; i <= doc.numPages; i += 1) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: scale * 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.marginBottom = "16px";
          canvas.style.borderRadius = "6px";
          canvas.style.boxShadow = "0 2px 12px rgba(0,0,0,0.18)";
          host.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return <div className="p-6 text-sm text-destructive">Не удалось показать PDF: {error}</div>;
  }
  return <div ref={hostRef} className="mx-auto w-full max-w-[900px] p-4" />;
}

export function ReportPdfView({ analysisId, persona, className }: Props) {
  const { url, loading, updating, notReady, error } = useReportPdf(analysisId, persona);

  return (
    <div className={className}>
      {updating && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Готовится обновлённая версия отчёта — пока показана предыдущая
        </div>
      )}

      {loading && !url && (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаем отчёт…
        </div>
      )}

      {notReady && !url && (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Отчёт готовится к публикации. Обновите страницу через пару минут.
        </div>
      )}

      {error && !url && (
        <div className="p-10 text-center text-sm text-destructive">Не удалось открыть отчёт: {error}</div>
      )}

      {url && persona === "patient" && <PdfCanvas url={url} />}
      {url && persona === "staff" && (
        <iframe title="Отчёт (PDF)" src={url} className="h-[80vh] w-full rounded-md border border-border/60" />
      )}
    </div>
  );
}
