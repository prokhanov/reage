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

.reportlab { padding: 0 !important; background: transparent !important; min-height: 0 !important; }
.reportlab .rl-page {
  min-height: 0 !important;
  width: auto !important;
  box-shadow: none !important;
  margin: 0 !important;
  padding-left: 20mm !important;
  padding-right: 20mm !important;
  background: transparent !important;
}

.pagedjs_pages { display: block; }
.pagedjs_page {
  background: var(--paper);
  margin: 0 auto 24px !important;
  box-shadow: 0 20px 45px -25px rgba(20, 36, 56, 0.35),
              0 1px 0 rgba(0, 0, 0, 0.03);
}

@page {
  size: A4;
  margin: 20mm 0 16mm;
}

/* Эмуляция нативных колонтитулов Chromium через paged.js */
@page {
  @top-center {
    content: element(headerPoly);
    width: 100%;
  }
  @bottom-center {
    content: element(footerPoly);
    width: 100%;
  }
}

#header-poly { position: running(headerPoly); width: 100%; }
#footer-poly { position: running(footerPoly); width: 100%; }

.poly-head {
  width: 100%;
  padding: 6mm 18mm 0;
  box-sizing: border-box;
  font-family: -apple-system, "Inter", "Segoe UI", sans-serif;
  font-size: 8px;
  color: #7a7f8f;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  display: flex;
  justify-content: space-between;
}

.poly-foot {
  width: 100%;
  padding: 5mm 18mm 0;
  box-sizing: border-box;
  font-family: -apple-system, "Inter", "Segoe UI", sans-serif;
  font-size: 8px;
  color: #7a7f8f;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  display: flex;
  justify-content: space-between;
}

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

<!-- Элементы для paged.js running content -->
<div id="header-poly">
  <div class="poly-head">
    <span>ReAge · Персональный отчёт</span>
    <span>reage.life</span>
  </div>
</div>
<div id="footer-poly">
  <div class="poly-foot">
    <span>Отчёт <span class="pagedjs_page_number"></span> / <span class="pagedjs_total_pages"></span></span>
    <span>Биомаркеров 104 • Систем организма 5 • Врач Наталья Чезганова</span>
  </div>
</div>

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
