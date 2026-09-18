import { useState, useMemo } from "react";
import { ArrowRight, Crown } from "lucide-react";
import { Link } from "react-router-dom";

import { CHECKUPS, money } from "@/data/checkups";
import { FULL_CHECKUP, FULL_CHECKUP_MARKERS_COUNT } from "@/data/fullCheckup";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";

import { accentClasses } from "./checkupShapes";

const YEARLY_PRICE = 69990;
const POPULAR_SLUGS = ["energy", "vitamins", "thyroid"];

type Tab = "feeling" | "system";

type Filter = {
  id: string;
  label: string;
  slugs: string[];
};

const FEELINGS: Filter[] = [
  { id: "tired", label: "Часто устаю", slugs: ["energy", "iron", "thyroid", "vitamins"] },
  { id: "hair", label: "Слоятся ногти, выпадают волосы", slugs: ["hair", "vitamins", "iron", "thyroid"] },
  { id: "weight", label: "Проблемы с весом или сном", slugs: ["metabolic", "thyroid", "male-hormones", "female-hormones"] },
  { id: "heart", label: "Сердце и давление", slugs: ["cardio-risk", "base"] },
  { id: "liver", label: "Тяжесть, отёки, питание", slugs: ["liver", "kidney", "metabolic"] },
];

const SYSTEMS: Filter[] = [
  { id: "thyroid", label: "Щитовидная железа", slugs: ["thyroid"] },
  { id: "heart", label: "Сердце и сосуды", slugs: ["cardio-risk"] },
  { id: "liver", label: "Печень", slugs: ["liver"] },
  { id: "kidney", label: "Почки", slugs: ["kidney"] },
  { id: "female", label: "Женское здоровье", slugs: ["female-hormones"] },
  { id: "male", label: "Мужское здоровье", slugs: ["male-hormones"] },
];

function CheckupCard({ c }: { c: (typeof CHECKUPS)[number] }) {
  const { priceOf } = useCheckupSettings();
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

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="whitespace-nowrap font-mono-tech text-[1.5rem] leading-none text-foreground sm:text-[1.75rem]">
            {money(priceOf(c.slug, c.price))}
          </div>
          <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
            Подробнее
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MainCheckupsSection() {
  const { priceOf, isActive } = useCheckupSettings();
  const [tab, setTab] = useState<Tab>("feeling");
  const [active, setActive] = useState<string | null>(null);

  const all = useMemo(() => CHECKUPS.filter((c) => isActive(c.slug)), [isActive]);

  const currentFilters = tab === "feeling" ? FEELINGS : SYSTEMS;
  const selected = currentFilters.find((f) => f.id === active) ?? null;

  const visible = useMemo(() => {
    if (selected) {
      return all.filter((c) => selected.slugs.includes(c.slug));
    }
    // Если ничего не выбрано — показываем 3 популярных чекапа
    const popular = POPULAR_SLUGS.map((slug) => all.find((c) => c.slug === slug)).filter(
      Boolean
    ) as (typeof CHECKUPS)[number][];
    return popular.length ? popular : all.slice(0, 3);
  }, [all, selected]);

  const showPopularLabel = !selected;

  function toggleFilter(id: string) {
    setActive((prev) => (prev === id ? null : id));
  }


  return (
    <section id="checkups" className="border-b hairline bg-muted/30">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 md:mb-10">
          <div>
            <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
              Выберите чекап
            </h2>
            <p className="mt-2 max-w-xl text-base text-muted-foreground md:text-lg">
              от точечной проверки одной боли до полной картины организма
            </p>
          </div>
          <Link
            to="/checkup"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Посмотреть все
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Фильтр */}
        <div className="mb-8 rounded-[2rem] border border-border bg-card p-5 sm:p-6 md:mb-10">
          {/* Табы */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setTab("feeling");
                setActive(null);
              }}
              className={`rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
                tab === "feeling"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              По ощущению
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("system");
                setActive(null);
              }}
              className={`rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
                tab === "system"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              По системе или органу
            </button>
          </div>

          {/* Пилюли */}
          <div className="mt-4 flex flex-wrap items-center gap-3">

            {currentFilters.map((f) => {
              const on = active === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleFilter(f.id)}
                  className={`rounded-full px-4 py-2.5 text-sm transition-colors duration-200 ${
                    on
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-muted/70"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {showPopularLabel && (
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Популярные
          </h3>
        )}

        {/* Чекапы */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CheckupCard key={c.slug} c={c} />
          ))}
        </div>

        {/* Полный чекап и годовой мониторинг — всегда на виду, 2 столбца */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 md:grid-cols-2">
          <Link
            to={FULL_CHECKUP.href}
            className="group relative block overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 sm:p-8"
          >
            <div className="flex h-full flex-col">
              <span className="inline-flex w-fit items-center rounded-full bg-primary-foreground/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/90">
                {FULL_CHECKUP.tag}
              </span>
              <h3 className="font-display mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                {FULL_CHECKUP.name}
              </h3>
              <p className="mt-2 max-w-[30ch] text-base leading-relaxed text-primary-foreground/75">
                {FULL_CHECKUP_MARKERS_COUNT} показателя, понятный отчёт и консультация врача
              </p>

              <div className="mt-auto flex flex-col items-start gap-4 pt-6 md:items-end md:text-right">
                <div className="whitespace-nowrap font-mono-tech text-[1.75rem] leading-none sm:text-4xl">
                  {money(priceOf(FULL_CHECKUP.slug, FULL_CHECKUP.price))}
                </div>
                <span className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 text-sm font-semibold text-primary transition-colors duration-300 group-hover:bg-background group-hover:text-foreground">
                  Подробнее
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>

            <div
              className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-primary-foreground/10 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
              aria-hidden
            />
          </Link>

          <Link
            to="/monitoring"
            className="group relative block overflow-hidden rounded-[2rem] border border-accent/20 bg-foreground p-6 text-background transition-transform duration-300 hover:-translate-y-0.5 sm:p-8"
          >
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
                <div className="flex flex-wrap items-baseline gap-2 font-mono-tech text-[1.75rem] leading-none sm:text-4xl">
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
          </Link>
        </div>

      </div>
    </section>
  );
}
