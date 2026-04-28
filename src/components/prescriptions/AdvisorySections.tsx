/**
 * AdvisorySections — рендер блоков «Питание/образ жизни» и «Доп. обследования».
 *
 * Используется одинаково в:
 *   - src/pages/Prescriptions.tsx (раздел «Рекомендации» в меню)
 *   - src/pages/Recommendations.tsx (модалка отчёта)
 */

export interface LifestyleData {
  nutrition?: string[];
  activity?: string[];
  sleep?: string[];
}

export interface FollowUpData {
  specialist?: string;
  goal?: string;
  trigger?: string;
}

interface Props {
  lifestyle?: LifestyleData;
  followUps?: FollowUpData[];
}

export function AdvisorySections({ lifestyle, followUps }: Props) {
  const ls = lifestyle || {};
  const hasNutrition = (ls.nutrition?.length || 0) > 0;
  const hasActivity = (ls.activity?.length || 0) > 0;
  const hasSleep = (ls.sleep?.length || 0) > 0;
  const hasLifestyle = hasNutrition || hasActivity || hasSleep;
  const hasFollowUps = (followUps?.length || 0) > 0;
  if (!hasLifestyle && !hasFollowUps) return null;

  return (
    <div className="space-y-8">
      {hasLifestyle && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Питание и коррекция образа жизни
            </h2>
            <div className="h-1 w-20 bg-gradient-primary rounded-full" />
          </div>
          <div className="space-y-4">
            {hasNutrition && (
              <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6">
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span>🥗</span> Питание
                </h3>
                <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                  {ls.nutrition!.map((item, i) => (
                    <li key={`nut-${i}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {hasActivity && (
              <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6">
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span>🏃</span> Физическая активность
                </h3>
                <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                  {ls.activity!.map((item, i) => (
                    <li key={`act-${i}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {hasSleep && (
              <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6">
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span>😴</span> Сон и режим
                </h3>
                <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                  {ls.sleep!.map((item, i) => (
                    <li key={`slp-${i}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {hasFollowUps && followUps && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Дополнительные консультации и обследования
            </h2>
            <div className="h-1 w-20 bg-gradient-primary rounded-full" />
          </div>
          <div className="space-y-3">
            {followUps.map((f, i) => (
              <div
                key={`fu-${i}`}
                className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="text-primary mt-0.5">🩺</span>
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
    </div>
  );
}
