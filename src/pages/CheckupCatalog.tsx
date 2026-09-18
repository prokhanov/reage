import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowUpDown, FlaskConical, Search, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

import { PageMeta } from "@/components/PageMeta";
import { Footer } from "@/components/landing/CTASection";
import { EnergyCart } from "@/components/landing/energy/EnergyCart";
import {
  EnergyOrderProvider,
  useEnergyOrder,
} from "@/components/landing/energy/EnergyOrderContext";
import { accentClasses } from "@/components/landing/energy/checkupShapes";
import { ThemedLogo } from "@/components/ThemedLogo";
import { Button } from "@/components/ui/button";
import { CHECKUPS, money, type Checkup } from "@/data/checkups";
import { FULL_CHECKUP, FULL_CHECKUP_MARKERS_COUNT } from "@/data/fullCheckup";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";

type Sort = "asc" | "desc";

function plural(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "показатель";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "показателя";
  return "показателей";
}

function CheckupRow({ checkup, price }: { checkup: Checkup; price: number }) {
  const a = accentClasses[checkup.accent];
  const count = checkup.markers.length;

  return (
    <div className="flex flex-col gap-4 border-b hairline py-7 last:border-b-0 md:flex-row md:items-start md:justify-between md:gap-10">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" />
            {count} {plural(count)}
          </span>
          <span
            className={`inline-flex items-center rounded-full border ${a.border} ${a.bg} px-3 py-1 text-xs font-medium ${a.text}`}
          >
            {checkup.tag}
          </span>
        </div>

        <h3 className="font-display mt-3 text-xl leading-tight text-foreground md:text-2xl">
          {checkup.name}
        </h3>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
          {checkup.lead}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 md:w-[190px] md:flex-col md:items-end">
        <div className="font-mono-tech text-2xl leading-none text-foreground">{money(price)}</div>
        <Button asChild size="lg" className="h-11 px-7">
          <Link to={checkup.href}>Заказать</Link>
        </Button>
      </div>
    </div>
  );
}

function CheckupCatalogContent() {
  const { count, openCart } = useEnergyOrder();
  const { setTheme } = useTheme();
  const { priceOf, isActive } = useCheckupSettings();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("asc");

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const fullPrice = priceOf(FULL_CHECKUP.slug, FULL_CHECKUP.price);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = CHECKUPS.filter((c) => isActive(c.slug)).filter((c) => {
      if (!q) return true;
      const haystack = [
        c.name,
        c.tag,
        c.lead,
        c.cardText,
        ...c.markers.map((m) => `${m.title} ${m.description}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return list.sort((a, b) =>
      sort === "asc"
        ? priceOf(a.slug, a.price) - priceOf(b.slug, b.price)
        : priceOf(b.slug, b.price) - priceOf(a.slug, a.price)
    );
  }, [query, sort, isActive, priceOf]);

  const fullMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [FULL_CHECKUP.name, FULL_CHECKUP.tag, FULL_CHECKUP.lead, FULL_CHECKUP.cardText]
      .join(" ")
      .toLowerCase()
      .includes(q);
  }, [query]);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <PageMeta
        title="Все чекапы ReAge — каталог анализов с расшифровкой"
        description="Полный список чекапов ReAge: от точечной проверки одного показателя до полной картины организма. Анализы в LabQuest, понятный отчёт и рекомендации."
        canonical="/checkup"
      />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-[80rem] items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link to="/main_new" aria-label="ReAge" className="flex shrink-0 items-center">
            <ThemedLogo eager className="h-10 w-auto sm:h-12" />
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            <a
              href="tel:+79959984638"
              className="whitespace-nowrap text-[11px] font-medium text-foreground transition-colors hover:text-primary sm:text-sm"
            >
              +7 (995) 998-46-38
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openCart}
              className="relative h-10 w-10 sm:h-11 sm:w-11"
              aria-label={count ? `Корзина, товаров: ${count}` : "Корзина, пусто"}
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-muted/30">
          <div className="mx-auto w-full max-w-[72rem] px-4 py-12 sm:px-6 sm:py-16">
            <h1 className="font-display text-[2rem] leading-tight text-foreground md:text-[2.75rem]">
              Все чекапы
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Полный список — ищите по названию, показателю или органу.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ферритин, печень, усталость…"
                  aria-label="Поиск по чекапам"
                  className="h-14 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-14 gap-2 rounded-2xl px-6 text-base"
                onClick={() => setSort((p) => (p === "asc" ? "desc" : "asc"))}
              >
                Цена
                <ArrowUpDown className="h-4 w-4" />
                <span className="text-muted-foreground">
                  {sort === "asc" ? "по возрастанию" : "по убыванию"}
                </span>
              </Button>
            </div>

            <div className="mt-6 rounded-[2rem] border border-border bg-card px-5 py-2 sm:px-8">
              {items.length === 0 && !fullMatches ? (
                <p className="py-12 text-center text-muted-foreground">
                  Ничего не нашлось — попробуйте другое слово.
                </p>
              ) : (
                items.map((c) => (
                  <CheckupRow key={c.slug} checkup={c} price={priceOf(c.slug, c.price)} />
                ))
              )}
            </div>

            {fullMatches && (
              <div className="mt-6 overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground sm:p-9">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium text-primary-foreground/90">
                        {FULL_CHECKUP_MARKERS_COUNT} {plural(FULL_CHECKUP_MARKERS_COUNT)}
                      </span>
                      <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium text-primary-foreground/90">
                        Консультация врача
                      </span>
                    </div>
                    <h2 className="font-display mt-3 text-2xl leading-tight md:text-3xl">
                      {FULL_CHECKUP.name}
                    </h2>
                    <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-primary-foreground/80">
                      {FULL_CHECKUP.lead}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-4 md:w-[190px] md:flex-col md:items-end">
                    <div className="font-mono-tech text-2xl leading-none">{money(fullPrice)}</div>
                    <Button
                      asChild
                      size="lg"
                      className="h-11 bg-primary-foreground px-7 text-primary hover:bg-background hover:text-foreground"
                    >
                      <Link to={FULL_CHECKUP.href}>Заказать</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
      <EnergyCart />
    </div>
  );
}

export default function CheckupCatalog() {
  return (
    <EnergyOrderProvider checkup={FULL_CHECKUP}>
      <CheckupCatalogContent />
    </EnergyOrderProvider>
  );
}
