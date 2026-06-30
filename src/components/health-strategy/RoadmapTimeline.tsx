import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, Sparkles, FlaskConical, Trophy, CalendarClock, Zap, Moon, Wheat, FlaskRound, Activity, ShieldCheck } from "lucide-react";
import { format, isBefore, isSameDay, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

interface Milestone {
  title: string;
  date_iso: string;
  kind: "start" | "milestone" | "analysis" | "summary";
  analysis_number?: number;
  description: string;
  bullets: string[];
  focus: string;
}

interface KeyBiomarker {
  system_key: string;
  system_label: string;
  markers: string[];
}

interface Props {
  startDate: string;
  nextCheckupDate?: string | null;
  roadmap?: Milestone[] | null;
  keyBiomarkers?: KeyBiomarker[] | null;
  analysesPerYear?: number | null;
  adherencePct?: number | null;
}

const KIND_ICON: Record<string, any> = {
  start: Flag,
  milestone: Sparkles,
  analysis: FlaskConical,
  summary: Trophy,
};

const SYSTEM_ICON: Record<string, any> = {
  energy: Zap,
  sleep: Moon,
  gut: Wheat,
  hormones: FlaskRound,
  metabolism: Activity,
  inflammation: ShieldCheck,
};

export function RoadmapTimeline({ startDate, nextCheckupDate, roadmap, keyBiomarkers, analysesPerYear, adherencePct }: Props) {
  const today = new Date();
  const start = new Date(startDate);

  // Fallback if roadmap not yet generated
  const milestones: Milestone[] = (roadmap && roadmap.length > 0)
    ? roadmap
    : [
        { title: "Старт курса", date_iso: format(start, "yyyy-MM-dd"), kind: "start", description: "Чек-ап №1", bullets: ["Базовые анализы", "Оценка биомаркеров", "Формирование стратегии"], focus: "понимание исходной точки" },
        { title: "Контрольный анализ", date_iso: format(new Date(start.getTime() + 90 * 86400000), "yyyy-MM-dd"), kind: "analysis", analysis_number: 2, description: "Анализы №2", bullets: ["Динамика биомаркеров", "Коррекция назначений"], focus: "точная коррекция" },
        { title: "Итоги года", date_iso: format(new Date(start.getTime() + 365 * 86400000), "yyyy-MM-dd"), kind: "summary", description: "Финальный чек-ап", bullets: ["Сравнение результатов", "План на следующий год"], focus: "результаты и развитие" },
      ];

  let activeIdx = -1;
  milestones.forEach((m, i) => {
    const d = new Date(m.date_iso);
    if (isBefore(d, today) || isSameDay(d, today)) activeIdx = i;
  });
  if (activeIdx < 0) activeIdx = 0;

  const progressPct = activeIdx >= 0 && milestones.length > 1
    ? Math.min(100, ((activeIdx + 0.5) / (milestones.length - 1)) * 100)
    : 0;

  const nextAnalysisMs = milestones.find((m, i) => i > activeIdx && (m.kind === "analysis" || m.kind === "summary"));

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-4 md:p-6 space-y-5 md:space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-foreground">Контрольные точки</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ваш путь к здоровью на 12 месяцев{analysesPerYear ? ` · ${analysesPerYear} анализа в год` : ""}
            </p>
          </div>
          {adherencePct != null && (
            <Badge variant="secondary" className="text-xs">
              Соблюдение: {adherencePct}%
            </Badge>
          )}
        </div>

        {/* Top timeline with icons */}
        <div className="relative overflow-x-auto md:overflow-visible -mx-2 px-2">
          <div className="min-w-[640px] md:min-w-0">
            <div className="absolute top-[52px] md:top-[56px] left-2 right-2 h-[2px] bg-muted overflow-hidden rounded-full">
              <div
                className="h-full transition-all duration-700 rounded-full bg-gradient-primary"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div
              className="grid gap-x-2 relative"
              style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}
            >
              {milestones.map((m, i) => {
                const Icon = KIND_ICON[m.kind] || Sparkles;
                const passed = i < activeIdx;
                const current = i === activeIdx;
                const date = new Date(m.date_iso);

                return (
                  <div key={i} className="flex flex-col items-center text-center px-1">
                    <div className="text-[10px] md:text-[11px] mb-3 h-4 text-muted-foreground tabular-nums whitespace-nowrap">
                      {format(date, "d MMM yyyy", { locale: ru })}
                    </div>
                    <div className="relative">
                      {current && <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />}
                      <div
                        className={[
                          "relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300",
                          passed
                            ? "bg-gradient-primary border-primary text-primary-foreground"
                            : current
                            ? "bg-card border-primary text-primary"
                            : "bg-transparent border-border text-muted-foreground",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className={`text-xs md:text-sm font-semibold leading-tight mt-3 ${i > activeIdx ? "text-muted-foreground" : "text-foreground"}`}>
                      {m.title}
                    </div>
                    {m.description && (
                      <div className="text-[10px] md:text-[11px] leading-tight mt-1 text-muted-foreground line-clamp-2">
                        {m.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {milestones.map((m, i) => {
            const passed = i < activeIdx;
            const current = i === activeIdx;
            const future = i > activeIdx;
            return (
              <div
                key={i}
                className={[
                  "rounded-lg border p-3 flex flex-col gap-2 transition-colors",
                  current
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : passed
                    ? "border-border bg-muted/40 opacity-90"
                    : "border-border bg-card/50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold leading-tight ${future ? "text-muted-foreground" : "text-foreground"}`}>
                    {i + 1}. {m.title}
                  </h4>
                  {current && <Badge className="text-[10px] px-1.5 py-0">сейчас</Badge>}
                  {passed && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">пройдено</Badge>}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {format(new Date(m.date_iso), "d MMM yyyy", { locale: ru })}
                </div>
                <ul className="space-y-1 mt-1">
                  {(m.bullets || []).slice(0, 4).map((b, j) => (
                    <li key={j} className="text-xs text-foreground/80 leading-snug flex gap-1.5">
                      <span className="text-primary mt-1">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {current && adherencePct != null && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Прогресс этапа</span>
                      <span className="tabular-nums">{adherencePct}%</span>
                    </div>
                    <Progress value={adherencePct} className="h-1.5" />
                  </div>
                )}
                {m.focus && (
                  <div className="mt-auto pt-2">
                    <div className="inline-block text-[10px] font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                      Фокус: {m.focus}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Key biomarkers */}
        {keyBiomarkers && keyBiomarkers.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Ваши ключевые биомаркеры под контролем</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {keyBiomarkers.slice(0, 6).map((kb, i) => {
                const Icon = SYSTEM_ICON[kb.system_key] || Activity;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground leading-tight">{kb.system_label}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 break-words">
                        {kb.markers.join(", ")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next analysis reminder */}
        {nextAnalysisMs && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                Следующий анализ: {format(new Date(nextAnalysisMs.date_iso), "d MMM yyyy", { locale: ru })}
                {nextAnalysisMs.analysis_number ? ` (Анализы №${nextAnalysisMs.analysis_number})` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                Мы напомним вам за 7 дней до даты
                {(() => {
                  const days = differenceInDays(new Date(nextAnalysisMs.date_iso), today);
                  return days > 0 ? ` · через ${days} дн.` : "";
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
