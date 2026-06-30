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
  start: FlaskConical,
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

// SVG canvas dimensions (viewBox). We use preserveAspectRatio="none" so it
// stretches across the container; vector-effect="non-scaling-stroke" keeps
// the line crisp at any width.
const VB_W = 1000;
const VB_H = 220;
const PAD_X = 40; // leave room so the first/last marker don't touch edges
const MID_Y = VB_H / 2;
const AMP = 60; // vertical wave amplitude

/** Build a smooth cubic-bezier "S" curve through points. */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) * 0.5;
    const c1x = p0.x + dx;
    const c1y = p0.y;
    const c2x = p1.x - dx;
    const c2y = p1.y;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function RoadmapTimeline({ startDate, nextCheckupDate, roadmap, keyBiomarkers, analysesPerYear, adherencePct }: Props) {
  const today = new Date();
  const start = new Date(startDate);

  // Fallback if roadmap not yet generated
  const milestonesRaw: Milestone[] = (roadmap && roadmap.length > 0)
    ? roadmap
    : [
        { title: "Анализ №1 · Старт", date_iso: format(start, "yyyy-MM-dd"), kind: "start", description: "Базовый чек-ап и стратегия", bullets: ["Базовые анализы", "Оценка биомаркеров", "Формирование стратегии"], focus: "понимание исходной точки" },
        { title: "Консультация и старт назначений", date_iso: format(new Date(start.getTime() + 16 * 86400000), "yyyy-MM-dd"), kind: "milestone", description: "Отчёт просмотрен врачом, назначения стартуют сразу", bullets: ["Начать назначения после консультации", "Отслеживать переносимость", "Зафиксировать сон и энергию"], focus: "старт терапии" },
        { title: "Плановая сдача анализов", date_iso: format(new Date(start.getTime() + 120 * 86400000), "yyyy-MM-dd"), kind: "analysis", analysis_number: 2, description: "Полная панель по тарифу", bullets: ["Сдать полную панель", "Оценить динамику ключевых маркеров", "Скорректировать назначения"], focus: "динамика панели" },
        { title: "Итоги года", date_iso: format(new Date(start.getTime() + 365 * 86400000), "yyyy-MM-dd"), kind: "summary", description: "Финальный чек-ап", bullets: ["Сравнение результатов", "План на следующий год"], focus: "результаты и развитие" },
      ];

  const cleanTitle = (title: string, num?: number) => {
    let next = title
      .replace(/Анализ\s*№\s*\d+\s*[·—-]?\s*/gi, "")
      .replace(/Контрольн(?:ый|ого|ом|ые|ых)\s+анализ(?:а|ы|ов)?\s*№?\s*\d*/gi, "Плановая сдача анализов")
      .replace(/Повторн(?:ый|ого|ом|ые|ых)\s+анализ(?:а|ы|ов)?\s*№?\s*\d*/gi, "Плановая сдача анализов")
      .replace(/Пересдача/gi, "Плановая сдача")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!next && num) next = "Плановая сдача анализов";
    return next || title;
  };

  const milestones = milestonesRaw.map((m) => {
    const num = m.kind === "start" ? 1 : m.kind === "analysis" ? m.analysis_number : undefined;
    return { ...m, title: cleanTitle(m.title, num), _num: num };
  });

  let activeIdx = -1;
  milestones.forEach((m, i) => {
    const d = new Date(m.date_iso);
    if (isBefore(d, today) || isSameDay(d, today)) activeIdx = i;
  });
  if (activeIdx < 0) activeIdx = 0;

  // Time-proportional placement along the curve, with enforced minimum gap so
  // closely-spaced milestones don't pile up and labels stay readable.
  const times = milestones.map((m) => new Date(m.date_iso).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const tSpan = Math.max(1, tMax - tMin);
  const usableW = VB_W - PAD_X * 2;
  const n = milestones.length;
  // Minimum gap between adjacent points so labels (~140px) don't collide.
  const MIN_GAP = n > 1 ? Math.min(usableW / (n - 1), 150) : 0;

  // Initial time-proportional X positions
  const rawX = milestones.map((m) => {
    const t = new Date(m.date_iso).getTime();
    return PAD_X + ((t - tMin) / tSpan) * usableW;
  });
  // Forward pass: enforce min gap
  const xs = [...rawX];
  for (let i = 1; i < n; i++) {
    if (xs[i] < xs[i - 1] + MIN_GAP) xs[i] = xs[i - 1] + MIN_GAP;
  }
  // If overflow past right edge, scale back proportionally
  const maxX = PAD_X + usableW;
  if (xs[n - 1] > maxX) {
    const scale = usableW / (xs[n - 1] - PAD_X);
    for (let i = 0; i < n; i++) xs[i] = PAD_X + (xs[i] - PAD_X) * scale;
  }

  const points = milestones.map((m, i) => ({
    x: xs[i],
    y: MID_Y + (i % 2 === 0 ? -AMP : AMP),
    xPct: (xs[i] - PAD_X) / usableW,
  }));


  const fullPath = buildSmoothPath(points);
  // Progress path = path up to active point
  const passedPath = buildSmoothPath(points.slice(0, Math.max(1, activeIdx + 1)));

  const nextAnalysisMs = milestones.find((m, i) => i > activeIdx && m.kind === "analysis");

  // Convert SVG coords to overlay CSS percentages
  const toLeftPct = (x: number) => (x / VB_W) * 100;
  const toTopPct = (y: number) => (y / VB_H) * 100;

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-4 md:p-6 space-y-5 md:space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-foreground">План здоровья на год</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Плановые сдачи полной панели и ожидаемые улучшения{analysesPerYear ? ` · ${analysesPerYear} анализа в год` : ""}
            </p>
          </div>
          {adherencePct != null && (
            <Badge variant="secondary" className="text-xs">
              Соблюдение: {adherencePct}%
            </Badge>
          )}
        </div>

        {/* Winding-route timeline */}
        <div className="overflow-x-auto md:overflow-visible -mx-2 px-2">
          <div className="relative min-w-[720px] md:min-w-0" style={{ height: 260 }}>
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              aria-hidden
            >
              <defs>
                <linearGradient id="roadmapGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              {/* Base path (dashed, muted) */}
              <path
                d={fullPath}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.35)"
                strokeWidth={2}
                strokeDasharray="6 8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* Passed progress path */}
              <path
                d={passedPath}
                fill="none"
                stroke="url(#roadmapGrad)"
                strokeWidth={3}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Marker overlay */}
            {milestones.map((m, i) => {
              const Icon = KIND_ICON[m.kind] || Sparkles;
              const passed = i < activeIdx;
              const current = i === activeIdx;
              const p = points[i];
              const date = new Date(m.date_iso);
              const above = i % 2 === 0; // matches y selection above
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${toLeftPct(p.x)}%`, top: `${toTopPct(p.y)}%` }}
                >
                  {/* Date + title positioned opposite the curve direction */}
                  {above ? (
                    <div className="absolute bottom-full mb-2 w-[140px] text-center">
                      <div className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                        {format(date, "d MMM yyyy", { locale: ru })}
                      </div>
                      <div className={`text-[11px] md:text-xs font-semibold leading-tight mt-0.5 line-clamp-2 ${i > activeIdx ? "text-muted-foreground" : "text-foreground"}`}>
                        {m.title}
                      </div>
                    </div>
                  ) : null}

                  <div className="relative">
                    {current && <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />}
                    <div
                      className={[
                        "relative w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 z-10 transition-colors duration-300 shadow-sm",
                        passed
                          ? "bg-gradient-primary border-primary text-primary-foreground"
                          : current
                          ? "bg-card border-primary text-primary ring-4 ring-primary/15"
                          : "bg-card border-border text-muted-foreground",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  {!above ? (
                    <div className="absolute top-full mt-2 w-[140px] text-center">
                      <div className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                        {format(date, "d MMM yyyy", { locale: ru })}
                      </div>
                      <div className={`text-[11px] md:text-xs font-semibold leading-tight mt-0.5 line-clamp-2 ${i > activeIdx ? "text-muted-foreground" : "text-foreground"}`}>
                        {m.title}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {milestones.map((m, i) => {
            const passed = i < activeIdx;
            const current = i === activeIdx;
            const future = i > activeIdx;
            const num = (m as any)._num as number | undefined;
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
                    {num ? `Анализ №${num} · ` : ""}{m.title}
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
                Следующая плановая сдача: {format(new Date(nextAnalysisMs.date_iso), "d MMM yyyy", { locale: ru })}
                {(nextAnalysisMs as any)._num ? ` (Анализ №${(nextAnalysisMs as any)._num})` : ""}
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
