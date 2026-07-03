import type { ParsedCategory, ReportBiomarker } from "../types";
import { normalizeCode } from "../parser";
import { BiomarkerCard } from "./BiomarkerCard";
import { ProseMarkdown } from "./ProseMarkdown";

interface Props {
  index: number;
  category: ParsedCategory;
  biomarkerByCode: Map<string, ReportBiomarker>;
  gender: "male" | "female" | "other" | null;
  recommendationId?: string;
}

export function ReportSection({
  index,
  category,
  biomarkerByCode,
  gender,
  recommendationId,
}: Props) {
  let proseIndex = 0;
  return (
    <section className="rl-page">
      <header className="rl-section-header">
        <div className="num">{String(index).padStart(2, "0")}</div>
        <div className="title" data-section-title={category.title}>
          {category.title}
        </div>
        <div className="kicker">Раздел {index} из 5</div>
      </header>

      {category.blocks.map((b, i) => {
        if (b.kind === "prose") {
          const editableId = recommendationId
            ? `rec:${recommendationId}#prose:${proseIndex}`
            : undefined;
          proseIndex += 1;
          return (
            <ProseMarkdown key={i} markdown={b.markdown} editableId={editableId} />
          );
        }
        const bio = biomarkerByCode.get(normalizeCode(b.code));
        if (!bio) {
          return (
            <div
              key={i}
              className="rl-prose"
              style={{ opacity: 0.5, fontSize: "9pt" }}
            >
              [биомаркер «{b.code}» не найден в снапшоте]
            </div>
          );
        }
        const editableId = recommendationId
          ? `rec:${recommendationId}#bio:${b.code}`
          : undefined;
        return (
          <BiomarkerCard
            key={i}
            biomarker={bio}
            commentary={b.commentary}
            gender={gender}
            editableId={editableId}
          />
        );
      })}
    </section>
  );
}

