import { useEffect } from "react";
import type { LabReport } from "../types";
import { buildBiomarkerIndex, calcAge } from "../parser";
import {
  getPatientEntry,
  getPrescriptionsEntry,
  getSectionEntries,
  getSummaryEntry,
  resolveDoc,
} from "../document";
import { ReportCover } from "./ReportCover";
import { ReportPatientData } from "./ReportPatientData";
import { ReportOverview } from "./ReportOverview";
import { ReportSection } from "./ReportSection";
import { ReportPrescriptions } from "./ReportPrescriptions";
import "../theme.css";
import { reportFontFaceCss, ensureReportFontsLoaded } from "../reportFonts";

interface Props {
  report: LabReport;
  /**
   * Если true — рендер объявит `window.__reportReady = true` после того,
   * как шрифты и все страницы отрисованы. Используется Playwright'ом.
   */
  signalReady?: boolean;
}

/**
 * ReportDocument — единственная точка входа в новый рендерер.
 * Отвечает за:
 *   - подключение изолированных стилей `theme.css` через глобальный CSS-класс `.reportlab`;
 *   - сборку последовательности страниц (обложка → резюме → 5 категорий → назначения);
 *   - сигнал готовности для Playwright.
 */
export function ReportDocument({ report, signalReady }: Props) {
  const biomarkerByCode = buildBiomarkerIndex(report);
  // Документ собирается парсером ровно один раз (при генерации). Здесь либо
  // берётся сохранённый, либо — для старых отчётов — собирается на лету.
  const doc = resolveDoc(report);
  const sectionEntries = getSectionEntries(doc);
  const gender = report.patient.gender;
  const age = calcAge(report.patient.birth_date, report.analysis.date);

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
    log("document_mounted", { categories: sectionEntries.length });
    let readyMarked = false;
    const mark = () => {
      if (cancelled || readyMarked) return;
      readyMarked = true;
      w.__reportReady = true;
      log("report_ready");
    };
    // Ждём именно наши bundled-шрифты: fonts.ready резолвится и тогда,
    // когда шрифт ещё не запрошен, а метрики fallback'а отличаются.
    const fontsReady = ensureReportFontsLoaded(document);
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
      {/* Локальные @font-face: одинаковые метрики текста на всех устройствах. */}
      <style dangerouslySetInnerHTML={{ __html: reportFontFaceCss }} />
      <ReportCover report={report} />
      <ReportPatientData report={report} entry={getPatientEntry(doc)} />
      <ReportOverview report={report} entry={getSummaryEntry(doc)} />
      {sectionEntries.map((entry, i) => (
        <ReportSection
          key={entry.id}
          index={i + 1}
          category={{ title: entry.title, blocks: entry.blocks }}
          biomarkerByCode={biomarkerByCode}
          gender={gender}
          age={age}
          recommendationId={entry.id}
        />
      ))}
      <ReportPrescriptions report={report} entry={getPrescriptionsEntry(doc)} />
    </div>
  );
}
