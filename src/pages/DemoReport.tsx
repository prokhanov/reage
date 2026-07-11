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
import { Link } from "react-router-dom";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportV2Editor } from "@/components/reportV2/ReportV2Editor";
import { buildLabReportFromExample } from "@/lib/reportLab/buildFromExample";

export default function DemoReport() {
  const report = useMemo(() => buildLabReportFromExample(), []);
  const patientName =
    [report.patient.first_name, report.patient.last_name].filter(Boolean).join(" ") ||
    "Елена Иванова";

  const sidebarFooter = (
    <Button asChild size="sm" className="w-full">
      <Link to="/#booking">
        <Send className="mr-2 h-4 w-4" />
        Оставить заявку
      </Link>
    </Button>
  );

  const bottomAction = (
    <Button asChild size="lg" className="shadow-lg">
      <Link to="/dashboard">
        Посмотреть демо-кабинет
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );

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
          sidebarFooter={sidebarFooter}
          bottomAction={bottomAction}
        />
      </div>
    </>
  );
}
