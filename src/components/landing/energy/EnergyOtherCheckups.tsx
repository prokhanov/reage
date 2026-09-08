import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

type Accent = "info" | "accent" | "primary";

interface Checkup {
  title: string;
  text: string;
  price: string;
  tag: string;
  accent: Accent;
  visual: JSX.Element;
}

const diamond = (
  <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
    <path d="M50 0 L100 50 L50 100 L0 50 Z" />
  </svg>
);
const circle = (
  <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
    <circle cx="50" cy="50" r="40" />
  </svg>
);
const wave = (
  <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
    <path d="M0 60 Q25 20 50 60 T100 60 V100 H0 Z" />
  </svg>
);
const square = (
  <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
    <rect x="15" y="15" width="70" height="70" rx="18" />
  </svg>
);
const triangle = (
  <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
    <path d="M50 10 L95 90 H5 Z" />
  </svg>
);
const ring = (
  <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
    <path d="M50 5a45 45 0 1 0 0 90 45 45 0 0 0 0-90Zm0 22a23 23 0 1 1 0 46 23 23 0 0 1 0-46Z" />
  </svg>
);
const plus = (
  <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
    <rect x="35" y="10" width="30" height="80" rx="10" />
    <rect x="10" y="35" width="80" height="30" rx="10" />
  </svg>
);

const checkups: Checkup[] = [
  {
    title: "ReAge Thyroid",
    text: "ТТГ, Т4 свободный, антитела к тиреопероксидазе",
    price: "3 990 ₽",
    tag: "Щитовидная железа",
    accent: "info",
    visual: diamond,
  },
  {
    title: "ReAge Iron",
    text: "ОАК, ферритин, железо, трансферрин, ОЖСС, насыщение",
    price: "5 990 ₽",
    tag: "Железодефицит",
    accent: "accent",
    visual: circle,
  },
  {
    title: "ReAge CardioRisk 40+",
    text: "Липиды, воспаление, риск атеросклероза, ApoB",
    price: "7 990 ₽",
    tag: "Сердце и сосуды",
    accent: "primary",
    visual: wave,
  },
  {
    title: "ReAge Metabolic",
    text: "Сахар, инсулин, печень и вес",
    price: "6 990 ₽",
    tag: "Метаболизм",
    accent: "info",
    visual: square,
  },
  {
    title: "ReAge Liver & Fibrosis",
    text: "Ферменты печени, альбумин, FIB-4",
    price: "4 990 ₽",
    tag: "Печень",
    accent: "accent",
    visual: triangle,
  },
  {
    title: "ReAge Kidney Risk",
    text: "Креатинин, eGFR, общий анализ мочи, ACR",
    price: "4 990 ₽",
    tag: "Почки",
    accent: "primary",
    visual: ring,
  },
  {
    title: "ReAge Base 40+",
    text: "Базовая панель после 40 лет",
    price: "7 990 ₽",
    tag: "Базовый чекап",
    accent: "info",
    visual: plus,
  },
];

const accentClasses: Record<
  Accent,
  { text: string; border: string; bg: string; glowFrom: string; glowTo: string }
> = {
  info: {
    text: "text-info",
    border: "border-info/30",
    bg: "bg-info/10",
    glowFrom: "from-info/40",
    glowTo: "to-info/10",
  },
  accent: {
    text: "text-accent",
    border: "border-accent/30",
    bg: "bg-accent/10",
    glowFrom: "from-accent/40",
    glowTo: "to-accent/10",
  },
  primary: {
    text: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/10",
    glowFrom: "from-primary/40",
    glowTo: "to-primary/10",
  },
};

export function EnergyOtherCheckups() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
              Другие чекапы <span className="text-primary">ReAge</span>
            </h2>
            <p className="mt-2 max-w-md text-base text-muted-foreground md:text-lg">
              Выберите персональную программу для глубокого анализа состояния организма.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canPrev}
              aria-label="Предыдущие чекапы"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canNext}
              aria-label="Следующие чекапы"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background via-background/80 to-transparent transition-opacity duration-300 md:w-10 ${canPrev ? "opacity-100" : "opacity-0"}`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background via-background/80 to-transparent transition-opacity duration-300 md:w-10 ${canNext ? "opacity-100" : "opacity-0"}`}
          />
          <div
            ref={trackRef}
            onScroll={update}
            className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:-mx-2 md:gap-7 md:px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {checkups.map((c) => {
              const a = accentClasses[c.accent];
              return (
                <Link
                  key={c.title}
                  to="/"
                  className="group relative block w-[88vw] shrink-0 snap-start rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[26rem] md:w-[30rem]"
                >
                  <div
                    className={`absolute -inset-0.5 rounded-[2.25rem] bg-gradient-to-r ${a.glowFrom} ${a.glowTo} opacity-20 blur-2xl transition duration-500 group-hover:opacity-60`}
                    aria-hidden
                  />

                  <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-card/80 p-6 backdrop-blur-sm transition-colors duration-300 md:p-8">
                    <div
                      className={`absolute -right-12 -top-12 h-48 w-48 rounded-full ${a.bg} blur-3xl transition duration-500 group-hover:opacity-80`}
                      aria-hidden
                    />

                    <span
                      className={`relative mb-6 inline-flex w-fit items-center rounded-full border ${a.border} ${a.bg} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${a.text}`}
                    >
                      {c.tag}
                    </span>

                    <div className="relative mt-auto">
                      <h3 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                        {c.title}
                      </h3>
                      <p className="mt-2 max-w-[28ch] text-base leading-relaxed text-muted-foreground">
                        {c.text}
                      </p>

                      <div className="mt-6 flex items-center justify-between gap-4 md:mt-8">
                        <div>
                          <span className="label-mono mb-1 block">Стоимость</span>
                          <span className="font-display text-2xl font-semibold text-foreground">
                            {c.price}
                          </span>
                        </div>
                        <span className="inline-flex h-12 items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                          Подробнее
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>

                    <div
                      className={`absolute bottom-0 right-0 h-32 w-32 ${a.text} opacity-10 transition-opacity duration-500 group-hover:opacity-20`}
                      aria-hidden
                    >
                      {c.visual}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
