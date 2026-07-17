import type { LabReport, ReportPrescription } from "../types";
import { getPrescriptionsRecord } from "../parser";
import { ProseMarkdown } from "./ProseMarkdown";
import {
  sanitizeLifestyle,
  extractFollowUpsFromLifestyle,
  mergeFollowUps,
} from "@/components/prescriptions/AdvisorySections";



interface Props {
  report: LabReport;
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
  const rawLifestyle = (contentJson.lifestyle ?? {}) as LifestyleData;
  const rawFollowUps = (contentJson.follow_ups ?? []) as FollowUp[];
  const extractedFollowUps = extractFollowUpsFromLifestyle(rawLifestyle);
  const lifestyle = sanitizeLifestyle(rawLifestyle) as LifestyleData;
  const followUps = mergeFollowUps(rawFollowUps, extractedFollowUps).filter((f) => {
    const spec = (f.specialist || "").trim();
    const goal = (f.goal || "").trim();
    if (!spec && !goal) return false;
    if (/^\**\s*дополнительные\s+консультации(?:\s+и\s+обследования)?\s*\**\s*[:：]?\s*$/i.test(spec) && !goal && !f.trigger) return false;
    return true;
  });


  const prescriptions = (report.prescriptions ?? []) as ReportPrescription[];

  const sections: Array<{ title: string; items: string[] }> = [];
  const HEADING_LIKE =
    /^\**\s*(?:питание|сон(?:\s+и\s+восстановлени[ея])?|физическая\s+активность|дополнительные\s+консультации(?:\s+и\s+обследования)?|нутрицевтики|витамины|добавки|препараты|минералы|бады|образ\s+жизни)\s*\**\s*[:：]?\s*$/i;
  const push = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return;
    // Отфильтровываем строки, которые сами являются заголовком раздела
    // (AI иногда возвращает первый элемент как "Дополнительные консультации и обследования").
    const cleaned = items.filter((i) => {
      const t = i.trim();
      if (!t) return false;
      if (HEADING_LIKE.test(t)) return false;
      // Старое правило — префиксы «Питание:», «Сон и режим:»
      if (/^(?:питание|сон|физическая\s+активность)\b[^а-яё]*[:：]?\s*$/i.test(t)) return false;
      return true;
    });
    if (cleaned.length === 0) return;
    sections.push({ title, items: cleaned });
  };

  push("Питание", lifestyle.nutrition);
  push("Физическая активность", lifestyle.activity);
  push("Сон и восстановление", lifestyle.sleep);

  return (
    <section className="rl-page" data-section-id="prescriptions">
      <h1 className="rl-h1" data-section-title="Рекомендации">Рекомендации</h1>

      {prescriptions.length > 0 && (
        <div style={{ marginBottom: "8mm" }}>
          <h3 className="rl-h3">Нутрицевтики ({prescriptions.length})</h3>
          {prescriptions.map((p, idx) => {
            const reason = (p.reason || "").replace(/^[\s📊📈📉]+/u, "").trim();
            return (
              <div key={p.id} className="rl-rx rl-nutri">
                <div className="rl-nutri-title">
                  {idx + 1}. {p.name}
                </div>
                {p.form && (
                  <div className="rl-nutri-row">
                    <span className="rl-nutri-label">Форма:</span> {p.form}
                  </div>
                )}
                {p.dosage && (
                  <div className="rl-nutri-row">
                    <span className="rl-nutri-label">Дозировка:</span> {p.dosage}
                  </div>
                )}
                {p.how_to_take && (
                  <div className="rl-nutri-row">
                    <span className="rl-nutri-label">Как принимать:</span> {p.how_to_take}
                  </div>
                )}
                {p.duration && (
                  <div className="rl-nutri-row">
                    <span className="rl-nutri-label">Длительность:</span> {p.duration}
                  </div>
                )}
                {reason && (
                  <div className="rl-nutri-reason">
                    <span className="rl-nutri-label">Причина:</span> {reason}
                  </div>
                )}
                {p.effect && (
                  <div className="rl-nutri-row">
                    <span className="rl-nutri-label">На что это влияет:</span> {p.effect}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

