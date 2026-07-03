import type { ProkhanovReport, ReportPrescription } from "../types";
import { getPrescriptionsRecord } from "../parser";
import { ProseMarkdown } from "./ProseMarkdown";


interface Props {
  report: ProkhanovReport;
}

interface LifestyleData {
  sleep?: string[];
  activity?: string[];
  nutrition?: string[];
  [k: string]: string[] | undefined;
}
interface FollowUp {
  goal?: string;
  trigger?: string;
  specialist?: string;
}

export function ReportPrescriptions({ report }: Props) {
  const row = getPrescriptionsRecord(report);
  const contentJson = (row?.content_json ?? {}) as Record<string, unknown>;
  const lifestyle = (contentJson.lifestyle ?? {}) as LifestyleData;
  const followUps = (contentJson.follow_ups ?? []) as FollowUp[];
  const prescriptions = (report.prescriptions ?? []) as ReportPrescription[];

  const sections: Array<{ title: string; items: string[] }> = [];
  const push = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return;
    // Первая строка часто «Питание:», «Сон и режим:» — заголовок дублирует title.
    const cleaned = items.filter(
      (i) => !/^(?:питание|сон|физическая\s+активность)/i.test(i.trim()),
    );
    sections.push({ title, items: cleaned.length ? cleaned : items });
  };
  push("Питание", lifestyle.nutrition);
  push("Физическая активность", lifestyle.activity);
  push("Сон и восстановление", lifestyle.sleep);

  return (
    <section className="rl-page">
      <div className="rl-eyebrow">Клинический план</div>

      <h1 className="rl-h1" data-section-title="Рекомендации">Рекомендации</h1>

      {sections.map((s) => (
        <div key={s.title} style={{ marginBottom: "8mm" }}>
          <h3 className="rl-h3">{s.title}</h3>
          {s.items.map((item, i) => (
            <div key={i} className="rl-rx">
              <div className="rl-rx-desc">
                <ProseMarkdown markdown={item} />
              </div>
            </div>
          ))}
        </div>
      ))}

      {prescriptions.length > 0 && (
        <div style={{ marginBottom: "8mm" }}>
          <h3 className="rl-h3">Нутрицевтики</h3>
          {prescriptions.map((p) => (
            <div key={p.id} className="rl-rx">
              <div className="rl-rx-title">
                {p.name}
                {p.form ? ` — ${p.form}` : ""}
              </div>
              {(p.dosage || p.how_to_take || p.duration) && (
                <div className="rl-rx-meta">
                  {[p.dosage, p.how_to_take, p.duration]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
              {p.reason && (
                <div className="rl-rx-desc">
                  <ProseMarkdown markdown={p.reason} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {followUps.length > 0 && (
        <>
          <h3 className="rl-h3">Дополнительные консультации</h3>
          {followUps.map((f, i) => (
            <div key={i} className="rl-rx">
              <div className="rl-rx-title">{f.specialist || "Специалист"}</div>
              {f.trigger && <div className="rl-rx-meta">{f.trigger}</div>}
              {f.goal && (
                <div className="rl-rx-desc">
                  <ProseMarkdown markdown={f.goal} />
                </div>
              )}
            </div>
          ))}
        </>
      )}

    </section>

  );
}

