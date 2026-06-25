import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  Activity,
  FileText,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

type Item = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  bullets: string[];
};

const items: Item[] = [
  {
    icon: CalendarCheck,
    title: "Чекап 4 раза в год",
    subtitle:
      "Берём анализы у вас дома или в клинике и отслеживаем изменения показателей в динамике.",
    bullets: [
      "Выезд медсестры на дом в удобное время",
      "Партнёрская сеть лабораторий в Москве и СПб",
      "Напоминания и автоматическая запись",
    ],
  },
  {
    icon: Activity,
    title: "Глубокий анализ",
    subtitle:
      "Анализ крови по 100+ показателям для комплексной оценки ключевых систем организма.",
    bullets: [
      "Гормоны, метаболизм, воспаление, дефициты",
      "Биологический возраст и темп старения",
      "Сравнение с динамикой ваших предыдущих анализов",
    ],
  },
  {
    icon: FileText,
    title: "Понятная расшифровка",
    subtitle:
      "Объясняем каждый показатель и взаимосвязи между ними простым языком.",
    bullets: [
      "Цветные шкалы вместо «норма / не норма»",
      "Связь между системами организма",
      "PDF-отчёт, который можно показать врачу",
    ],
  },
  {
    icon: Stethoscope,
    title: "Рекомендации врача",
    subtitle:
      "Персональный план по добавкам, питанию и образу жизни — без воды и общих фраз.",
    bullets: [
      "Конкретные дозировки и формы препаратов",
      "Корректировки после каждого нового чекапа",
      "Связь с куратором между анализами",
    ],
  },
];

function useScrollProgress(containerRef: React.RefObject<HTMLElement>) {
  const [progress, setProgress] = useState(0); // 0..1 across the section
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Start filling when top crosses viewport center, finish when bottom reaches center.
      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const p = total > 0 ? scrolled / total : 0;
      setProgress(p);
      const idx = Math.min(
        items.length - 1,
        Math.floor(p * items.length + 0.0001),
      );
      setActive(idx);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [containerRef]);

  return { progress, active };
}

export function HowItWorksBlock() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { progress, active } = useScrollProgress(wrapRef);

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
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">
              Как устроено сопровождение
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Что входит в годовую программу
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Четыре шага, которые превращают разрозненные анализы в системный
            контроль за здоровьем — от забора крови до конкретных назначений.
          </p>
        </div>

        {/* Mobile: stacked timeline */}
        <div className="lg:hidden relative pl-10">
          <div
            aria-hidden
            className="absolute left-4 top-2 bottom-2 w-px bg-border"
          />
          <div
            aria-hidden
            className="absolute left-4 top-2 w-px bg-gradient-to-b from-primary to-primary/40"
            style={{ height: `${Math.min(progress, 1) * 100}%` }}
          />
          <ul className="space-y-8">
            {items.map((item, i) => {
              const Icon = item.icon;
              const isActive = i <= active;
              return (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors duration-500 ${
                      isActive
                        ? "bg-primary border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold tabular-nums ${
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </span>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {item.subtitle}
                  </p>
                  <ul className="space-y-1.5">
                    {item.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="text-xs text-muted-foreground/90 flex gap-2"
                      >
                        <span className="text-primary mt-0.5">—</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Desktop: sticky timeline rail + scrolling content */}
        <div ref={wrapRef} className="hidden lg:grid grid-cols-12 gap-12">
          {/* Sticky left rail */}
          <aside className="col-span-4">
            <div className="sticky top-28">
              <div className="relative pl-12">
                {/* Background line */}
                <div
                  aria-hidden
                  className="absolute left-[19px] top-2 bottom-2 w-px bg-border"
                />
                {/* Progress line */}
                <div
                  aria-hidden
                  className="absolute left-[19px] top-2 w-px bg-gradient-to-b from-primary via-primary to-primary/40 transition-[height] duration-300"
                  style={{ height: `calc(${Math.min(progress, 1) * 100}% - 4px)` }}
                />

                <ul className="space-y-10">
                  {items.map((item, i) => {
                    const isActive = i === active;
                    const isDone = i < active;
                    return (
                      <li key={i} className="relative">
                        <span
                          className={`absolute -left-12 top-0 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500 ${
                            isActive
                              ? "bg-primary border-primary scale-110 shadow-[0_0_0_8px_hsl(var(--primary)/0.12)]"
                              : isDone
                              ? "bg-primary/80 border-primary/80"
                              : "bg-background border-border"
                          }`}
                        >
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              isActive || isDone
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </span>
                        <p
                          className={`text-sm font-semibold transition-colors duration-500 ${
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground/70"
                          }`}
                        >
                          {item.title}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>

          {/* Scrolling content */}
          <div className="col-span-8 space-y-24">
            {items.map((item, i) => {
              const Icon = item.icon;
              const step = String(i + 1).padStart(2, "0");
              return (
                <article key={i} className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
                      Шаг {step}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex items-start gap-5 mb-5">
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold text-foreground tracking-tight">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ul className="grid sm:grid-cols-2 gap-3 mt-6">
                    {item.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="flex gap-3 p-4 rounded-xl bg-card/50 border border-border/40 backdrop-blur-sm"
                      >
                        <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-sm text-foreground/90 leading-relaxed">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
