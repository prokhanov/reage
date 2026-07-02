import type { ReportBiomarker } from "../types";
import { resolveStatus } from "../parser";
import { BiomarkerScale } from "./BiomarkerScale";
import { ProseMarkdown } from "./ProseMarkdown";

interface Props {
  biomarker: ReportBiomarker;
  commentary: string;
  gender: "male" | "female" | "other" | null;
  editableId?: string;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  "critical-low": { label: "Критически низкий", cls: "critical" },
  "warning-low": { label: "Понижен", cls: "warning" },
  "sub-optimal-low": { label: "Ниже оптимума", cls: "suboptimal" },
  "optimal": { label: "Оптимум", cls: "optimal" },
  "sub-optimal-high": { label: "Выше оптимума", cls: "suboptimal" },
  "warning-high": { label: "Повышен", cls: "warning" },
  "critical-high": { label: "Критически высокий", cls: "critical" },
};

export function BiomarkerCard({ biomarker, commentary, gender, editableId }: Props) {
  const status = resolveStatus(biomarker, gender);
  const s = STATUS_LABEL[status];
  const unit = biomarker.unit_override || biomarker.unit || "";
  const value = formatValue(biomarker.value);

  return (
    <div className="rl-biomarker">
      <div className="rl-bio-head">
        <div className="rl-bio-title">
          <h3 className="rl-bio-name">{biomarker.name}</h3>
          <div className="rl-bio-code">{biomarker.code.toUpperCase()}</div>
          <div className={`rl-bio-status ${s.cls}`}>
            <span className="dot" />
            {s.label}
          </div>
        </div>
        <div className="rl-bio-value">
          <span className="num">{value}</span>
          <span className="unit">{unit}</span>
        </div>
      </div>
      <BiomarkerScale biomarker={biomarker} gender={gender} />
      {(commentary || editableId) && (
        <div className="rl-bio-body">
          <ProseMarkdown markdown={commentary} editableId={editableId} />
        </div>
      )}
    </div>
  );
}

function formatValue(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return n
    .toFixed(digits)
    .replace(/\.?0+$/, (m) => (m.startsWith(".") ? "" : m));
}
