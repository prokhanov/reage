import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { CHECKUPS, money } from "@/data/checkups";
import { FULL_CHECKUP } from "@/data/fullCheckup";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import { useResolvedCheckups } from "@/hooks/useResolvedCheckups";

import { accentClasses, checkupShape } from "./checkupShapes";

function markerWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "показатель";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "показателя";
  return "показателей";
}

interface Props {
  /** Текущий чекап скрывается из карусели. */
  currentSlug?: string;
}

export function EnergyOtherCheckups({ currentSlug }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const { priceOf, isActive } = useCheckupSettings();
  const { variantsFor, groupsOf } = useResolvedCheckups();

  const items = [FULL_CHECKUP, ...CHECKUPS].filter(
    (c) => c.slug !== currentSlug && isActive(c.slug),
  );

  // Полный чекап: цена «от» — минимальная среди вариантов, состав — максимального.
  const fullVariants = useMemo(() => variantsFor(FULL_CHECKUP.slug), [variantsFor]);
  const fullMaxVariant = useMemo(
    () =>
      fullVariants.length
        ? fullVariants.reduce((max, v) => (v.checkup.price > max.checkup.price ? v : max))
        : null,
    [fullVariants],
  );
  const fullGroups = useMemo(
    () => groupsOf(fullMaxVariant ? fullMaxVariant.checkup.slug : FULL_CHECKUP.slug),
    [fullMaxVariant, groupsOf],
  );
  const fullMaxCount = useMemo(
    () => fullGroups.reduce((n, g) => n + g.markers.length, 0),
    [fullGroups],
  );
  const fullMinPrice = useMemo(() => {
    const prices = fullVariants.length
      ? fullVariants.map((v) => v.checkup.price)
      : [priceOf(FULL_CHECKUP.slug, FULL_CHECKUP.price)];
    return Math.min(...prices);
  }, [fullVariants, priceOf]);

  const fullCardText = `${fullMaxCount} ${markerWord(fullMaxCount)} по ${
    fullGroups.length === 5 ? "пяти" : fullGroups.length
  } системам организма, отчёт и консультация врача`;

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
            {items.map((c) => {
              const a = accentClasses[c.accent];
              return (
                <Link
                  key={c.slug}
                  to={c.href}
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

                    <div className="relative mt-auto flex flex-col">
                      <div className="min-h-[6rem]">
                        <h3 className="font-display text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                          {c.name}
                        </h3>
                        <p className="mt-2 max-w-[28ch] text-base leading-relaxed text-muted-foreground">
                          {c.slug === FULL_CHECKUP.slug ? fullCardText : c.cardText}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="label-mono mb-1 block">Стоимость</span>
                          <span className="text-2xl font-bold text-foreground">
                            {c.slug === FULL_CHECKUP.slug
                              ? `от ${money(fullMinPrice)}`
                              : money(priceOf(c.slug, c.price))}
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
                      {checkupShape(c.shape)}
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
