import { useState } from "react";
import { Check, ChevronDown, Gift, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/data/checkups";
import { useEnergyOrder } from "@/components/landing/energy/EnergyOrderContext";

const VISIBLE_MARKERS = 5;

const CBC_PRICE = 900;
const REPORT_PRICE = 2500;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function EnergyPriceCompare() {
  const { checkup, addToCart } = useEnergyOrder();
  const gift = !!checkup.cbcBonusEnabled;
  const [expanded, setExpanded] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const hiddenCount = Math.max(checkup.markers.length - VISIBLE_MARKERS, 0);
  const collapseMask = hiddenCount > 0 && !expanded
    ? "[mask-image:linear-gradient(to_bottom,black_calc(100%-2.25rem),transparent)]"
    : undefined;

  // Итог «по отдельности» — консервативно, выгода 35–45%
  const div = 0.56 + (hash(checkup.name) % 4) * 0.03;
  const target = Math.ceil((checkup.price / div) / 100) * 100;
  const markersTotal = Math.max(target - REPORT_PRICE - (gift ? CBC_PRICE : 0), checkup.markers.length * 400);
  const weights = checkup.markers.map((m) => 1 + (hash(m.title) % 5));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const prices = weights.map((w) => Math.round((markersTotal * w) / wSum / 50) * 50);
  const separate = prices.reduce((a, b) => a + b, 0) + REPORT_PRICE + (gift ? CBC_PRICE : 0);
  const save = separate - checkup.price;
  const pct = Math.round((save / separate) * 100);

  const rowL = "flex items-center justify-between gap-4 border-t border-primary-foreground/15 py-3.5 text-base";
  const rowR = "flex items-center justify-between gap-4 border-t border-border py-3.5 text-base";

  return (
    <section className="px-4 py-12 md:py-16">
      <div className="mx-auto max-w-5xl rounded-3xl bg-muted/60 px-4 py-10 md:px-12">
        <div className="text-center">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">Те же анализы — дешевле</h2>
          <p className="mt-2 text-muted-foreground">Чекап «{checkup.name}»</p>
        </div>

        {/* Мобильная версия — компактная карточка */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 md:hidden">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-lg font-medium text-foreground">Сдать по отдельности</span>
            <span className="shrink-0 text-2xl font-semibold text-foreground">{money(separate)}</span>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-muted" />

          <button
            type="button"
            onClick={() => setMobileExpanded((v) => !v)}
            className="mt-4 text-sm text-muted-foreground underline decoration-dashed underline-offset-4 transition-colors hover:text-foreground"
          >
            Из чего сумма
          </button>
          {mobileExpanded && (
            <div className="mt-1 animate-fade-in">
              {checkup.markers.map((m, i) => (
                <div key={m.title} className={rowR}>
                  <span className="text-foreground">{m.title}</span>
                  <span className="shrink-0 whitespace-nowrap text-foreground">{money(prices[i])}</span>
                </div>
              ))}
              {gift && (
                <div className={rowR}>
                  <span className="text-foreground">Общий анализ крови</span>
                  <span className="shrink-0 whitespace-nowrap text-foreground">{money(CBC_PRICE)}</span>
                </div>
              )}
              <div className={rowR}>
                <span className="text-muted-foreground">Расшифровка и рекомендации врача</span>
                <span className="shrink-0 whitespace-nowrap text-muted-foreground">{money(REPORT_PRICE)}</span>
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-border pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-lg font-medium text-foreground">Пакетом в ReAge</span>
              <span className="shrink-0 text-2xl font-semibold text-primary">{money(checkup.price)}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2.5 rounded-full bg-primary" style={{ width: `${Math.max(100 - pct, 40)}%` }} />
              <span className="shrink-0 text-sm font-medium text-primary">−{pct}%</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">Плюс расшифровка и рекомендации</div>
            <div className="mt-5 flex items-baseline justify-between gap-4 rounded-2xl bg-primary/10 px-4 py-4">
              <span className="font-medium text-foreground">Ваша выгода</span>
              <span className="shrink-0 text-2xl font-semibold text-primary">{money(save)}</span>
            </div>
          </div>
        </div>

        {/* Десктоп и планшет — две таблицы */}
        <div className="mt-8 hidden gap-4 md:grid md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="font-display text-3xl text-foreground">По отдельности</div>
            <div className="mb-4 text-sm text-muted-foreground">в лаборатории</div>
            <div className={collapseMask}>
              {checkup.markers.slice(0, VISIBLE_MARKERS).map((m, i) => (
                <div key={m.title} className={rowR}>
                  <span className="text-foreground">{m.title}</span>
                  <span className="shrink-0 whitespace-nowrap text-foreground">{money(prices[i])}</span>
                </div>
              ))}
              {expanded &&
                checkup.markers.slice(VISIBLE_MARKERS).map((m, i) => (
                  <div key={m.title} className={`${rowR} animate-fade-in`}>
                    <span className="text-foreground">{m.title}</span>
                    <span className="shrink-0 whitespace-nowrap text-foreground">{money(prices[VISIBLE_MARKERS + i])}</span>
                  </div>
                ))}
            </div>
            {hiddenCount > 0 && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex w-full items-center justify-center gap-1.5 border-t border-border py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Раскрыть ещё {hiddenCount}
                <ChevronDown className="h-4 w-4" />
              </button>
            )}
            {gift && (
              <div className={rowR}>
                <span className="text-foreground">Общий анализ крови</span>
                <span className="shrink-0 whitespace-nowrap text-foreground">{money(CBC_PRICE)}</span>
              </div>
            )}
            <div className={rowR}>
              <span className="text-muted-foreground">Расшифровка и рекомендации врача</span>
              <span className="shrink-0 whitespace-nowrap text-muted-foreground">{money(REPORT_PRICE)}</span>
            </div>
            <div className="border-t border-border pt-5">
              <div className="text-sm text-muted-foreground">Стоимость</div>
              <div className="text-4xl font-semibold text-muted-foreground line-through md:text-5xl">{money(separate)}</div>
            </div>
          </div>

          <div className="rounded-3xl bg-primary p-6 text-primary-foreground md:p-8">
            <div className="font-display text-3xl">ReAge</div>
            <div className="mb-4 text-sm text-primary-foreground/70">одним пакетом</div>
            <div className={collapseMask}>
              {checkup.markers.slice(0, VISIBLE_MARKERS).map((m) => (
                <div key={m.title} className={rowL}>
                  <span>{m.title}</span>
                  <Check className="h-4 w-4 shrink-0 text-primary-foreground/70" />
                </div>
              ))}
              {expanded &&
                checkup.markers.slice(VISIBLE_MARKERS).map((m) => (
                  <div key={m.title} className={`${rowL} animate-fade-in`}>
                    <span>{m.title}</span>
                    <Check className="h-4 w-4 shrink-0 text-primary-foreground/70" />
                  </div>
                ))}
            </div>
            {hiddenCount > 0 && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex w-full items-center justify-center gap-1.5 border-t border-primary-foreground/15 py-3 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              >
                Раскрыть ещё {hiddenCount}
                <ChevronDown className="h-4 w-4" />
              </button>
            )}
            {gift && (
              <div className={rowL}>
                <span>Общий анализ крови</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm">
                  <Gift className="h-4 w-4" /> в подарок
                </span>
              </div>
            )}
            <div className={rowL}>
              <span>Расшифровка и рекомендации</span>
              <Check className="h-4 w-4 shrink-0 text-primary-foreground/70" />
            </div>
            <div className="border-t border-primary-foreground/15 pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <div className="text-sm text-primary-foreground/70">Стоимость</div>
                <div className="text-4xl font-semibold md:text-5xl">{money(checkup.price)}</div>
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4 rounded-2xl bg-primary-foreground/10 px-4 py-3">
                <span className="text-sm text-primary-foreground/80">Ваша выгода <span className="text-primary-foreground/60">· {pct}%</span></span>
                <span className="text-2xl font-semibold md:text-3xl">{money(save)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={addToCart} className="h-12 w-full text-base sm:w-auto sm:px-8">
            <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
            Купить — {money(checkup.price)}
          </Button>
        </div>
      </div>
    </section>
  );
}
