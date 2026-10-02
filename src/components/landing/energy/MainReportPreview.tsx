import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, TriangleAlert, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkerCard, markers as MARKERS } from "@/components/landing/energy/EnergyExpertResult";

const RESUME =
  "В ходе исследования показателей ваших анализов было выявлено несколько важных закономерностей. Углеводный обмен и функция щитовидной железы находятся в отличном состоянии — это надёжный фундамент энергии и обмена веществ. Вместе с тем обнаружены дисбалансы, требующие внимания: снижение альбумина указывает на недостаточное поступление или усвоение белка, а повышенные эозинофилы — на аллергический фон, который может незаметно истощать ресурсы организма.";

const STRENGTHS = [
  "Идеальный углеводный обмен",
  "Высокая эффективность работы митохондрий",
  "Надёжная антиоксидантная защита",
  "Низкий риск системного воспаления",
];

const DEFICITS = [
  "Дефицит белка и нарушение его усвоения",
  "Аллергический тип иммунного ответа",
  "Пограничный уровень жирорастворимых витаминов",
  "Сниженный тестостерон",
  "Нагрузка на печёночные ферменты",
];

const LIFESTYLE = [
  {
    title: "Питание",
    text: "Увеличьте долю полноценного белка до 1,2–1,5 г на кг веса в день: яйца, рыба, творог, бобовые. Распределите белок равномерно между приёмами пищи — это поддержит уровень альбумина.",
  },
  {
    title: "Сон",
    text: "Отбой до 23:00 и 7,5–8 часов сна. Именно в глубокой фазе сна восстанавливаются митохондрии и нормализуется гормональный фон.",
  },
  {
    title: "Нагрузка",
    text: "2–3 силовые тренировки в неделю и ежедневная ходьба 7–8 тысяч шагов. Силовая нагрузка — главный естественный стимулятор тестостерона.",
  },
];

const RECOMMENDATIONS = [
  {
    title: "Железо (бисглицинат)",
    dose: "25 мг в день, во время еды",
    duration: "3 месяца, затем контроль ферритина",
    note: "Не сочетать с кальцием и чаем — интервал не менее 2 часов.",
  },
  {
    title: "Витамин D3",
    dose: "4000 МЕ в день, утром с жирной пищей",
    duration: "Постоянно, контроль 25(OH)D через 3 месяца",
    note: "Целевой уровень — 40–60 нг/мл.",
  },
];

const SPECIALISTS = [
  {
    title: "Эндокринолог",
    text: "Обсудить уровень тестостерона и стратегию его восстановления без медикаментов.",
  },
  {
    title: "Аллерголог-иммунолог",
    text: "Повышенные эозинофилы и IgM — повод выяснить, на что реагирует иммунная система.",
  },
];

const SECTIONS = [
  { id: "resume", label: "Общее резюме" },
  { id: "strengths", label: "Сильные стороны организма" },
  { id: "deficits", label: "Дефициты и дисфункции" },
  { id: "markers", label: "Расшифровка показателей" },
  { id: "lifestyle", label: "Коррекция образа жизни" },
  { id: "recommendations", label: "Рекомендации" },
  { id: "specialists", label: "Специалисты" },
] as const;

export function MainReportPreview({ id }: { id?: string }) {
  const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));
  const [active, setActive] = useState<string>("resume");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggle = (i: number) =>
    setOpened((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  // Подсветка активного раздела в оглавлении по скроллу
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id.replace("report-section-", ""));
        }
      },
      { root, rootMargin: "-20% 0px -60% 0px" },
    );
    for (const s of SECTIONS) {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Авто-раскрытие карточек показателей при прокрутке
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const idx = Number((e.target as HTMLElement).dataset.markerIndex);
          if (Number.isNaN(idx)) continue;
          setOpened((prev) => {
            if (prev.has(idx)) return prev;
            const n = new Set(prev);
            n.add(idx);
            return n;
          });
        }
      },
      { root, rootMargin: "-35% 0px -35% 0px" },
    );
    markerRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (sid: string) => {
    sectionRefs.current[sid]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id={id} className="border-b hairline py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
            Так выглядит отчёт ReAge
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Каждый показатель разобран так, как ниже: значение, оптимум, что это значит для вас и что делать дальше.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 lg:grid-cols-[1fr_22rem] lg:gap-8">
          {/* Окно отчёта с внутренним скроллом */}
          <div
            ref={scrollRef}
            className="max-h-[34rem] overflow-y-auto rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-6"
          >
            <div className="space-y-8">
              <div
                id="report-section-resume"
                ref={(el) => (sectionRefs.current.resume = el)}
                className="scroll-mt-4"
              >
                <h3 className="mb-3 font-display text-2xl text-foreground">Общее резюме</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{RESUME}</p>
              </div>

              <div
                id="report-section-strengths"
                ref={(el) => (sectionRefs.current.strengths = el)}
                className="scroll-mt-4"
              >
                <h3 className="mb-3 font-display text-2xl text-foreground">Сильные стороны организма</h3>
                <ul className="space-y-2">
                  {STRENGTHS.map((s) => (
                    <li
                      key={s}
                      className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-[15px] text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                id="report-section-deficits"
                ref={(el) => (sectionRefs.current.deficits = el)}
                className="scroll-mt-4"
              >
                <h3 className="mb-3 font-display text-2xl text-foreground">Дефициты и дисфункции</h3>
                <ul className="space-y-2">
                  {DEFICITS.map((s) => (
                    <li
                      key={s}
                      className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                        <TriangleAlert className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                      <span className="text-[15px] text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                id="report-section-markers"
                ref={(el) => (sectionRefs.current.markers = el)}
                className="scroll-mt-4"
              >
                <h3 className="mb-1 font-display text-2xl text-foreground">Расшифровка показателей</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Карточки раскрываются сами по мере прокрутки — или нажмите на карточку.
                </p>
                <div className="space-y-3">
                  {MARKERS.map((m, i) => (
                    <div
                      key={m.code}
                      data-marker-index={i}
                      ref={(el) => (markerRefs.current[i] = el)}
                    >
                      <MarkerCard
                        marker={m}
                        defaultOpen={false}
                        description={m.fallbackDescription}
                        open={opened.has(i)}
                        onToggle={() => toggle(i)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div
                id="report-section-lifestyle"
                ref={(el) => (sectionRefs.current.lifestyle = el)}
                className="scroll-mt-4"
              >
                <h3 className="mb-3 font-display text-2xl text-foreground">Коррекция образа жизни</h3>
                <div className="space-y-3">
                  {LIFESTYLE.map((l) => (
                    <div key={l.title} className="rounded-2xl border border-border/70 bg-card px-5 py-4">
                      <p className="mb-1 font-semibold text-foreground">{l.title}</p>
                      <p className="text-[15px] leading-relaxed text-muted-foreground">{l.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                id="report-section-recommendations"
                ref={(el) => (sectionRefs.current.recommendations = el)}
                className="scroll-mt-4"
              >
                <h3 className="mb-3 font-display text-2xl text-foreground">Рекомендации</h3>
                <div className="space-y-3">
                  {RECOMMENDATIONS.map((r) => (
                    <div key={r.title} className="rounded-2xl border border-border/70 bg-card px-5 py-4">
                      <p className="font-semibold text-foreground">{r.title}</p>
                      <p className="mt-1 text-[15px] text-foreground">{r.dose}</p>
                      <p className="text-sm text-muted-foreground">{r.duration}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                id="report-section-specialists"
                ref={(el) => (sectionRefs.current.specialists = el)}
                className="scroll-mt-4"
              >
                <h3 className="mb-3 font-display text-2xl text-foreground">Специалисты</h3>
                <div className="space-y-3">
                  {SPECIALISTS.map((s) => (
                    <div key={s.title} className="rounded-2xl border border-border/70 bg-card px-5 py-4">
                      <p className="mb-1 font-semibold text-foreground">{s.title}</p>
                      <p className="text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Оглавление */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6">
              <h3 className="mb-3 font-display text-2xl text-foreground">Что внутри отчёта</h3>
              <ul>
                {SECTIONS.map((s) => (
                  <li key={s.id} className="border-b border-border/60 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-[15px] transition-colors",
                        active === s.id
                          ? "bg-primary/10 font-semibold text-foreground"
                          : "text-foreground hover:bg-muted/60",
                      )}
                    >
                      <span>{s.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          active === s.id && "translate-x-0.5 text-primary",
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild size="lg" className="w-full">
              <Link to="/example-report">Открыть полный пример отчёта</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
