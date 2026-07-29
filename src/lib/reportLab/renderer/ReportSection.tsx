import type { ParsedCategory, ReportBiomarker } from "../types";
import { normalizeCode, codeMatchKeys } from "../parser";
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

  const ctx = useReportEditor();
  const isEdit = ctx?.mode === "edit";

  // Фолбэк: коды вида «D25OH» vs «25-OH D», «APOB_APOA1» vs «ApoB/A1».
  const fuzzyIndex = new Map<string, ReportBiomarker>();
  biomarkerByCode.forEach((bio, code) => {
    for (const key of codeMatchKeys(code)) {
      if (!fuzzyIndex.has(key)) fuzzyIndex.set(key, bio);
    }
  });
  const findBio = (code: string) => {
    const direct = biomarkerByCode.get(normalizeCode(code));
    if (direct) return direct;
    for (const key of codeMatchKeys(code)) {
      const hit = fuzzyIndex.get(key);
      if (hit) return hit;
    }
    return undefined;
  };



  return (
    <section className="rl-page" data-section-id={`category-${index}`}>
      <header className="rl-section-header">
        <div className="num">{String(index).padStart(2, "0")}</div>
        <div className="title" data-section-title={category.title}>
          {category.title}
        </div>
        <div className="kicker">Раздел {index} из 5</div>
        {isEdit && (
          <button
            type="button"
            className="rl-regenerate-btn"
            data-rl-regenerate-category={category.title}
            title="Пересобрать этот раздел через ИИ"
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              fontSize: "10pt",
              border: "1px solid #6366f1",
              background: "#eef2ff",
              color: "#4338ca",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ↻ Перегенерировать
          </button>
        )}
      </header>

      {(() => {
        // Дедуп: если несколько блоков ссылаются на один и тот же биомаркер
        // (PT_QUICK / PT-Q и т.п.) — оставляем тот, у которого есть текст.
        const keepIndexByBio = new Map<string, number>();
        blocks.forEach((b, i) => {
          if (b.kind !== "biomarker") return;
          const bio = findBio(b.code);
          if (!bio) return;
          const prev = keepIndexByBio.get(bio.code);
          if (prev === undefined) {
            keepIndexByBio.set(bio.code, i);
            return;
          }
          const prevBlock = blocks[prev] as typeof b;
          const hasText = (x: typeof b) => Boolean(x.commentary?.trim() || x.commentaryHtml?.trim());
          if (!hasText(prevBlock) && hasText(b)) keepIndexByBio.set(bio.code, i);
        });
        const skip = new Set<number>();
        blocks.forEach((b, i) => {
          if (b.kind !== "biomarker") return;
          const bio = findBio(b.code);
          if (!bio) return;
          if (keepIndexByBio.get(bio.code) !== i) skip.add(i);
        });
        return blocks.map((b, i) => {
        if (skip.has(i)) return null;

        if (b.kind === "prose") {
          const editableId = recommendationId
            ? `rec:${recommendationId}#prose:${proseIndex}`
            : undefined;
          proseIndex += 1;
          return (
            <ProseMarkdown key={i} markdown={b.markdown} html={b.html} editableId={editableId} />
          );
        }
        const bio =
          findBio(b.code);

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
          // В просмотре/PDF технические плейсхолдеры не показываем.
          return (
            <div key={i}>
              {insertBefore}
              {isEdit && (
                <div className="rl-prose" style={{ opacity: 0.5, fontSize: "9pt" }}>
                  [биомаркер «{b.code}» не найден в снапшоте]
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={i}>
            {insertBefore}
            <BiomarkerCard
              biomarker={bio}
              commentary={b.commentary}
              commentaryHtml={b.commentaryHtml}
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
