import { useEffect } from "react";
import type { ProkhanovReport } from "../types";
import { buildBiomarkerIndex, getCategoryRecords, parseCategory } from "../parser";
import { ReportCover } from "./ReportCover";
import { ReportOverview } from "./ReportOverview";
import { ReportSection } from "./ReportSection";
import { ReportPrescriptions } from "./ReportPrescriptions";
import "../theme.css";

interface Props {
  report: ProkhanovReport;
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
  const categoryRecords = getCategoryRecords(report);
  const gender = report.patient.gender;

  useEffect(() => {
    if (!signalReady) return;
    let cancelled = false;
    const mark = () => {
      if (cancelled) return;
      (window as unknown as { __reportReady?: boolean }).__reportReady = true;
    };
    const fontsReady =
      (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
        ?.ready ?? Promise.resolve();
    fontsReady.then(() => requestAnimationFrame(() => setTimeout(mark, 50)));
    return () => {
      cancelled = true;
    };
  }, [signalReady]);

  return (
    <div className="reportlab">
      <ReportCover report={report} />
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
          />
        );
      })}
      <ReportPrescriptions report={report} />
    </div>
  );
}
