import type { LabReport } from "../types";
import { getPatientDataRecord } from "../parser";
import { ProseMarkdown } from "./ProseMarkdown";

interface Props {
  report: LabReport;
}

const HTML_COMMENT_RE = /<!--[\s\S]*?(?:-->|→|\n)/g;

function cleanText(raw: string): string {
  return raw
    .replace(HTML_COMMENT_RE, "")
    .replace(/^\uFEFF?/, "")
    .replace(/^\s*#{1,6}\s*ДАННЫЕ\s+ПАЦИЕНТА\s*\n+/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function ReportPatientData({ report }: Props) {
  const row = getPatientDataRecord(report);
  if (!row) return null;
  const text = cleanText(row.text || "");
  if (!text) return null;

  return (
    <section className="rl-page rl-patient-data" data-section-id="patient">
      <div className="rl-eyebrow">Пациент</div>
      <h1 className="rl-h1">Данные пациента</h1>
      <ProseMarkdown markdown={text} editableId={`rec:${row.id}#body`} />
    </section>
  );
}
