import type { LabReport } from "../types";
import { calcAge, getSummaryRecord } from "../parser";
import { ProseMarkdown } from "./ProseMarkdown";


interface Props {
  report: LabReport;
}

/**
 * Разворот с общим резюме: ключевые метрики + вводный нарратив от AI.
 */
export function ReportOverview({ report }: Props) {
  const { patient, analysis } = report;
  const summaryRow = getSummaryRecord(report);
  const summaryText = extractSummaryText(summaryRow?.content_json, summaryRow?.text);
  const age = calcAge(patient.birth_date, analysis.date);

  return (
    <section className="rl-page" data-section-id="overview">
      <h1 className="rl-h1" data-section-title="Общее резюме">
        Общее резюме
      </h1>

      <div className="rl-stats">
        <div className="rl-stat">
          <div className="label">Хронологический</div>
          <div className="value">{age ?? "—"}</div>
          <div className="caption">лет</div>
        </div>
        <div className="rl-stat">
          <div className="label">Биологический</div>
          <div className="value">
            {analysis.biological_age !== null
              ? analysis.biological_age.toFixed(1)
              : "—"}
          </div>
          <div className="caption">лет</div>
        </div>
        <div className="rl-stat">
          <div className="label">Индекс здоровья</div>
          <div className="value">
            {analysis.health_index !== null ? analysis.health_index : "—"}
          </div>
          <div className="caption">из 100</div>
        </div>
        <div className="rl-stat">
          <div className="label">Биомаркеры</div>
          <div className="value">{report.biomarkers.length}</div>
          <div className="caption">измерений</div>
        </div>
      </div>

      {(summaryText || summaryRow) && (
        <div className={`rl-conclusion${summaryRow ? " rl-conclusion-editable" : ""}`}>
          <ProseMarkdown
            markdown={summaryText}
            editableId={summaryRow ? `rec:${summaryRow.id}#body` : undefined}
          />
        </div>
      )}
    </section>
  );
}



function extractSummaryText(
  contentJson: unknown,
  fallback: string | null | undefined,
): string {
  const cleanup = (s: string) =>
    s
      .replace(/^Общее резюме\s*/i, "")
      .replace(/<!--[\s\S]*?(?:-->|→|\n)/g, "")
      .trim();

  if (contentJson && typeof contentJson === "object") {
    const cj = contentJson as Record<string, unknown>;
    if (typeof cj.summary === "string") return cleanup(cj.summary);
    if (typeof cj.content === "string") return cleanup(cj.content);
    if (Array.isArray(cj.blocks)) {
      // ВНИМАНИЕ: в content_json «Общего резюме» edge-функция кладёт весь отчёт
      // (section/text/biomarker/spacer по всем 5 системам). Склеивать всё
      // подряд нельзя — иначе в блок «Общее резюме» попадают заголовки и
      // интро каждой категории плоским текстом. Берём только настоящее резюме
      // (первый блок `summary` с overall scope, либо просто первый summary).
      const blocks = cj.blocks as Array<Record<string, unknown>>;
      const summaryBlock =
        blocks.find(
          (b) => b.type === "summary" && (b.scope === "overall" || b.scope === undefined),
        ) ?? blocks.find((b) => b.type === "summary");
      if (summaryBlock && typeof summaryBlock.content === "string") {
        return cleanup(summaryBlock.content);
      }
    }
  }
  return cleanup(fallback || "");
}
