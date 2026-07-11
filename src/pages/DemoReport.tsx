/**
 * /demo-report
 *
 * Полностраничная демо-версия персонального отчёта Елены Ивановой,
 * рендерится тем же `ReportV2Editor`, что открывается из ЛК пациента
 * (кнопка «Открыть в новом окне»). Данные подставляются из статического
 * снапшота `exampleReport.json` — без обращения к БД, без auth-сессии.
 *
 * Страница закрыта от индексации (noindex,nofollow).
 *
 * ВАЖНО: при добавлении/переименовании роута обнови whitelist в
 * deploy/nginx/default.conf, иначе прямое открытие URL вернёт 404.
 */

import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { ReportV2Editor } from "@/components/reportV2/ReportV2Editor";
import { buildLabReportFromExample } from "@/lib/reportLab/buildFromExample";

export default function DemoReport() {
  const report = useMemo(() => buildLabReportFromExample(), []);
  const patientName =
    [report.patient.first_name, report.patient.last_name].filter(Boolean).join(" ") ||
    "Елена Иванова";

  return (
    <>
      <Helmet>
        <title>Демо-отчёт ReAge — {patientName}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta
          name="description"
          content="Демонстрационный персональный отчёт ReAge пациентки Елены Ивановой."
        />
      </Helmet>

      <div className="h-screen overflow-hidden bg-background p-0 md:p-6 flex flex-col">
        <ReportV2Editor
          analysisId={report.analysis.id}
          userId="demo"
          mode="view"
          compact
          hideDownload
          hideToolbar
          fullHeight
          initialReport={report}
        />
      </div>
    </>
  );
}
