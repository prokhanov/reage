import { useState, useMemo } from "react";
import { ArrowRight, FileText, MapPin, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";

import { CHECKUPS, money } from "@/data/checkups";
import {
  FULL_CHECKUP,
  FULL_CHECKUP_CATEGORIES,
  FULL_CHECKUP_MARKERS_COUNT,
} from "@/data/fullCheckup";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";

import { accentClasses } from "./checkupShapes";


function markerWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "показатель";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "показателя";
  return "показателей";
}

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

export function MainCheckupsSection({ title = "Выберите чекап" }: { title?: string }) {
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
    return all;
  }, [all, selected]);

  function toggleFilter(id: string) {
    setActive((prev) => (prev === id ? null : id));
  }



  return (
    <section id="checkups" className="border-b hairline bg-muted/30">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 md:mb-10">
          <div>
            <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
              {title}
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

        {/* Полный чекап — большая карточка до фильтра */}
        <Link
          to={FULL_CHECKUP.href}
          className="group relative mb-8 block overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 sm:p-8 md:mb-10 md:p-10"
        >
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="flex flex-col">
              <span className="inline-flex w-fit items-center rounded-full bg-primary-foreground/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/90">
                {FULL_CHECKUP.tag}
              </span>
              <h3 className="font-display mt-4 text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                {FULL_CHECKUP.name}
              </h3>
              <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-primary-foreground/75">
                Одна точка отсчёта по всем системам организма: анализы, понятный отчёт и
                консультация врача — вместо того, чтобы собирать картину по частям.
              </p>

              <ul className="mt-6 space-y-2.5 sm:mt-8">
                {FULL_CHECKUP_CATEGORIES.map((cat) => (
                  <li
                    key={cat.title}
                    className="flex items-center gap-3 text-sm text-primary-foreground/90 sm:text-[0.95rem]"
                  >
                    {/* bg-primary сливается с фоном карточки — на тёмном используем accent */}
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${cat.dotClass === "bg-primary" ? "bg-accent" : cat.dotClass}`}
                      aria-hidden
                    />
                    <span>{cat.title}</span>
                    <span className="ml-auto whitespace-nowrap font-mono-tech text-xs text-primary-foreground/60 sm:text-sm">
                      {cat.markers.length} {markerWord(cat.markers.length)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-between gap-6 lg:border-l lg:border-primary-foreground/15 lg:pl-10">
              <ul className="space-y-3 text-sm text-primary-foreground/80">
                <li className="flex items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-primary-foreground/60" />
                  Понятный отчёт в личном кабинете
                </li>
                <li className="flex items-center gap-3">
                  <Stethoscope className="h-4 w-4 shrink-0 text-primary-foreground/60" />
                  Консультация врача по результатам
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0 text-primary-foreground/60" />
                  Сдача анализов в отделениях LabQuest
                </li>
              </ul>

              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-start">
                <div>
                  <div className="whitespace-nowrap font-mono-tech text-[1.75rem] leading-none sm:text-4xl">
                    {money(priceOf(FULL_CHECKUP.slug, FULL_CHECKUP.price))}
                  </div>
                  <div className="mt-2 text-sm text-primary-foreground/70">
                    {FULL_CHECKUP_MARKERS_COUNT} показателей · 5 систем организма
                  </div>
                </div>
                <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary-foreground px-5 py-3 text-sm font-semibold text-primary transition-colors duration-300 group-hover:bg-background group-hover:text-foreground">
                  Подробнее
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </div>

          <div
            className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-primary-foreground/10 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
            aria-hidden
          />
        </Link>

        {/* Другие чекапы — заголовок, затем фильтр */}
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Другие чекапы
        </h3>

        {/* Фильтр */}
        <div className="mb-8 rounded-[2rem] border border-border bg-card p-5 sm:p-6 md:mb-10">


          {/* Табы — отдельные кнопки-переключатели */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setTab("feeling");
                setActive(null);
              }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                tab === "feeling"
                  ? "border border-foreground bg-foreground text-background"
                  : "border border-border bg-card text-foreground hover:border-foreground/50"
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
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                tab === "system"
                  ? "border border-foreground bg-foreground text-background"
                  : "border border-border bg-card text-foreground hover:border-foreground/50"
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

        {/* Карточки — под фильтром */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CheckupCard key={c.slug} c={c} />
          ))}
        </div>

      </div>
    </section>
  );
}
