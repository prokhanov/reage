import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Activity, FileText, Stethoscope, type LucideIcon } from "lucide-react";

type Item = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

const items: Item[] = [
  {
    icon: CalendarCheck,
    title: "Чекап 4 раза в год",
    subtitle:
      "Берём анализы у вас дома или в клинике и отслеживаем изменения показателей в динамике",
  },
  {
    icon: Activity,
    title: "Глубокий анализ",
    subtitle:
      "Анализ крови на 100+ показателей для комплексной проверки ключевых систем организма",
  },
  {
    icon: FileText,
    title: "Понятная расшифровка",
    subtitle:
      "Объясняем все показатели и взаимосвязи — что происходит с организмом и почему",
  },
  {
    icon: Stethoscope,
    title: "Рекомендации врача",
    subtitle:
      "Персональный план по приёму витаминов и минералов, питанию и образу жизни",
  },
];

function useActiveStep(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to viewport center among intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const idx = Number((visible[0].target as HTMLElement).dataset.step);
          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      {
        rootMargin: "-40% 0px -50% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count]);

  const setRef = (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
  };

  return { active, setRef };
}

export function HowItWorksBlock() {
  const { active, setRef } = useActiveStep(items.length);

  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[120%] h-[60%] opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, hsl(var(--primary) / 0.10) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 max-w-6xl">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">
              Как устроено сопровождение
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Что входит в годовую программу
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Четыре шага, которые превращают разрозненные анализы в системный контроль за здоровьем — от забора крови до конкретных назначений.
          </p>
        </div>

        {/* Mobile: simple stacked cards */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-5">
          {items.map((item, i) => {
            const Icon = item.icon;
            const step = String(i + 1).padStart(2, "0");
            return (
              <article
                key={i}
                className="flex flex-col p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-3xl font-bold text-muted-foreground/30 tabular-nums">
                    {step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground leading-snug mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.subtitle}
                </p>
              </article>
            );
          })}
        </div>

        {/* Desktop/tablet: scroll column + sticky timeline */}
        <div className="hidden lg:grid grid-cols-12 gap-10 items-start">
          <div className="col-span-7 flex flex-col">
            {items.map((item, i) => {
              const Icon = item.icon;
              const step = String(i + 1).padStart(2, "0");
              const isActive = i === active;
              return (
                <article
                  key={i}
                  ref={setRef(i)}
                  data-step={i}
                  className="min-h-[50vh] flex flex-col justify-start py-6 first:pt-0"
                >
                  <div
                    className={`p-8 rounded-2xl border backdrop-blur-sm transition-all duration-500 ${
                      isActive
                        ? "bg-card/80 border-primary/40 shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.35)]"
                        : "bg-card/40 border-border/30 opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-500 ${
                          isActive
                            ? "bg-primary/15 border-primary/30 scale-105"
                            : "bg-primary/5 border-primary/10"
                        }`}
                      >
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <span
                        className={`text-4xl font-bold tabular-nums transition-colors duration-500 ${
                          isActive ? "text-primary/50" : "text-muted-foreground/25"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-foreground leading-snug mb-3">
                      {item.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="col-span-5">
            <div className="sticky top-24">
              <TimelineRail activeIndex={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineRail({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative w-full pl-2">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8">
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-primary">
          Timeline
        </span>
      </div>

      <div className="relative">
        {/* Vertical dashed line */}
        <div
          aria-hidden
          className="absolute left-[15px] top-2 bottom-2 w-px border-l border-dashed border-border"
        />

        <ul className="flex flex-col gap-5">
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            return (
              <li key={i} className="relative flex items-center gap-4">
                <span
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 ${
                    isActive
                      ? "bg-primary border-primary scale-110 shadow-[0_0_0_6px_hsl(var(--primary)/0.15)]"
                      : "bg-muted border-border"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                </span>
                <div
                  className={`flex-1 rounded-full px-5 py-3 transition-all duration-500 ${
                    isActive
                      ? "bg-primary/15 border border-primary/30"
                      : "bg-card/40 border border-border/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isActive
                          ? "w-10 bg-primary"
                          : "w-6 bg-muted-foreground/30"
                      }`}
                    />
                    <span
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isActive
                          ? "w-20 bg-primary/60"
                          : "w-14 bg-muted-foreground/20"
                      }`}
                    />
                    <span
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isActive
                          ? "w-14 bg-primary/40"
                          : "w-10 bg-muted-foreground/15"
                      }`}
                    />
                  </div>
                  <p
                    className={`mt-2 text-xs font-medium truncate transition-colors duration-500 ${
                      isActive ? "text-foreground" : "text-muted-foreground/70"
                    }`}
                  >
                    {item.title}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
