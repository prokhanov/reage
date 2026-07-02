import type { ParsedCategory, ReportBiomarker } from "../types";
import { normalizeCode } from "../parser";
import { BiomarkerCard } from "./BiomarkerCard";
import { ProseMarkdown } from "./ProseMarkdown";

interface Props {
  index: number;
  category: ParsedCategory;
  biomarkerByCode: Map<string, ReportBiomarker>;
  gender: "male" | "female" | "other" | null;
}

export function ReportSection({
  index,
  category,
  biomarkerByCode,
  gender,
}: Props) {
  return (
    <section className="rl-page">
      <PageHeader label="Системный анализ" />
      <header className="rl-section-header">
        <div className="num">{String(index).padStart(2, "0")}</div>
        <div className="title">{category.title}</div>
        <div className="kicker">Раздел {index} из 5</div>
      </header>

      {category.blocks.map((b, i) => {
        if (b.kind === "prose") {
          return <ProseMarkdown key={i} markdown={b.markdown} />;
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
        return (
          <BiomarkerCard
            key={i}
            biomarker={bio}
            commentary={b.commentary}
            gender={gender}
          />
        );
      })}

      <PageFooter title={category.title} />
    </section>
  );
}

export function PageHeader({ label }: { label: string }) {
  return (
    <div className="rl-header">
      <span>ReAge · Личный отчёт</span>
      <span>{label}</span>
    </div>
  );
}

export function PageFooter({ title }: { title: string }) {
  return (
    <div className="rl-footer">
      <span>ReAge Longevity</span>
      <span>{title}</span>
    </div>
  );
}
