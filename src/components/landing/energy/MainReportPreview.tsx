import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkerCard, markers as MARKERS, demoPrescriptions } from "@/components/landing/energy/EnergyExpertResult";
import { PrescriptionCard } from "@/components/prescriptions/PrescriptionCard";

const SECTIONS = [
  { id: "summary", label: "Общее резюме" },
  { id: "strengths", label: "Сильные стороны организма" },
  { id: "deficits", label: "Дефициты и дисфункции" },
  { id: "markers", label: "Расшифровка показателей" },
  { id: "lifestyle", label: "Коррекция образа жизни" },
  { id: "recs", label: "Рекомендации" },
  { id: "doctors", label: "Специалисты" },
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
  "Углеводный обмен, антиоксидантная защита и функция щитовидной железы — в стабильном и оптимальном состоянии. При этом выявлены несколько значимых дисбалансов, которые могут быть связаны с усталостью и пищеварительным дискомфортом: нарушение белкового обмена (альбумин 32,1 г/л) и повышенная активность иммунной системы по аллергическому типу (эозинофилы 6,02 %).";

const STRENGTHS = [
  { lead: "Эффективный углеводный обмен", text: "Глюкоза 4,72 ммоль/л, гликированный гемоглобин 5,05 % и инсулин 3,1 мкМЕ/л в оптимальных значениях — клетки стабильно обеспечены энергией, инсулинорезистентности нет." },
  { lead: "Высокая антиоксидантная защита", text: "Коэнзим Q10 2330 нг/мл на верхней границе нормы, общий антиоксидантный статус 1,85 ммоль/л оптимален — клетки надёжно защищены от оксидативного стресса." },
  { lead: "Сбалансированная работа щитовидной железы", text: "ТТГ 1,28 мМЕ/л, Т4 свободный 11,13 пмоль/л, Т3 свободный 5,33 пмоль/л и отсутствие антител — железа работает здорово и не является причиной усталости." },
  { lead: "Низкий риск воспаления и атеросклероза", text: "С-реактивный белок 0,01 мг/л и индекс атерогенности 0,58 на крайне низком уровне — сосуды здоровы, хронического системного воспаления нет." },
];

const DEFICITS = [
  { lead: "Нарушение белкового обмена", text: "Альбумин 32,1 г/л при норме 35–52 г/л значительно снижен — дефицит основного «строительного материала» влияет на энергию, транспортную функцию крови и восстановление." },
  { lead: "Иммунная активность по аллергическому типу", text: "Эозинофилы 6,02 % при норме до 5 % — маркер аллергической реакции, вероятно связанной с пищеварением: вздутие, диарея, боли." },
  { lead: "Ослабление первичного иммунного ответа", text: "Иммуноглобулин M 0,26 г/л при норме 0,4–2,3 г/л — организму сложнее быстро реагировать на новые инфекции." },
  { lead: "Дефицит тестостерона", text: "Общий тестостерон 0,16 нмоль/л ниже нормы — одна из прямых причин усталости, снижения выносливости и перепадов настроения." },
  { lead: "Пониженные печёночные ферменты", text: "АЛТ 3,8 Ед/л и АСТ 8,2 Ед/л ниже референса — возможный дефицит белка и витамина B6, необходимых для их синтеза." },
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const top = root.getBoundingClientRect().top;
      let current: string = SECTIONS[0].id;
      root.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => {
        if (el.getBoundingClientRect().top - top < 80) current = el.dataset.section!;
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
    root.scrollTo({ top: el.offsetTop - root.offsetTop, behavior: "smooth" });
  };

  return (
    <section id={id} className="border-b hairline py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
              Так выглядит отчёт
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              По каждому показателю — значение, оптимальный диапазон, что это значит для вас и что делать дальше.
            </p>
          </div>
          <Link
            to="/example-report"
            className="shrink-0 font-semibold text-primary underline decoration-dotted underline-offset-4"
          >
            Открыть полный пример →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 lg:grid-cols-[1fr_17rem] lg:gap-10">
          {/* Оглавление: на мобиле — чипы сверху, на десктопе — справа */}
          <nav className="order-first -mx-4 overflow-x-auto px-4 lg:order-last lg:mx-0 lg:px-0">
            <ul className="flex gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1">
              {SECTIONS.map((s, i) => (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors lg:rounded-xl lg:border-0 lg:border-l-2 lg:px-4 lg:py-3 lg:text-[15px]",
                      active === s.id
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border/70 text-muted-foreground hover:text-foreground lg:border-border",
                    )}
                  >
                    <span className="hidden text-xs tabular-nums opacity-60 lg:inline">0{i + 1}</span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="relative">
            <div
              ref={scrollRef}
              className="h-[560px] space-y-10 overflow-y-auto overscroll-contain rounded-2xl bg-muted/40 p-4 sm:p-6 lg:h-[620px]"
            >
              <Block id="summary" title="Общее резюме">
                <div className="rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-6">
                  <p className="text-[15px] leading-relaxed text-foreground/90">{SUMMARY_TEXT}</p>
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-2xl bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
