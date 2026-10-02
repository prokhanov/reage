import { useMemo, useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PartnerPrice } from "@/components/PartnerPrice";
import { CHECKUPS } from "@/data/checkups";
import { FULL_CHECKUP } from "@/data/fullCheckup";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import { useResolvedCheckups } from "@/hooks/useResolvedCheckups";
import { useEnergyOrder } from "./EnergyOrderContext";

function markerWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "показатель";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "показателя";
  return "показателей";
}

const FILTERS: { id: string; label: string; slugs: string[] | null }[] = [
  { id: "all", label: "Все", slugs: null },
  { id: "tired", label: "Часто устаю", slugs: ["energy", "iron", "thyroid", "vitamins"] },
  { id: "hair", label: "Ногти и волосы", slugs: ["hair", "vitamins", "iron", "thyroid"] },
  { id: "weight", label: "Вес и сон", slugs: ["metabolic", "thyroid", "male-hormones", "female-hormones"] },
  { id: "heart", label: "Сердце и давление", slugs: ["cardio-risk", "base"] },
  { id: "thyroid", label: "Щитовидная железа", slugs: ["thyroid"] },
  { id: "vitamins", label: "Витамины", slugs: ["vitamins"] },
  { id: "liver", label: "Отёки и питание", slugs: ["liver", "kidney", "metabolic"] },
];

const FOR_WHOM: Record<string, string> = {
  energy: "Усталость, разбитость, нет сил",
  thyroid: "Вес, сон, перепады настроения",
  iron: "Выпадение волос, бледность, слабость",
  "cardio-risk": "Давление, холестерин, наследственность",
  metabolic: "Лишний вес, сахар, тяга к сладкому",
  liver: "Тяжесть после еды, приём лекарств",
  kidney: "Отёки, давление, анализы мочи",
  base: "Первый чекап или ежегодный контроль",
  vitamins: "Сниженный иммунитет, мало солнца",
  "female-hormones": "Настроение, вес, кожа и волосы",
  "male-hormones": "Сила, либидо, набор массы",
  hair: "Выпадение, ломкость, тусклые волосы",
};

const DOT: Record<string, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  info: "bg-info",
};

export function MainCheckupsCatalog({ title = "Разовые чекапы" }: { title?: string }) {
  const { isActive, markersOf } = useCheckupSettings();
  const { resolve, variantsFor } = useResolvedCheckups();
  const { addItem, openCart } = useEnergyOrder();

  const all = useMemo(() => CHECKUPS.map(resolve).filter((c) => isActive(c.slug)), [isActive, resolve]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter);
    return f?.slugs ? all.filter((c) => f.slugs!.includes(c.slug)) : all;
  }, [all, filter]);

  const variants = variantsFor(FULL_CHECKUP.slug);
  const defaultVariant =
    variants.find((v) => (v.variant as { is_popular?: boolean }).is_popular)?.checkup.slug ??
    variants[Math.floor(variants.length / 2)]?.checkup.slug;
  const [variantSlug, setVariantSlug] = useState<string | undefined>(undefined);
  const current = variants.find((v) => v.checkup.slug === (variantSlug ?? defaultVariant));
  const fullPrice = current?.checkup.price ?? FULL_CHECKUP.price;
  const fullCount = current
    ? markersOf(current.checkup.slug)?.length ?? current.checkup.markers.length
    : markersOf(FULL_CHECKUP.slug)?.length ?? FULL_CHECKUP.markers.length;

  const fullCard = (
    <div className="rounded-[1.75rem] bg-primary p-6 text-primary-foreground sm:p-7">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
        Все 5 систем · кровь и моча
      </div>
      <h3 className="font-display mt-3 text-3xl leading-tight">Полный чекап</h3>

      {variants.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-primary-foreground/10 p-1">
          {variants.map((v) => {
            const on = v.checkup.slug === current?.checkup.slug;
            return (
              <button
                key={v.checkup.slug}
                type="button"
                onClick={() => setVariantSlug(v.checkup.slug)}
                className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${
                  on ? "bg-background text-foreground" : "text-primary-foreground hover:bg-primary-foreground/10"
                }`}
              >
                {v.variant.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <div className="whitespace-nowrap text-[2rem] font-bold leading-none">
          <PartnerPrice price={fullPrice} />
        </div>
        <div className="text-sm text-primary-foreground/80">
          {fullCount} {markerWord(fullCount)}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-primary-foreground/85">
        Энергия · сердце и сосуды · воспаление и иммунитет · гормоны · метаболизм. Подробный отчёт в кабинете.
      </p>
      <Link
        to={current ? `/checkup/${current.checkup.slug}` : FULL_CHECKUP.href}
        className="mt-5 flex h-12 items-center justify-center rounded-xl bg-background px-5 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
      >
        Выбрать полный чекап
      </Link>
      <a
        href="#monitoring"
        className="mt-4 block text-center text-sm text-primary-foreground/85 underline underline-offset-4 hover:text-primary-foreground"
      >
        Повторять регулярно выгоднее в годовой программе →
      </a>
    </div>
  );

  return (
    <section id="checkups" className="border-b hairline bg-muted/30">
      <div className="mx-auto w-full max-w-[80rem] px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
        <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground md:text-lg">
          Одна сдача крови и отчёт за 1–2 дня. Выберите по самочувствию — или сразу полный.
        </p>

        <div className="mt-6 text-sm font-medium text-muted-foreground lg:hidden">Или выберите по самочувствию</div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:sticky lg:top-20 lg:z-20 lg:mx-0 lg:mt-6 lg:flex-wrap lg:overflow-visible lg:bg-background/95 lg:backdrop-blur lg:px-0 lg:py-3">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm transition-colors ${
                  on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/40"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
          <div className="lg:order-2 lg:sticky lg:top-40 lg:self-start">{fullCard}</div>

          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card lg:order-1">
            {visible.map((c) => {
              const isOpen = open === c.slug;
              const count = c.markers.length;
              return (
                <div key={c.slug} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : c.slug)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left sm:gap-4 sm:px-6"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[c.accent] ?? "bg-muted-foreground"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">{c.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {FOR_WHOM[c.slug] ?? c.tag}
                        <span className="sm:hidden">
                          {" "}· {count} {markerWord(count)}
                          {c.cbcBonusEnabled ? " + ОАК" : ""}
                        </span>
                      </span>
                    </span>
                    <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">
                      {count} {markerWord(count)}
                      {c.cbcBonusEnabled ? " + ОАК" : ""}
                    </span>
                    <span className="whitespace-nowrap text-lg font-bold text-foreground">
                      <PartnerPrice price={c.price} />
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 pl-[2.6rem] sm:px-6 sm:pl-[3.1rem]">
                      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Что входит</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.markers.map((m) => (
                          <span key={m.title} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
                            {m.title}
                          </span>
                        ))}
                        {c.cbcBonusEnabled && (
                          <span className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">ОАК в подарок</span>
                        )}
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground">1 сдача · отчёт за 1–2 дня</div>
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            addItem(c.slug);
                            openCart();
                          }}
                          className="inline-flex h-11 items-center gap-1 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          В корзину · <PartnerPrice price={c.price} />
                        </button>
                        <Link
                          to={c.href}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                          Подробнее о чекапе <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:px-6">
              Показано {visible.length} из {all.length} ·{" "}
              <Link to="/checkup" className="underline underline-offset-4 hover:text-foreground">
                Все чекапы на отдельной странице
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
