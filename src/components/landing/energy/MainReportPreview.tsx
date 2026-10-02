import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, AlertTriangle } from "lucide-react";
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
  { value: "60", label: "страниц" },
  { value: "116", label: "показателей с разбором" },
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
  "В ходе исследования показателей ваших анализов было выявлено, что углеводный обмен, антиоксидантная защита и функция щитовидной железы находятся в стабильном и оптимальном состоянии.\n\nНо, в то же время, обнаружены несколько значимых дисбалансов, которые могут быть связаны с жалобами на усталость, боли и пищеварительный дискомфорт.\n\nВ частности, отмечается нарушение белкового обмена, о чём свидетельствует сниженный уровень альбумина (32,1 г/л), а также повышенная активность иммунной системы по аллергическому типу, что отражается в увеличении уровня эозинофилов (6,02 %). В совокупности эти изменения могут влиять на гормональный фон и снижать общий ресурс организма.";

const STRENGTHS = [
  { lead: "Эффективный углеводный обмен", text: "Показатели глюкозы (4.72 ммоль/л), гликированного гемоглобина (5.05 %) и инсулина (3.1 мкМЕ/мл) находятся в оптимальных значениях, что говорит о стабильном обеспечении клеток энергией и отсутствии инсулинорезистентности." },
  { lead: "Высокая антиоксидантная защита", text: "Уровень коэнзима Q10 (2330 нг/мл) находится на верхней границе нормы, а общий антиоксидантный статус (1.85 ммоль/л) оптимален, что обеспечивает надёжную защиту клеток от оксидативного стресса." },
  { lead: "Сбалансированная работа щитовидной железы", text: "Все ключевые гормоны (ТТГ 1.28 мМЕ/л, fT4 11.13 пмоль/л, fT3 5.33 пмоль/л) и отсутствие антител указывают на здоровую функцию железы, исключая её как причину усталости." },
  { lead: "Низкий риск системного воспаления и атеросклероза", text: "Уровень С-реактивного белка (0.01 мг/л) и индекс атерогенности (0.58) находятся на крайне низком уровне, что свидетельствует о здоровье сосудов и отсутствии хронического системного воспаления." },
];

const DEFICITS = [
  { lead: "Нарушение белкового обмена", text: "Уровень альбумина (32.1 г/л при норме 35–52 г/л) значительно снижен. Это указывает на дефицит основного «строительного материала» в организме, что напрямую влияет на уровень энергии, транспортную функцию крови и способность к восстановлению." },
  { lead: "Активность иммунной системы по аллергическому типу", text: "Повышенный уровень эозинофилов (6.02 % при норме до 5 %) является маркером аллергической реакции, которая, вероятно, связана с пищеварением и может быть причиной Ваших жалоб на вздутие, диарею и боли." },
  { lead: "Ослабление первичного иммунного ответа", text: "Сниженный уровень иммуноглобулина M (0.26 г/л при норме 0.4–2.3 г/л) говорит о потенциальном снижении способности организма быстро реагировать на новые инфекции." },
  { lead: "Дефицит тестостерона", text: "Уровень общего тестостерона (0.16 нмоль/л) находится ниже нормы, что является одной из прямых причин усталости, снижения выносливости и перепадов настроения." },
  { lead: "Пониженная функция печеночных ферментов", text: "Уровни АЛТ (3.8 Ед/л) и АСТ (8.2 Ед/л) ниже референсных значений. Это может указывать на дефицит белка и витамина B6, необходимых для их синтеза." },
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
            <div
              ref={scrollRef}
              className="h-[560px] space-y-10 overflow-y-auto overscroll-contain bg-muted/30 p-3 pb-12 sm:p-5 sm:pb-14 lg:h-[620px]"
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
                          ? "bg-primary/10 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
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
