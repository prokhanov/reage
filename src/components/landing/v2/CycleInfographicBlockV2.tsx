import { Syringe, FileText, Stethoscope, ListChecks, TrendingUp, RefreshCw, Heart, type LucideIcon } from "lucide-react";

/**
 * CycleInfographicBlockV2 — самостоятельная перерисовка блока «Как это работает».
 * Все параметры вынесены в константы наверху, чтобы легко редактировать
 * геометрию кольца, размеры карточек, тексты и стили.
 */

// ───────────────────────── DATA ─────────────────────────
type Step = {
  num: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

const STEPS: Step[] = [
  { num: "шаг 1", icon: Syringe,     title: "Сдаёте анализы",         subtitle: "На дому или в клинике — 100+ показателей" },
  { num: "шаг 2", icon: FileText,    title: "Получаете отчёт",        subtitle: "Понятная расшифровка с интерпретацией врача" },
  { num: "шаг 3", icon: Stethoscope, title: "Консультация врача",     subtitle: "Разбираем результаты и составляем стратегию" },
  { num: "шаг 4", icon: ListChecks,  title: "Внедряете рекомендации", subtitle: "Питание, добавки, привычки — по персональному плану" },
  { num: "шаг 5", icon: TrendingUp,  title: "Отслеживаете динамику",  subtitle: "Видите как показатели меняются в лучшую сторону" },
];

// ───────────────────────── GEOMETRY ─────────────────────────
const CANVAS = 820;         // размер квадратного канваса
const RADIUS_PCT = 38;      // радиус кольца, % от стороны канваса (φ-соотношение с центром)
const CARD_W = 224;
const CARD_H = 138;

// первая карточка сверху; шаг 72° (5 равных секторов)
const stepAngle = 360 / STEPS.length;
const CARD_ANGLES = STEPS.map((_, i) => -90 + i * stepAngle);
// стрелки — по середине между карточками
const ARROW_ANGLES = STEPS.map((_, i) => -90 + i * stepAngle + stepAngle / 2);

// ───────────────────────── COMPONENT ─────────────────────────
export function CycleInfographicBlockV2() {
  const R_PX = (RADIUS_PCT / 100) * CANVAS;

  return (
    <section className="relative pt-8 pb-2 md:pt-10 md:pb-3 overflow-hidden">
      {/* фон */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[140px]"
        style={{ width: 520, height: 520 }}
      />

      <div className="relative z-10 container mx-auto px-4">
        {/* Заголовок */}
        <header className="text-center max-w-3xl mx-auto mb-2 md:mb-3">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in">
            <span className="text-foreground">Как это </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">работает</span>
          </h2>
          <p
            className="mt-4 text-base md:text-lg text-muted-foreground animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Замкнутый цикл заботы о здоровье — от анализа до устойчивого результата
          </p>
        </header>

        {/* ─────── Desktop: круговая композиция ─────── */}
        <div
          className="hidden lg:block relative mx-auto mt-2"
          style={{ width: "100%", maxWidth: CANVAS, aspectRatio: "1 / 1" }}
        >
          <CycleRing radius={R_PX} arrowAngles={ARROW_ANGLES} />
          <CycleCenter />

          {STEPS.map((step, i) => {
            const rad = (CARD_ANGLES[i] * Math.PI) / 180;
            const xPct = 50 + Math.cos(rad) * RADIUS_PCT;
            const yPct = 50 + Math.sin(rad) * RADIUS_PCT;
            return (
              <div
                key={step.num}
                className="absolute"
                style={{ left: `${xPct}%`, top: `${yPct}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className="animate-fade-in" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                  <StepCard step={step} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ─────── Mobile / Tablet: вертикальный таймлайн ─────── */}
        <div className="lg:hidden max-w-xl mx-auto">
          <MobileTimeline />
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── SUBCOMPONENTS ─────────────────────────

function CycleRing({ radius, arrowAngles }: { radius: number; arrowAngles: number[] }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="cycleV2Stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      <circle
        cx={CANVAS / 2}
        cy={CANVAS / 2}
        r={radius}
        fill="none"
        stroke="url(#cycleV2Stroke)"
        strokeWidth={1.5}
        strokeDasharray="5 9"
        strokeLinecap="round"
      />

      {arrowAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x = CANVAS / 2 + Math.cos(rad) * radius;
        const y = CANVAS / 2 + Math.sin(rad) * radius;
        const rot = deg + 90; // касательная
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <polygon points="-7,-5 9,0 -7,5" fill="hsl(var(--primary))" opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
}

function CycleCenter() {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      <div className="flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: "0.6s" }}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-2xl scale-125" />
          <div className="relative flex flex-col items-center justify-center w-[220px] h-[220px] rounded-full bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/25 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.35)] backdrop-blur-sm px-6">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-card border border-primary/30 mb-3">
              <Heart className="w-5 h-5 text-primary" strokeWidth={2} fill="hsl(var(--primary) / 0.15)" />
            </div>
            <div className="text-[15px] font-semibold text-foreground leading-snug">
              Ваше здоровье<br />под контролем
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              цикл повторяется
            </div>
            <div className="text-[13px] font-medium text-foreground/80">
              2–4 раза в год
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="group relative" style={{ width: CARD_W, height: CARD_H }}>
      {/* градиентная обводка */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 via-transparent to-accent/30 opacity-70" />
      {/* hover-свечение */}
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

      <div className="relative h-full rounded-2xl bg-card/95 backdrop-blur-md p-4 shadow-[0_8px_28px_-12px_hsl(var(--foreground)/0.28)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_16px_40px_-14px_hsl(var(--primary)/0.35)] flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/12 to-accent/12 border border-primary/20">
            <Icon className="w-[18px] h-[18px] text-primary" strokeWidth={1.75} />
          </div>
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70 -mt-2 -mr-2">
            {step.num}
          </span>
        </div>
        <h3
          className={`text-[15px] font-semibold text-foreground leading-snug ${
            step.num === "шаг 5" ? "whitespace-nowrap" : ""
          }`}
        >
          {step.title}
        </h3>
        <p className="text-[12px] text-muted-foreground leading-snug">
          {step.subtitle}
        </p>
      </div>
    </div>
  );
}

function MobileTimeline() {
  return (
    <div className="relative">
      <div
        className="absolute left-6 top-6 bottom-6 w-px border-l-2 border-dashed"
        style={{ borderColor: "hsl(var(--primary) / 0.3)" }}
        aria-hidden
      />
      <div className="space-y-5">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="relative pl-16 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div className="absolute left-0 top-0 flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border/60 shadow-md">
                <Icon className="w-5 h-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="rounded-2xl bg-card/70 backdrop-blur-sm border border-border/50 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    {step.title}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold tracking-widest text-muted-foreground/70">
                    {step.num}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-snug">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}

        <div className="relative pl-16 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="absolute left-0 top-0 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
            <RefreshCw className="w-5 h-5 text-primary" strokeWidth={1.75} />
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">
              Непрерывный цикл
            </div>
            <div className="text-base font-semibold text-foreground">
              Повторяется 2–4 раза в год
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
