import type { ReportBiomarker } from "../types";
import { resolveStatusBucket, type BiomarkerBucket } from "../parser";
import { BiomarkerScale } from "./BiomarkerScale";
import { ProseMarkdown } from "./ProseMarkdown";

interface Props {
  biomarker: ReportBiomarker;
  commentary: string;
  gender: "male" | "female" | "other" | null;
  age?: number | null;
  editableId?: string;
}

/**
 * 4-бакетная модель статуса — согласована с UI приложения
 * (Оптимально / Допустимо / Риск / Критично). Никаких «выше оптимума»,
 * «критически низкий» и т.п. в подписях.
 */
const BUCKET_LABEL: Record<BiomarkerBucket, string> = {
  optimal: "Оптимально",
  acceptable: "Допустимо",
  risk: "Риск",
  critical: "Критично",
};

export function BiomarkerCard({ biomarker, commentary, gender, age = null, editableId }: Props) {
  const bucket = resolveStatusBucket(biomarker, gender, age);
  const label = BUCKET_LABEL[bucket];

  return (
    <div className="rl-biomarker">
      <div className="rl-bio-head">
        <div className="rl-bio-title">
          <h3 className="rl-bio-name">
            {biomarker.name}
            <span className="rl-bio-code">({biomarker.code.toUpperCase()})</span>
          </h3>
        </div>
        <div className={`rl-bio-status ${bucket}`}>
          <span className="dot" />
          {label}
        </div>
      </div>
      <BiomarkerScale biomarker={biomarker} gender={gender} age={age} />
      {(commentary || editableId) && (
        <div className="rl-bio-body">
          <ProseMarkdown markdown={commentary} editableId={editableId} />
        </div>
      )}
    </div>
  );
}
