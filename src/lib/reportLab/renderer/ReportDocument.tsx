import { useEffect } from "react";
import type { ProkhanovReport } from "../types";
import { buildBiomarkerIndex, getCategoryRecords, parseCategory } from "../parser";
import { ReportCover } from "./ReportCover";
import { ReportPatientData } from "./ReportPatientData";
import { ReportOverview } from "./ReportOverview";
import { ReportSection } from "./ReportSection";
import { ReportPrescriptions } from "./ReportPrescriptions";
import type { CoverTemplate } from "../coverTemplate";
import "../theme.css";

interface Props {
  report: ProkhanovReport;
  /**
   * Если true — рендер объявит `window.__reportReady = true` после того,
   * как шрифты и все страницы отрисованы. Используется Playwright'ом.
   */
  signalReady?: boolean;
  coverTemplate?: CoverTemplate;
}

/**
 * ReportDocument — единственная точка входа в новый рендерер.
 * Отвечает за:
 *   - подключение изолированных стилей `theme.css` через глобальный CSS-класс `.reportlab`;
 *   - сборку последовательности страниц (обложка → резюме → 5 категорий → назначения);
 *   - сигнал готовности для Playwright.
 */
export function ReportDocument({ report, signalReady, coverTemplate }: Props) {
  const biomarkerByCode = buildBiomarkerIndex(report);
  const categoryRecords = getCategoryRecords(report);
  const gender = report.patient.gender;

  useEffect(() => {
    if (!signalReady) return;
    let cancelled = false;
    const w = window as unknown as {
      __reportReady?: boolean;
      __reportLog?: Array<{ t: number; step: string; extra?: unknown }>;
      __reportState?: string;
    };
    const log = (step: string, extra?: Record<string, unknown>) => {
      if (!w.__reportLog) w.__reportLog = [];
      w.__reportLog.push({ t: Date.now(), step, extra });
      w.__reportState = step;
      // eslint-disable-next-line no-console
      console.log(`[report-preview] ${step}`, extra ?? "");
    };
    log("document_mounted", { categories: categoryRecords.length });
    let readyMarked = false;
    const mark = () => {
      if (cancelled || readyMarked) return;
      readyMarked = true;
      w.__reportReady = true;
      log("report_ready");
    };
    const fontsReady =
      (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
        ?.ready ?? Promise.resolve();
    log("fonts_wait_start");
    fontsReady
      .then(() => {
        log("fonts_ready");
        mark();
        requestAnimationFrame(() => setTimeout(mark, 50));
      })
      .catch((e) => log("fonts_error", { message: e instanceof Error ? e.message : String(e) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalReady]);

  return (
    <div className="reportlab">
      <ReportCover report={report} template={coverTemplate} />
      <ReportPatientData report={report} />
      <ReportOverview report={report} />
      {categoryRecords.map((rec, i) => {
        const parsed = parseCategory(rec.type, rec.text || "");
        return (
          <ReportSection
            key={rec.id}
            index={i + 1}
            category={parsed}
            biomarkerByCode={biomarkerByCode}
            gender={gender}
            recommendationId={rec.id}
          />
        );
      })}
      <ReportPrescriptions report={report} />
    </div>
  );
}
