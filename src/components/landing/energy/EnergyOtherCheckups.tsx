import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { CHECKUPS, money } from "@/data/checkups";

import { accentClasses, checkupShape } from "./checkupShapes";

interface Props {
  /** Текущий чекап скрывается из карусели. */
  currentSlug?: string;
}

export function EnergyOtherCheckups({ currentSlug }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const items = CHECKUPS.filter((c) => c.slug !== currentSlug);

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
                        <p className="mt-2 line-clamp-2 max-w-[28ch] text-base leading-relaxed text-muted-foreground">
                          {c.cardText}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="label-mono mb-1 block">Стоимость</span>
                          <span className="font-display text-2xl font-semibold text-foreground">
                            {money(c.price)}
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
