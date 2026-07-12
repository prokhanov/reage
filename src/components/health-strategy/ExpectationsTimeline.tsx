import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  HeartPulse,
  Moon,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Wheat,
  Zap,
  FlaskRound,
  CheckCircle2,
  Clock,
  Circle,
} from "lucide-react";
import { format, differenceInDays, isBefore, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { useBiomarkerNames } from "@/hooks/useBiomarkerNames";

export type Expectation = {
  day_from_start: number;
  date_iso: string;
  category: "wellbeing" | "biomarker" | "system" | "milestone";
  system_key?: string;
  title: string;
  description: string;
  driver?: string;
  biomarker_target?: { code: string; from: number; to: number; unit: string };
  linked_roadmap_date?: string;
  confidence?: "high" | "medium" | "low";
};

interface Props {
  startDate: string;
  expectations: Expectation[] | null | undefined;
}

const SYSTEM_META: Record<string, { icon: any; label: string; color: string; bg: string; ring: string }> = {
  energy: { icon: Zap, label: "Энергия", color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
  sleep: { icon: Moon, label: "Сон", color: "text-indigo-400", bg: "bg-indigo-500/10", ring: "ring-indigo-500/20" },
  gut: { icon: Wheat, label: "ЖКТ", color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  hormones: { icon: FlaskRound, label: "Гормоны", color: "text-pink-400", bg: "bg-pink-500/10", ring: "ring-pink-500/20" },
  metabolism: { icon: Activity, label: "Метаболизм", color: "text-cyan-400", bg: "bg-cyan-500/10", ring: "ring-cyan-500/20" },
  inflammation: { icon: ShieldCheck, label: "Воспаление", color: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/20" },
  general: { icon: HeartPulse, label: "Организм", color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/20" },
};

const CATEGORY_LABEL: Record<string, string> = {
  wellbeing: "Самочувствие",
  biomarker: "Цель по показателю",
  system: "Системный сдвиг",
  milestone: "Контрольная точка",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "высокая уверенность",
  medium: "ориентировочно",
  low: "вариативно",
};

function formatDayLabel(day: number) {
  if (day < 14) return `${day}-й день`;
  if (day < 60) return `~${Math.round(day / 7)} нед.`;
  if (day < 365) return `~${Math.round(day / 30)} мес.`;
  return "~1 год";
}

function groupItemsByPhase(items: Expectation[]) {
  const phases = [
    { key: "start", label: "Первые 2 недели", maxDay: 14 },
    { key: "month1", label: "1–2 месяца", maxDay: 60 },
    { key: "quarter", label: "3–6 месяцев", maxDay: 180 },
    { key: "later", label: "Далее по мере восстановления", maxDay: Infinity },
  ];

  const grouped: { phase: typeof phases[0]; items: Expectation[] }[] = phases.map((p) => ({ phase: p, items: [] }));
  for (const item of items) {
    const phase = phases.find((p) => item.day_from_start <= p.maxDay) || phases[phases.length - 1];
    grouped.find((g) => g.phase.key === phase.key)!.items.push(item);
  }
  return grouped.filter((g) => g.items.length > 0);
}

export function ExpectationsTimeline({ startDate, expectations }: Props) {
  const { format: formatMarker } = useBiomarkerNames();
  const items = useMemo(() => (Array.isArray(expectations) ? expectations : []), [expectations]);

  const today = new Date();
  const start = new Date(startDate);
  const daysSinceStart = Math.max(0, differenceInDays(today, start));

  const passedCount = items.filter((e) => {
    const d = new Date(e.date_iso);
    return isBefore(d, today) || isSameDay(d, today);
  }).length;

  const lastDay = items.length > 0 ? items[items.length - 1].day_from_start : 365;
  const progressPct = Math.min(100, Math.round((daysSinceStart / Math.max(1, lastDay)) * 100));

  if (!items.length) return null;

  const grouped = groupItemsByPhase(items);
  let globalIndex = 0;
  const nextIdx = items.findIndex((e) => isBefore(today, new Date(e.date_iso)));

  return (
    <Card className="border border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden">
      <CardHeader className="pb-4 md:pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5 min-w-0">
            <CardTitle className="font-heading text-lg md:text-xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              Что будет происходить с вашим организмом
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Ожидаемые изменения в самочувствии и биомаркерах при соблюдении назначений
            </p>
          </div>
          <Badge variant="secondary" className="text-[11px] shrink-0 h-6">
            {passedCount}/{items.length} пройдено
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Старт: {format(start, "d MMM", { locale: ru })}</span>
            <span className="tabular-nums">{daysSinceStart}-й день пути</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-6 md:space-y-8">
          {grouped.map((group, groupIndex) => {
            const phasePassed = group.items[group.items.length - 1].day_from_start <= daysSinceStart;
            const phaseCurrent = group.items.some((_, i) => {
              const idx = globalIndex + i;
              return idx === nextIdx;
            });

            return (
              <section key={group.phase.key} className="relative">
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <div
                    className={[
                      "h-px flex-1",
                      phasePassed ? "bg-primary/30" : phaseCurrent ? "bg-primary/50" : "bg-border",
                    ].join(" ")}
                  />
                  <h3
                    className={[
                      "text-xs font-semibold uppercase tracking-wider",
                      phasePassed ? "text-primary" : phaseCurrent ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {group.phase.label}
                  </h3>
                  <div
                    className={[
                      "h-px flex-1",
                      phasePassed ? "bg-primary/30" : phaseCurrent ? "bg-primary/50" : "bg-border",
                    ].join(" ")}
                  />
                </div>

                <div className="space-y-3">
                  {group.items.map((e) => {
                    const d = new Date(e.date_iso);
                    const passed = isBefore(d, today) || isSameDay(d, today);
                    const isNext = globalIndex === nextIdx;
                    const sys = SYSTEM_META[e.system_key || "general"] || SYSTEM_META.general;
                    const Icon = sys.icon;
                    const days = differenceInDays(d, today);
                    globalIndex++;

                    return (
                      <article
                        key={globalIndex}
                        className={[
                          "relative rounded-xl border p-3 md:p-4 transition-all duration-200",
                          passed
                            ? "bg-muted/40 border-border/80"
                            : isNext
                            ? "bg-primary/[0.04] border-primary/30 shadow-sm shadow-primary/5"
                            : "bg-card/60 border-border/60",
                        ].join(" ")}
                      >
                        {/* Status accent strip */}
                        <div
                          className={[
                            "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
                            passed ? "bg-primary/50" : isNext ? "bg-primary" : "bg-muted-foreground/25",
                          ].join(" ")}
                        />

                        <div className="flex gap-3 md:gap-4">
                          {/* Icon */}
                          <div
                            className={[
                              "shrink-0 h-10 w-10 md:h-11 md:w-11 rounded-xl flex items-center justify-center ring-1",
                              sys.bg,
                              sys.color,
                              sys.ring,
                            ].join(" ")}
                          >
                            <Icon className="h-5 w-5 md:h-5.5 md:w-5.5" />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-2">
                            {/* Title row */}
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-heading text-sm md:text-[15px] font-semibold leading-snug text-foreground tracking-tight">
                                {e.title}
                              </h4>
                              <div className="shrink-0 flex items-center gap-1.5">
                                {passed && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    пройдено
                                  </Badge>
                                )}
                                {isNext && !passed && (
                                  <Badge className="text-[10px] px-1.5 py-0 h-5 gap-1">
                                    <Clock className="h-3 w-3" />
                                    скоро
                                  </Badge>
                                )}
                                {!passed && !isNext && (
                                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted/80">
                                    <Circle className="h-3 w-3 text-muted-foreground" />
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] md:text-xs text-muted-foreground">
                              <span className="font-medium text-foreground tabular-nums">
                                {formatDayLabel(e.day_from_start)}
                              </span>
                              <span className="text-border">·</span>
                              <span className="tabular-nums">{format(d, "d MMM yyyy", { locale: ru })}</span>
                              {!passed && days > 0 && (
                                <>
                                  <span className="text-border">·</span>
                                  <span>через {days} дн.</span>
                                </>
                              )}
                              <span className="text-border">·</span>
                              <span className="inline-flex items-center rounded-md bg-muted/70 px-1.5 py-0.5">
                                {CATEGORY_LABEL[e.category] || ""}
                              </span>
                              {e.confidence && e.confidence !== "high" && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="italic">{CONFIDENCE_LABEL[e.confidence]}</span>
                                </>
                              )}
                            </div>

                            {/* Description */}
                            {e.description && (
                              <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                                {e.description}
                              </p>
                            )}

                            {/* Biomarker target */}
                            {e.biomarker_target && (
                              <div className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="text-xs font-medium text-foreground">
                                    Цель: {formatMarker(e.biomarker_target.code)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="tabular-nums text-muted-foreground">
                                    {e.biomarker_target.from} {e.biomarker_target.unit}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="tabular-nums font-semibold text-primary">
                                    {e.biomarker_target.to} {e.biomarker_target.unit}
                                  </span>
                                  <TrendingDown
                                    className={[
                                      "h-3.5 w-3.5 ml-auto shrink-0",
                                      e.biomarker_target.to < e.biomarker_target.from
                                        ? "text-emerald-500"
                                        : "text-amber-500 rotate-180",
                                    ].join(" ")}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Driver */}
                            {e.driver && (
                              <div className="flex items-start gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] md:text-xs text-muted-foreground">
                                <CalendarCheck2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/80" />
                                <span>
                                  <span className="text-foreground/80 font-medium">За счёт: </span>
                                  {e.driver}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-5 md:mt-6 text-[11px] md:text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
          Прогноз ориентировочный, основан на ваших биомаркерах и активных назначениях. Реальные сроки могут отличаться
          в зависимости от приверженности приёму и образа жизни.
        </p>
      </CardContent>
    </Card>
  );
}
