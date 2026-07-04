import { Utensils, Activity, Moon, Stethoscope } from "lucide-react";
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

const CARD_CLASS =
  "rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6";
const HEADING_CLASS =
  "font-semibold text-base mb-3 flex items-center gap-2 text-foreground";

function cleanItems(items?: string[], titleRegex?: RegExp): string[] {
  if (!items || items.length === 0) return [];
  if (!titleRegex) return items;
  const cleaned = items.filter((i) => !titleRegex.test(i.trim()));
  return cleaned.length ? cleaned : items;
}

export function ReportPrescriptions({ report }: Props) {
  const row = getPrescriptionsRecord(report);
  const contentJson = (row?.content_json ?? {}) as Record<string, unknown>;
  const lifestyle = (contentJson.lifestyle ?? {}) as LifestyleData;
  const followUps = (contentJson.follow_ups ?? []) as FollowUp[];
  const prescriptions = (report.prescriptions ?? []) as ReportPrescription[];

  const nutrition = cleanItems(lifestyle.nutrition, /^питание/i);
  const activity = cleanItems(lifestyle.activity, /^физическая\s+активность/i);
  const sleep = cleanItems(lifestyle.sleep, /^сон/i);

  const hasLifestyle = nutrition.length + activity.length + sleep.length > 0;
  const hasPrescriptions = prescriptions.length > 0;
  const hasFollowUps = followUps.length > 0;

  return (
    <section className="rl-page">
      <div className="rl-eyebrow">Клинический план</div>
      <h1 className="rl-h1" data-section-title="Рекомендации">Рекомендации</h1>

      <div className="space-y-6 sm:space-y-8">
        {hasLifestyle && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Питание и коррекция образа жизни
              </h2>
              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
            </div>
            <div className="space-y-4">
              {nutrition.length > 0 && (
                <div className={CARD_CLASS}>
                  <h3 className={HEADING_CLASS}>
                    <Utensils className="h-4 w-4 text-primary" />
                    Питание
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                    {nutrition.map((item, i) => (
                      <li key={`nut-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {activity.length > 0 && (
                <div className={CARD_CLASS}>
                  <h3 className={HEADING_CLASS}>
                    <Activity className="h-4 w-4 text-primary" />
                    Физическая активность
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                    {activity.map((item, i) => (
                      <li key={`act-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sleep.length > 0 && (
                <div className={CARD_CLASS}>
                  <h3 className={HEADING_CLASS}>
                    <Moon className="h-4 w-4 text-primary" />
                    Сон и режим
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                    {sleep.map((item, i) => (
                      <li key={`slp-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {hasFollowUps && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Дополнительные консультации и обследования
              </h2>
              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
            </div>
            <div className="space-y-3">
              {followUps.map((f, i) => (
                <div key={`fu-${i}`} className={CARD_CLASS.replace("p-6", "p-5")}>
                  <div className="flex items-start gap-3">
                    <Stethoscope className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-foreground">
                        {f.specialist || "Специалист"}
                      </p>
                      {f.goal && (
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="font-medium">Цель:</span> {f.goal}
                        </p>
                      )}
                      {f.trigger && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-medium">Основание:</span> {f.trigger}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasPrescriptions && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Нутрицевтики ({prescriptions.length})
              </h2>
              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
            </div>
            <div className="space-y-3">
              {prescriptions.map((p, idx) => {
                const reason = (p.reason || "").replace(/^[\s📊📈📉]+/u, "").trim();
                return (
                  <div key={p.id} className={CARD_CLASS.replace("p-6", "p-5")}>
                    <div className="font-semibold text-foreground mb-2">
                      {idx + 1}. {p.name}
                    </div>
                    <div className="space-y-1 text-sm">
                      {p.form && (
                        <div><span className="font-medium">Форма:</span> {p.form}</div>
                      )}
                      {p.dosage && (
                        <div><span className="font-medium">Дозировка:</span> {p.dosage}</div>
                      )}
                      {p.how_to_take && (
                        <div><span className="font-medium">Как принимать:</span> {p.how_to_take}</div>
                      )}
                      {p.duration && (
                        <div><span className="font-medium">Длительность:</span> {p.duration}</div>
                      )}
                      {reason && (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Причина:</span> {reason}
                        </div>
                      )}
                      {p.effect && (
                        <div><span className="font-medium">На что это влияет:</span> {p.effect}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!hasLifestyle && !hasFollowUps && !hasPrescriptions && (
          <div className="text-sm text-muted-foreground">Нет данных для отображения.</div>
        )}
      </div>

      {/* Fallback ProseMarkdown import guard (keeps import used if content_json empty) */}
      <div className="hidden">
        <ProseMarkdown markdown="" />
      </div>
    </section>
  );
}
