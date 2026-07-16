import type { ParsedCategory, ReportBiomarker } from "../types";
import { normalizeCode } from "../parser";
import { BiomarkerCard } from "./BiomarkerCard";
import { ProseMarkdown } from "./ProseMarkdown";
import { useReportEditor } from "../editor/ReportEditorContext";

interface Props {
  index: number;
  category: ParsedCategory;
  biomarkerByCode: Map<string, ReportBiomarker>;
  gender: "male" | "female" | "other" | null;
  age?: number | null;
  recommendationId?: string;
}

/**
 * Пустой editable-слот «добавить текст здесь». Рендерится только в режиме edit
 * между карточками биомаркеров. Реальный markdown попадает в текст
 * рекомендации на этапе save (см. `assembleRecommendationText` → `insert:N`).
 */
function InsertSlot({
  editableId,
}: {
  editableId: string;
}) {
  const ctx = useReportEditor();
  if (ctx?.mode !== "edit") {
    // В view-режиме draft может быть непустым только между Save и следующим
    // ре-парсингом — в этом случае родитель уже перезагрузил report.
    return null;
  }
  return (
    <ProseMarkdown
      markdown=""
      editableId={editableId}
      className="rl-insert-slot"
    />
  );
}

export function ReportSection({
  index,
  category,
  biomarkerByCode,
  gender,
  age = null,
  recommendationId,
}: Props) {
  let proseIndex = 0;
  let bioIndex = 0;
  const blocks = category.blocks;
  const hasBiomarker = blocks.some((b) => b.kind === "biomarker");

  return (
    <section className="rl-page" data-section-id={`category-${index}`}>
      <header className="rl-section-header">
        <div className="num">{String(index).padStart(2, "0")}</div>
        <div className="title" data-section-title={category.title}>
          {category.title}
        </div>
        <div className="kicker">Раздел {index} из 5</div>
      </header>

      {blocks.map((b, i) => {
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
        const currentBioIndex = bioIndex;
        bioIndex += 1;
        const editableId = recommendationId
          ? `rec:${recommendationId}#bio:${b.code}`
          : undefined;
        const insertBefore = recommendationId ? (
          <InsertSlot
            key={`insert-${i}`}
            editableId={`rec:${recommendationId}#insert:${currentBioIndex}`}
          />
        ) : null;

        if (!bio) {
          return (
            <div key={i}>
              {insertBefore}
              <div
                className="rl-prose"
                style={{ opacity: 0.5, fontSize: "9pt" }}
              >
                [биомаркер «{b.code}» не найден в снапшоте]
              </div>
            </div>
          );
        }
        return (
          <div key={i}>
            {insertBefore}
            <BiomarkerCard
              biomarker={bio}
              commentary={b.commentary}
              gender={gender}
              age={age}
              editableId={editableId}
            />
          </div>
        );
      })}

      {hasBiomarker && recommendationId && (
        <InsertSlot editableId={`rec:${recommendationId}#insert:${bioIndex}`} />
      )}
    </section>
  );
}
