import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Tone = "bad" | "warn" | "ok";

type Marker = {
  name: string;
  value: string;
  status: string;
  tone: Tone;
  marker: number; // 0..100 позиция значения на шкале
  optimal: [number, number]; // зелёная зона, %
  range: string;
  about: string;
  feel: string;
  next: string;
};

const MARKERS: Marker[] = [
  {
    name: "Ферритин",
    value: "12 нг/мл",
    status: "значительно ниже оптимума",
    tone: "bad",
    marker: 11,
    optimal: [45, 80],
    range: "Оптимальный диапазон 45–80 нг/мл · лабораторная норма начинается от [значение лаборатории]",
    about:
      "Ферритин показывает запасы железа. Значение формально может попадать в лабораторную норму, но запасы почти исчерпаны: гемоглобин пока держится за счёт резервов.",
    feel: "Утренняя разбитость, зябкость, выпадение волос, падение выносливости.",
    next: "скорректировать питание, обсудить с врачом восполнение железа, пересдать через 8–12 недель.",
  },
  {
    name: "Витамин D",
    value: "24 нг/мл",
    status: "ниже оптимума",
    tone: "warn",
    marker: 30,
    optimal: [50, 80],
    range: "Оптимальный диапазон 40–60 нг/мл · лабораторная норма начинается от [значение лаборатории]",
    about:
      "Витамин D влияет на иммунитет, настроение, мышцы и усвоение кальция. Уровень ниже оптимума часто встречается осенью и зимой.",
    feel: "Частые простуды, сниженное настроение, мышечная слабость.",
    next: "обсудить с врачом дозировку витамина D, пересдать через 8–12 недель.",
  },
  {
    name: "Гемоглобин",
    value: "138 г/л",
    status: "в оптимуме",
    tone: "ok",
    marker: 62,
    optimal: [45, 80],
    range: "Оптимальный диапазон 130–150 г/л",
    about:
      "Гемоглобин переносит кислород. Сейчас он в оптимуме, но при низком ферритине его стоит контролировать в динамике.",
    feel: "Жалоб, связанных с этим показателем, обычно нет.",
    next: "контролировать вместе с ферритином при следующей сдаче.",
  },
];

const SECTIONS = [
  { id: "markers", label: "Расшифровка показателей" },
  { id: "lifestyle", label: "Коррекция образа жизни" },
  { id: "recs", label: "Рекомендации" },
  { id: "doctors", label: "Специалисты" },
] as const;

const toneBadge: Record<Tone, string> = {
  bad: "bg-destructive/10 text-destructive",
  warn: "bg-warning/15 text-warning-foreground",
  ok: "bg-muted text-foreground/70",
};

function MarkerCard({ m, open, onToggle }: { m: Marker; open: boolean; onToggle: () => void }) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-colors",
        open && m.tone === "bad" ? "border-destructive/15 bg-destructive/[0.04]" : "border-border/70 bg-card",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span className="font-semibold text-foreground">{m.name}</span>
        <span className="flex items-center gap-3">
          <span className="font-semibold text-foreground">{m.value}</span>
          <span className={cn("rounded-md px-2.5 py-1 text-xs font-medium sm:text-sm", toneBadge[m.tone])}>
            {m.status}
          </span>
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="relative h-2 rounded-full bg-muted">
            <div
              className="absolute inset-y-0 rounded-full bg-primary/50"
              style={{ left: `${m.optimal[0]}%`, width: `${m.optimal[1] - m.optimal[0]}%` }}
            />
            <div
              className="absolute -top-1 h-4 w-1 rounded-full bg-foreground"
              style={{ left: `${m.marker}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">{m.range}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-foreground sm:text-base">{m.about}</p>
          <p className="mt-4 text-sm font-semibold text-foreground">Как это может ощущаться</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/80 sm:text-base">{m.feel}</p>
          <div className="mt-4 rounded-xl bg-card px-4 py-3 text-sm leading-relaxed text-foreground sm:text-[15px]">
            <span className="font-semibold">Что делать дальше:</span> {m.next}
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={`report-${id}`} data-section={id} className="scroll-mt-4">
      <h3 className="mb-4 font-display text-2xl text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Row({ lead, text }: { lead: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 sm:px-6">
      <p className="font-semibold text-foreground">{lead}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

export function MainReportPreview({ id }: { id?: string }) {
  const [openMarker, setOpenMarker] = useState(0);
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
    return () => root.removeEventListener("scroll", onScroll);
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
              <Block id="markers" title="Расшифровка показателей">
                <div className="space-y-3">
                  {MARKERS.map((m, i) => (
                    <MarkerCard
                      key={m.name}
                      m={m}
                      open={openMarker === i}
                      onToggle={() => setOpenMarker(openMarker === i ? -1 : i)}
                    />
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
                  <Row lead="Обсудить с врачом" text="Восполнение железа и витамина D: форма, дозировка и длительность подбираются врачом." />
                  <Row lead="Контроль" text="Пересдать ферритин, витамин D и общий анализ крови через 8–12 недель и сравнить с текущими результатами." />
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
