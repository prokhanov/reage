import { useState } from "react";
import { ArrowRight, Crown, X } from "lucide-react";
import { Link } from "react-router-dom";

import { CHECKUPS, money } from "@/data/checkups";
import { FULL_CHECKUP, FULL_CHECKUP_MARKERS_COUNT } from "@/data/fullCheckup";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";

import { accentClasses } from "./checkupShapes";

const YEARLY_PRICE = 69990;

type Symptom = {
  id: string;
  label: string;
  slugs: string[];
  full?: boolean;
};

const SYMPTOMS: Symptom[] = [
  { id: "tired", label: "часто устаю", slugs: ["energy", "iron", "thyroid", "vitamins"] },
  { id: "hair", label: "слоятся ногти, выпадают волосы", slugs: ["hair", "vitamins", "iron", "thyroid"] },
  { id: "weight", label: "проблемы с весом или сном", slugs: ["metabolic", "thyroid", "male-hormones", "female-hormones"] },
  { id: "heart", label: "сердце и давление", slugs: ["cardio-risk", "base"] },
  { id: "liver", label: "тяжесть, отёки, питание", slugs: ["liver", "kidney", "metabolic"] },
  { id: "all", label: "хочу полную картину сразу", slugs: [], full: true },
];

export function MainCheckupsSection() {
  const { priceOf, isActive } = useCheckupSettings();
  const [active, setActive] = useState<string | null>(null);

  const selected = SYMPTOMS.find((s) => s.id === active) ?? null;
  const all = CHECKUPS.filter((c) => isActive(c.slug));
  const simple = selected ? all.filter((c) => selected.slugs.includes(c.slug)) : all;


  return (
    <section id="checkups" className="border-b hairline bg-muted/30">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-8 md:mb-10">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
            Выберите чекап
          </h2>
          <p className="mt-2 max-w-xl text-base text-muted-foreground md:text-lg">
            от точечной проверки одной боли до полной картины организма
          </p>
        </div>

        {/* Фильтр по симптомам */}
        <div className="mb-8 rounded-[2rem] border border-border bg-card p-5 sm:p-6 md:mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground sm:text-base">
              не знаете, с чего начать?
            </p>
            {selected && (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                сбросить
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {SYMPTOMS.map((s) => {
              const on = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive(on ? null : s.id)}
                  className={`rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
                    on
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-muted/70"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Полный чекап и годовой мониторинг — всегда на виду, 2 столбца */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:mb-10 md:grid-cols-2">
          <Link
            to={FULL_CHECKUP.href}
            className="group relative block overflow-hidden rounded-[2rem] bg-foreground p-6 text-background transition-transform duration-300 hover:-translate-y-0.5 sm:p-8"
          >
            <div className="flex h-full flex-col">
              <span className="inline-flex w-fit items-center rounded-full bg-background/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-background/90">
                {FULL_CHECKUP.tag}
              </span>
              <h3 className="font-display mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                {FULL_CHECKUP.name}
              </h3>
              <p className="mt-2 max-w-[30ch] text-base leading-relaxed text-background/75">
                {FULL_CHECKUP_MARKERS_COUNT} показателя, понятный отчёт и консультация врача
              </p>

              <div className="mt-auto flex flex-col items-start gap-4 pt-6 md:items-end md:text-right">
                <div className="font-mono-tech text-[2rem] leading-none sm:text-4xl">
                  {money(priceOf(FULL_CHECKUP.slug, FULL_CHECKUP.price))}
                </div>
                <span className="inline-flex h-12 items-center gap-2 rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  Подробнее
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>

            <div
              className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
              aria-hidden
            />
          </Link>

          <div className="group relative block overflow-hidden rounded-[2rem] border border-accent/20 bg-foreground p-6 text-background transition-transform duration-300 hover:-translate-y-0.5 sm:p-8">
            <div className="flex h-full flex-col">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-foreground">
                <Crown className="h-3.5 w-3.5" />
                Премиум
              </span>
              <h3 className="font-display mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                Годовой мониторинг здоровья
              </h3>
              <p className="mt-2 max-w-[30ch] text-base leading-relaxed text-background/75">
                Регулярные чекапы, динамика показателей и сопровождение врача весь год.
              </p>

              <div className="mt-auto flex flex-col items-start gap-4 pt-6 md:items-end md:text-right">
                <div className="flex items-baseline gap-2 font-mono-tech text-[2rem] leading-none sm:text-4xl">
                  <span className="text-base font-medium text-background/60">от</span>
                  {money(YEARLY_PRICE)}
                  <span className="text-lg text-background/70">/год</span>
                </div>
                <span className="inline-flex h-12 items-center gap-2 rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors duration-300 group-hover:bg-accent group-hover:text-accent-foreground">
                  Узнать больше
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>

            <div
              className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
              aria-hidden
            />
          </div>
        </div>

        {/* Остальные чекапы */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {simple.map((c) => {
            const a = accentClasses[c.accent];
            return (
              <Link
                key={c.slug}
                to={c.href}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg md:p-8"
              >
                <span
                  className={`relative mb-6 inline-flex w-fit items-center rounded-full border ${a.border} ${a.bg} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${a.text}`}
                >
                  {c.tag}
                </span>

                <div className="flex grow flex-col">
                  <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">
                    {c.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 max-w-[30ch] text-base leading-relaxed text-muted-foreground">
                    {c.cardText}
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="font-mono-tech text-[1.75rem] leading-none text-foreground">
                      {money(priceOf(c.slug, c.price))}
                    </div>
                    <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      Подробнее
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
