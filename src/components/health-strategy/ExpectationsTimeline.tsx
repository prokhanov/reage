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
} from "lucide-react";
import { format, differenceInDays, isBefore, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

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

const SYSTEM_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  energy: { icon: Zap, label: "Энергия", color: "text-amber-500", bg: "bg-amber-500/10" },
  sleep: { icon: Moon, label: "Сон", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  gut: { icon: Wheat, label: "ЖКТ", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  hormones: { icon: FlaskRound, label: "Гормоны", color: "text-pink-400", bg: "bg-pink-500/10" },
  metabolism: { icon: Activity, label: "Метаболизм", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  inflammation: { icon: ShieldCheck, label: "Воспаление", color: "text-rose-400", bg: "bg-rose-500/10" },
  general: { icon: HeartPulse, label: "Организм", color: "text-primary", bg: "bg-primary/10" },
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

export function ExpectationsTimeline({ startDate, expectations }: Props) {
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

  // Find the next upcoming event for the "next milestone" highlight
  const nextIdx = items.findIndex((e) => isBefore(today, new Date(e.date_iso)));

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
      <CardHeader className="pb-3 md:pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              Что будет происходить с вашим организмом
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground leading-snug">
              Ожидаемые изменения в самочувствии и биомаркерах при соблюдении назначений
            </p>
          </div>
          <Badge variant="secondary" className="text-[11px] shrink-0">
            {passedCount}/{items.length} пройдено
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Старт: {format(start, "d MMM", { locale: ru })}</span>
            <span className="tabular-nums">{daysSinceStart}-й день пути</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ol className="relative pl-5 md:pl-6 space-y-3 md:space-y-4 before:content-[''] before:absolute before:left-[7px] md:before:left-[9px] before:top-1 before:bottom-1 before:w-px before:bg-border">
          {items.map((e, i) => {
            const d = new Date(e.date_iso);
            const passed = isBefore(d, today) || isSameDay(d, today);
            const isNext = i === nextIdx;
            const sys = SYSTEM_META[e.system_key || "general"] || SYSTEM_META.general;
            const Icon = sys.icon;
            const days = differenceInDays(d, today);

            return (
              <li key={i} className="relative">
                {/* Dot on the rail */}
                <span
                  className={[
                    "absolute -left-5 md:-left-6 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-background",
                    passed ? "bg-primary" : isNext ? "bg-primary/60 animate-pulse" : "bg-muted-foreground/30",
                  ].join(" ")}
                />

                <div
                  className={[
                    "rounded-lg border p-3 md:p-4 transition-colors",
                    isNext
                      ? "border-primary/40 bg-primary/[0.05] shadow-sm"
                      : passed
                      ? "border-border bg-muted/30"
                      : "border-border/70 bg-card/40",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 h-9 w-9 rounded-md flex items-center justify-center ${sys.bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${sys.color}`} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm md:text-[15px] font-semibold leading-tight ${passed ? "text-foreground/80" : "text-foreground"}`}>
                          {e.title}
                        </h4>
                        {isNext && <Badge className="text-[10px] px-1.5 py-0">скоро</Badge>}
                        {passed && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            пройдено
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums flex-wrap">
                        <span className="font-medium text-foreground/80">{formatDayLabel(e.day_from_start)}</span>
                        <span>·</span>
                        <span>{format(d, "d MMM yyyy", { locale: ru })}</span>
                        {!passed && days > 0 && <span>· через {days} дн.</span>}
                        <span>·</span>
                        <span>{CATEGORY_LABEL[e.category] || ""}</span>
                      </div>

                      {e.description && (
                        <p className="text-xs md:text-sm text-foreground/85 leading-relaxed">{e.description}</p>
                      )}

                      {e.biomarker_target && (
                        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/[0.05] px-2.5 py-1.5 text-xs">
                          <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">{e.biomarker_target.code}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {e.biomarker_target.from} {e.biomarker_target.unit}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="tabular-nums font-semibold text-primary">
                            {e.biomarker_target.to} {e.biomarker_target.unit}
                          </span>
                          <TrendingDown
                            className={`h-3.5 w-3.5 ml-auto shrink-0 ${
                              e.biomarker_target.to < e.biomarker_target.from ? "text-emerald-500" : "text-amber-500 rotate-180"
                            }`}
                          />
                        </div>
                      )}

                      {e.driver && (
                        <div className="text-[11px] md:text-xs text-muted-foreground flex items-start gap-1.5">
                          <CalendarCheck2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
                          <span>
                            <span className="text-foreground/70 font-medium">За счёт: </span>
                            {e.driver}
                          </span>
                        </div>
                      )}

                      {e.confidence && e.confidence !== "high" && (
                        <div className="text-[10px] text-muted-foreground italic">
                          {CONFIDENCE_LABEL[e.confidence]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
          Прогноз ориентировочный, основан на ваших биомаркерах и активных назначениях. Реальные сроки могут отличаться в зависимости от приверженности приёму и образа жизни.
        </p>
      </CardContent>
    </Card>
  );
}
