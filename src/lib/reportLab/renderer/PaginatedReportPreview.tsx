import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportDocument } from "./ReportDocument";
import type { ProkhanovReport } from "../types";
// eslint-disable-next-line import/no-unresolved
import themeCss from "../theme.css?raw";

interface Props {
  report: ProkhanovReport;
  /** Высота фрейма в пикселях. По умолчанию 85vh. */
  height?: number | string;
}

/**
 * Постраничный превью отчёта — рендерит ReportDocument в iframe,
 * подключает paged.js и получает разбиение на A4-страницы, максимально
 * близкое к тому, что генерирует Playwright для PDF.
 *
 * Живёт изолированно от основного превью: React-компонент сериализуется
 * в HTML один раз через renderToStaticMarkup и уходит в iframe как srcDoc.
 * Никаких React-эффектов внутри — только статичная разметка + paged.js.
 */
export function PaginatedReportPreview({ report, height = "85vh" }: Props) {
  const srcDoc = useMemo(() => {
    const html = renderToStaticMarkup(<ReportDocument report={report} />);
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<style>
${themeCss}
/* ─── Настройки под paged.js (только для превью) ─────────────────────── */
html, body { margin: 0; padding: 0; background: #d9d5cd; }
body { padding: 24px 0; }
/* Убираем экранную «эмуляцию листа» — paged.js сам создаёт .pagedjs_page */
.reportlab { padding: 0 !important; background: transparent !important; min-height: 0 !important; }
.reportlab .rl-page {
  min-height: 0 !important;
  width: auto !important;
  box-shadow: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}
.pagedjs_pages { display: block; }
.pagedjs_page {
  background: var(--paper);
  margin: 0 auto 24px !important;
  box-shadow: 0 20px 45px -25px rgba(20, 36, 56, 0.35),
              0 1px 0 rgba(0, 0, 0, 0.03);
}
.pagedjs_page.pagedjs_cover_page { background: transparent; }
@page { margin: 20mm 0 16mm; }
@page :first { margin: 20mm 0 16mm; }
/* Индикатор загрузки, пока paged.js ещё не отработал */
#paged-status {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  padding: 6px 12px; border-radius: 999px;
  background: rgba(20, 36, 56, 0.85); color: #f6f0e0;
  font: 500 12px/1 "Inter", system-ui, sans-serif;
  letter-spacing: 0.08em; text-transform: uppercase;
  z-index: 9999; transition: opacity .3s;
}
.pagedjs_pages ~ #paged-status { opacity: 0; pointer-events: none; }
</style>
</head><body>
<div id="paged-status">Разметка страниц…</div>
${html}
<script>
  window.PagedConfig = { auto: true };
</script>
<script src="https://unpkg.com/pagedjs@0.4.3/dist/paged.polyfill.js"></script>
</body></html>`;
  }, [report]);

  return (
    <iframe
      title="Постраничный превью отчёта"
      srcDoc={srcDoc}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        border: "1px solid hsl(var(--border))",
        borderRadius: 8,
        background: "#d9d5cd",
      }}
    />
  );
}
