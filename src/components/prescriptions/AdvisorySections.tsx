/**
 * AdvisorySections — рендер блоков «Питание/образ жизни» и «Доп. обследования».
 *
 * Используется одинаково в:
 *   - src/pages/Prescriptions.tsx (раздел «Рекомендации» в меню)
 *   - src/pages/Recommendations.tsx (модалка отчёта)
 */
import { Activity, Moon, Stethoscope, Utensils } from "lucide-react";

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

/**
 * Очистка lifestyle-массивов от «загрязнения» AI:
 *   - заголовков-ярлыков ("Питание:", "Сон и режим:", "Физическая активность:");
 *   - случайно вставленного заголовка "Дополнительные консультации и обследования";
 *   - строк, дублирующих follow-ups (вида "Специалист → ... → ...").
 */
const SECTION_LABELS = new Set(
  [
    "питание",
    "питание:",
    "сон",
    "сон:",
    "сон и режим",
    "сон и режим:",
    "физическая активность",
    "физическая активность:",
    "образ жизни",
    "образ жизни:",
    "дополнительные консультации и обследования",
    "дополнительные консультации",
    "консультации специалистов",
  ].map((s) => s.toLowerCase()),
);

/** Регэксп строки follow-up: "Специалист → ..." (одна или две стрелки, → или ->). */
const FOLLOW_UP_LINE_RE = /^\s*([^→\->\n]{2,80}?)\s*(?:→|->)\s+(.+)$/;

/**
 * Список ключевых слов, по которым строка-«заголовок» из мусора AI считается
 * вступлением к блоку follow-ups (и должна быть отброшена из lifestyle).
 */
const FOLLOWUPS_INTRO_KEYWORDS = [
  "консультац",
  "обследован",
  "узких специалист",
  "нутрицевтическая поддержка",
];

export function sanitizeLifestyleItems(items?: string[]): string[] {
  if (!items?.length) return [];
  return items
    .map((i) => (typeof i === "string" ? i.trim() : ""))
    .filter((i) => {
      if (!i) return false;
      const norm = i.toLowerCase().replace(/\s+/g, " ").trim();
      if (SECTION_LABELS.has(norm)) return false;
      // Любая строка вида «Специалист → ...» — это follow-up, не lifestyle.
      if (FOLLOW_UP_LINE_RE.test(i)) return false;
      // Вступительные строки к блоку доп. консультаций («Ваши анализы выявили...
      // требующих внимания узких специалистов»).
      if (FOLLOWUPS_INTRO_KEYWORDS.some((kw) => norm.includes(kw))) return false;
      return true;
    });
}

export function sanitizeLifestyle(ls?: LifestyleData): LifestyleData {
  return {
    nutrition: sanitizeLifestyleItems(ls?.nutrition),
    activity: sanitizeLifestyleItems(ls?.activity),
    sleep: sanitizeLifestyleItems(ls?.sleep),
  };
}

/**
 * Достаёт строки-follow-up'ы («Эндокринолог → ...») из lifestyle-массивов,
 * которые AI ошибочно сложил вместе с режимом сна / питанием.
 *
 * Возвращает структурированные FollowUpData[] для слияния с уже существующим
 * списком follow_ups (с дедупом по специалисту).
 */
export function extractFollowUpsFromLifestyle(ls?: LifestyleData): FollowUpData[] {
  if (!ls) return [];
  const all: string[] = [
    ...(ls.nutrition || []),
    ...(ls.activity || []),
    ...(ls.sleep || []),
  ];
  const out: FollowUpData[] = [];
  for (const raw of all) {
    if (typeof raw !== "string") continue;
    const m = raw.match(FOLLOW_UP_LINE_RE);
    if (!m) continue;
    const specialist = m[1].trim().replace(/[:.,;]+$/, "");
    const goal = m[2].trim();
    if (!specialist || !goal) continue;
    out.push({ specialist, goal });
  }
  return out;
}

/** Слияние follow-ups (явных + извлечённых) с дедупом по специалисту. */
export function mergeFollowUps(
  existing?: FollowUpData[],
  extracted?: FollowUpData[],
): FollowUpData[] {
  const result: FollowUpData[] = [];
  const seen = new Set<string>();
  const push = (f: FollowUpData) => {
    const key = (f.specialist || "").trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(f);
  };
  (existing || []).forEach(push);
  (extracted || []).forEach(push);
  return result;
}

interface Props {
  lifestyle?: LifestyleData;
  followUps?: FollowUpData[];
}

export function AdvisorySections({ lifestyle, followUps }: Props) {
  // Сначала вытаскиваем «врачей» из lifestyle (AI часто кладёт их в sleep/activity),
  // потом санитайзим lifestyle уже без них.
  const extractedFollowUps = extractFollowUpsFromLifestyle(lifestyle);
  const ls = sanitizeLifestyle(lifestyle);
  const mergedFollowUps = mergeFollowUps(followUps, extractedFollowUps);
  const hasNutrition = (ls.nutrition?.length || 0) > 0;
  const hasActivity = (ls.activity?.length || 0) > 0;
  const hasSleep = (ls.sleep?.length || 0) > 0;
  const hasLifestyle = hasNutrition || hasActivity || hasSleep;
  const hasFollowUps = mergedFollowUps.length > 0;
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
                  <Utensils className="h-4 w-4 text-primary" />
                  Питание
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
                  <Activity className="h-4 w-4 text-primary" />
                  Физическая активность
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
                  <Moon className="h-4 w-4 text-primary" />
                  Сон и режим
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
    </div>
  );
}
