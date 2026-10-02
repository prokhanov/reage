import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkerCard, markers as MARKERS, demoPrescriptions } from "@/components/landing/energy/EnergyExpertResult";
import { PrescriptionCard } from "@/components/prescriptions/PrescriptionCard";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { id: "summary", label: "Общее резюме" },
  { id: "strengths", label: "Сильные стороны организма" },
  { id: "deficits", label: "Дефициты и дисфункции" },
  { id: "markers", label: "Расшифровка показателей" },
  { id: "lifestyle", label: "Коррекция образа жизни" },
  { id: "recs", label: "Рекомендации" },
  { id: "doctors", label: "Специалисты" },
] as const;

const REPORT_STATS = [
  { value: "50+", label: "страниц" },
  { value: "110+", label: "показателей с разбором" },
  { value: "5", label: "систем организма" },
  { value: "1", label: "план действий на всё" },
] as const;

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={`report-${id}`} data-section={id} className="scroll-mt-4">
      <h3 className="mb-4 font-display text-2xl text-foreground">{title}</h3>
      {children}
    </div>
  );
}

const SUMMARY_TEXT =
  "Начнём с хорошего: главные системы — углеводный обмен, антиоксидантная защита и щитовидная железа — работают стабильно и слаженно. Глюкоза и инсулин в идеальных значениях, клетки получают энергию без сбоев, а щитовидка вырабатывает гормоны в нужном ритме. Это важная новость: усталость, с которой вы пришли, точно не от них.\n\nНо картина не полностью благополучная. Белковый обмен проседает: альбумин ниже оптимальной зоны, а ведь из белка строятся ферменты, иммунные клетки и само настроение. Одновременно иммунитет работает по аллергическому типу — повышены эозинофилы, и вероятная причина кроется в реакции на продукты питания.\n\nЭти два изменения связаны между собой. Нехватка белка ослабляет пищеварение, недорасщеплённая еда провоцирует иммунный ответ — отсюда вздутие и дискомфорт после еды, а вслед за ними усталость и медленное восстановление.\n\nВ этом отчёте мы разбираем цепочку целиком: что именно запустило дисбаланс, как показатели влияют друг на друга и какие шаги — питание, коррекция образа жизни, поддержка ферментов — вернут систему в равновесие. Хорошая новость в том, что ситуация полностью обратима.";

const STRENGTHS = [
  { lead: "Идеальный углеводный обмен", text: "Глюкоза, инсулин и гликированный гемоглобин — в оптимальных значениях. Клетки стабильно получают энергию, признаков инсулинорезистентности нет." },
  { lead: "Щитовидная железа ни при чём", text: "Все гормоны железы в норме, антител нет. Значит, усталость не связана со щитовидкой — причину ищем в другом месте отчёта." },
  { lead: "Сосуды чистые, воспаления нет", text: "Маркеры воспаления и холестеринового риска — на самом минимуме. Сердце и сосуды сейчас вне зоны риска." },
];

const DEFICITS = [
  { lead: "Не хватает белка", text: "Альбумин снижен — организму не хватает «строительного материала». Отсюда медленное восстановление, меньше энергии и сил." },
  { lead: "Иммунитет работает по аллергическому типу", text: "Эозинофилы повышены. Вероятная причина — реакция на продукты: она же объясняет вздутие и дискомфорт после еды." },
  { lead: "Одно тянет за собой другое", text: "Печёночные ферменты синтезируются из белка и витамина B6 — из-за белкового дефицита они тоже снижены. Восстановим белок — подтянутся ферменты и общая энергия." },
];

function Row({ lead, text }: { lead: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 sm:px-6">
      <p className="font-semibold text-foreground">{lead}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

export function MainReportPreview({ id }: { id?: string }) {
  const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [tocOpen, setTocOpen] = useState(false);
  const activeIndex = Math.max(0, SECTIONS.findIndex((s) => s.id === active));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      let current: string = SECTIONS[0].id;
      root.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => {
        if (el.offsetTop - root.offsetTop <= root.scrollTop + 80) current = el.dataset.section!;
      });
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = SECTIONS[SECTIONS.length - 1].id;
      setActive(current);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = Number((e.target as HTMLElement).dataset.marker);
          setOpened((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
        });
      },
      { root, rootMargin: "0px 0px -35% 0px", threshold: 0.6 },
    );
    root.querySelectorAll("[data-marker]").forEach((el) => io.observe(el));
    return () => {
      root.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const goTo = (sid: string) => {
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(`#report-${sid}`);
    if (!root || !el) return;
    setOpened(new Set([0, 1, 2]));
    setActive(sid);
    window.setTimeout(() => {
      root.scrollTo({ top: el.offsetTop - root.offsetTop, behavior: "smooth" });
    }, 350);
  };

  return (
    <section id={id} className="border-b hairline py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <div className="max-w-4xl">
          <h2 className="font-display text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
            Отчёт полного чекапа — 60 страниц о вашем организме
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            По каждому показателю — значение, оптимальный диапазон, что это значит для вас и что делать дальше.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 md:mt-10">
          {REPORT_STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/70 bg-card px-4 py-4 sm:px-5 sm:py-5">
              <p className="font-display text-2xl leading-none text-foreground sm:text-3xl">{stat.value}</p>
              <p className="mt-2 text-xs leading-snug text-muted-foreground sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-6">
          <div className="relative rounded-2xl border border-border/70 bg-card p-2 shadow-sm sm:p-3">
            <div className="pointer-events-none absolute inset-x-5 -bottom-2 -z-10 h-full rounded-2xl border border-border/60 bg-muted/60" />
            <div className="pointer-events-none absolute inset-x-8 -bottom-4 -z-20 h-full rounded-2xl border border-border/50 bg-muted/40" />
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-3 sm:px-4">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground sm:text-xs">Фрагмент персонального отчёта</p>
              <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:text-xs">1 из 116 показателей</p>
            </div>
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                aria-expanded={tocOpen}
                className="flex w-full items-center gap-3 border-b border-border/70 bg-card px-3 py-3 text-left sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Содержание · {activeIndex + 1} из {SECTIONS.length}
                  </p>
                  <p className="truncate text-base font-semibold text-foreground">{SECTIONS[activeIndex].label}</p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${((activeIndex + 1) / SECTIONS.length) * 100}%` }}
                    />
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", tocOpen && "rotate-180")} />
              </button>
              <ul
                className={cn(
                  "absolute inset-x-0 top-full z-20 origin-top space-y-1 border-b border-border/70 bg-card p-2 shadow-lg transition-all duration-300",
                  tocOpen ? "visible scale-y-100 opacity-100" : "invisible scale-y-95 opacity-0",
                )}
              >
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTocOpen(false);
                        goTo(s.id);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-base",
                        active === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground",
                      )}
                    >
                      <span>{s.label}</span>
                      <span className="ml-3 text-sm tabular-nums opacity-60">0{i + 1}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div
              ref={scrollRef}
              className="h-[min(560px,65vh)] space-y-10 overflow-y-auto overscroll-auto bg-muted/30 p-3 pb-12 sm:p-5 sm:pb-14 lg:h-[620px] lg:overscroll-contain"
            >
              <Block id="summary" title="Общее резюме">
                <div className="rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-6">
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{SUMMARY_TEXT}</p>
                </div>
              </Block>

              <Block id="strengths" title="Сильные стороны организма">
                <div className="space-y-3">
                  {STRENGTHS.map((s) => (
                    <div key={s.lead} className="flex gap-3.5 rounded-2xl border border-status-optimal/30 bg-status-optimal/5 px-5 py-4 sm:px-6">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-optimal/15 text-status-optimal">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{s.lead}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Block>

              <Block id="deficits" title="Дефициты и дисфункции">
                <div className="space-y-3">
                  {DEFICITS.map((s) => (
                    <div key={s.lead} className="flex gap-3.5 rounded-2xl border border-status-warning/30 bg-status-warning/5 px-5 py-4 sm:px-6">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-warning/15 text-status-warning">
                        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{s.lead}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Block>

              <Block id="markers" title="Расшифровка показателей">
                <div className="space-y-3">
                  {MARKERS.map((m, i) => (
                    <div
                      key={m.code}
                      data-marker={i}
                      className={cn(
                        "transition-all duration-700 ease-out",
                        opened.has(i) ? "translate-y-0 opacity-100" : "translate-y-3 opacity-80",
                      )}
                    >
                      <MarkerCard
                        marker={m}
                        defaultOpen={false}
                        description={m.fallbackDescription}
                        open={opened.has(i)}
                        onToggle={() =>
                          setOpened((prev) => {
                            const n = new Set(prev);
                            n.has(i) ? n.delete(i) : n.add(i);
                            return n;
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </Block>

              <Block id="lifestyle" title="Коррекция образа жизни">
                <div className="space-y-3">
                  <Row lead="Питание" text="Красное мясо, печень или бобовые 3–4 раза в неделю, вместе с продуктами, богатыми витамином C. Чай и кофе — не раньше чем через час после еды." />
                  <Row lead="Сон" text="7–8 часов, отбой до 23:30. При дефиците железа восстановление после нагрузки идёт медленнее." />
                  <Row lead="Нагрузка" text="Умеренное кардио 3 раза в неделю, без изнуряющих тренировок до восстановления запасов железа." />
                </div>
              </Block>

              <Block id="recs" title="Рекомендации">
                <div className="space-y-3">
                  {demoPrescriptions.map((p, i) => (
                    <PrescriptionCard key={p.id} prescription={p} index={i} />
                  ))}
                </div>
              </Block>

              <Block id="doctors" title="Специалисты">
                <div className="space-y-3">
                  <Row lead="Терапевт" text="Обсудить причины низкого ферритина и план восполнения железа." />
                  <Row lead="Гинеколог" text="При обильных менструациях — оценить возможную причину потери железа." />
                </div>
              </Block>
            </div>
            <div className="pointer-events-none absolute inset-x-2 bottom-2 h-10 rounded-b-xl bg-gradient-to-t from-card to-transparent sm:inset-x-3 sm:bottom-3" />
          </div>

          <aside className="space-y-3 lg:sticky lg:top-24">
            <nav className="rounded-2xl border border-border/70 bg-card p-3 sm:p-4" aria-label="Оглавление отчёта">
              <h3 className="px-2 pb-4 font-display text-2xl text-foreground">Что внутри отчёта</h3>
              <ul className="space-y-2">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => goTo(s.id)}
                      className={cn(
                        "h-auto w-full justify-between whitespace-normal rounded-lg px-2.5 py-3 text-left text-base font-normal",
                        active === s.id
                          ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span>{s.label}</span>
                      <span className="ml-3 shrink-0 text-sm tabular-nums opacity-60">0{i + 1}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>

            <Button asChild className="h-12 w-full">
              <Link to="/example-report">Открыть полный пример</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 w-full">
              <Link to="/demo-report">Открыть демо-кабинет</Link>
            </Button>
            <p className="px-1 text-sm leading-snug text-muted-foreground">
              В тематических чекапах отчёт короче — только по выбранным показателям.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
