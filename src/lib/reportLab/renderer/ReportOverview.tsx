import type { ProkhanovReport } from "../types";
import { calcAge, getSummaryRecord } from "../parser";
import { ProseMarkdown } from "./ProseMarkdown";


interface Props {
  report: ProkhanovReport;
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
    <section className="rl-page">
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
        <div className="rl-conclusion">
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
  if (contentJson && typeof contentJson === "object") {
    const cj = contentJson as Record<string, unknown>;
    if (typeof cj.summary === "string") return cj.summary;
    if (typeof cj.content === "string") return cj.content;
    if (Array.isArray(cj.blocks)) {
      const parts: string[] = [];
      for (const b of cj.blocks as Array<Record<string, unknown>>) {
        if (typeof b.content === "string") parts.push(b.content);
      }
      if (parts.length) return parts.join("\n\n");
    }
  }
  return (fallback || "")
    .replace(/^Общее резюме\s*/i, "")
    .replace(/<!--[\s\S]*?(?:-->|→|\n)/g, "")
    .trim();
}
