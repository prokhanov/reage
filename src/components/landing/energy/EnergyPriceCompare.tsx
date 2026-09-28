import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Dna,
  Droplet,
  Gift,
  Info,
  Pill,
  Plus,
  ShoppingCart,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/data/checkups";
import { useEnergyOrder } from "@/components/landing/energy/EnergyOrderContext";

const VISIBLE_MARKERS = 5;

const CBC_PRICE = 900;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

type MarkerIcon = { kind: "icon"; Icon: typeof Droplet } | { kind: "text"; label: string };

function markerIcon(title: string): MarkerIcon {
  const t = title.toLowerCase();
  if (/b12/.test(t)) return { kind: "text", label: "B12" };
  if (/b9|фолат|фолиев/.test(t)) return { kind: "text", label: "B9" };
  if (/витамин\s*d|25-oh/.test(t)) return { kind: "icon", Icon: Sun };
  if (/ферритин|железо|трансфер|овсж/.test(t)) return { kind: "icon", Icon: Dna };
  if (/ттг|тиреоид|щитовид|т3|т4|атпо/.test(t)) return { kind: "icon", Icon: Activity };
  if (/гормон|тестостерон|кортизол|инсулин|прогестерон|гспг/.test(t)) return { kind: "icon", Icon: Pill };
  return { kind: "icon", Icon: Droplet };
}

function pluralMarkers(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "показатель";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "показателя";
  return "показателей";
}

export function EnergyPriceCompare() {
  const { checkup, addToCart } = useEnergyOrder();
  const gift = !!checkup.cbcBonusEnabled;
  const [expanded, setExpanded] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const hiddenCount = Math.max(checkup.markers.length - VISIBLE_MARKERS, 0);

  // Итог «по отдельности» — консервативно, выгода 35–45%
  const div = 0.56 + (hash(checkup.name) % 4) * 0.03;
  const target = Math.ceil((checkup.price / div) / 100) * 100;
  const markersTotal = Math.max(target - (gift ? CBC_PRICE : 0), checkup.markers.length * 400);
  const weights = checkup.markers.map((m) => 1 + (hash(m.title) % 5));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const prices = weights.map((w) => Math.round((markersTotal * w) / wSum / 50) * 50);
  const separate = prices.reduce((a, b) => a + b, 0) + (gift ? CBC_PRICE : 0);
  const save = separate - checkup.price;
  const pct = Math.round((save / separate) * 100);

  // Табличная сетка: иконка — название — цена/галочка
  const rowBase = "grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 border-t py-3.5 text-base";
  const rowL = `${rowBase} border-primary-foreground/15`;
  const rowR = `${rowBase} border-border`;

  const iconBoxL = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted";
  const iconBoxR = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10";

  const renderIcon = (icon: MarkerIcon, dark: boolean) =>
    icon.kind === "text" ? (
      <span className={`text-xs font-semibold ${dark ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {icon.label}
      </span>
    ) : (
      <icon.Icon className={`h-5 w-5 ${dark ? "text-primary-foreground/80" : "text-muted-foreground"}`} />
    );

  const expandRow = (dark: boolean) =>
    hiddenCount > 0 && !expanded ? (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`${dark ? rowL : rowR} w-full text-left transition-opacity hover:opacity-70`}
      >
        <span className={dark ? iconBoxR : iconBoxL}>
          <Plus className={`h-5 w-5 ${dark ? "text-primary-foreground/80" : "text-muted-foreground"}`} />
        </span>
        <span className={dark ? "text-primary-foreground/70" : "text-muted-foreground"}>
          Ещё {hiddenCount} {pluralMarkers(hiddenCount)}
        </span>
        <ChevronRight className={`h-4 w-4 ${dark ? "text-primary-foreground/50" : "text-muted-foreground/60"}`} />
      </button>
    ) : null;

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
                <div key={m.title} className="flex items-center justify-between gap-4 border-t border-border py-3 text-sm">
                  <span className="text-foreground">{m.title}</span>
                  <span className="shrink-0 whitespace-nowrap text-foreground">{money(prices[i])}</span>
                </div>
              ))}
              {gift && (
                <div className="flex items-center justify-between gap-4 border-t border-border py-3 text-sm">
                  <span className="text-foreground">Общий анализ крови</span>
                  <span className="shrink-0 whitespace-nowrap text-foreground">{money(CBC_PRICE)}</span>
                </div>
              )}
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
            <div className="mt-5 flex items-baseline justify-between gap-4 rounded-2xl bg-primary/10 px-4 py-4">
              <span className="font-medium text-foreground">Ваша выгода</span>
              <span className="shrink-0 text-2xl font-semibold text-primary">{money(save)}</span>
            </div>
          </div>
        </div>

        {/* Десктоп и планшет — две таблицы */}
        <div className="mt-8 hidden gap-4 md:grid md:grid-cols-2">
          {/* По отдельности */}
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="font-display text-3xl text-foreground">Если сдавать отдельно</div>
            <div className="mb-4 mt-1 text-sm text-muted-foreground">в лаборатории и у врача</div>
            <div>
              {checkup.markers.slice(0, VISIBLE_MARKERS).map((m, i) => (
                <div key={m.title} className={rowR}>
                  <span className={iconBoxL}>{renderIcon(markerIcon(m.title), false)}</span>
                  <span className="text-foreground">{m.title}</span>
                  <span className="shrink-0 whitespace-nowrap text-foreground">{money(prices[i])}</span>
                </div>
              ))}
              {expanded &&
                checkup.markers.slice(VISIBLE_MARKERS).map((m, i) => (
                  <div key={m.title} className={`${rowR} animate-fade-in`}>
                    <span className={iconBoxL}>{renderIcon(markerIcon(m.title), false)}</span>
                    <span className="text-foreground">{m.title}</span>
                    <span className="shrink-0 whitespace-nowrap text-foreground">{money(prices[VISIBLE_MARKERS + i])}</span>
                  </div>
                ))}
              {gift && (
                <div className={rowR}>
                  <span className={iconBoxL}>
                    <Droplet className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <span className="text-foreground">Общий анализ крови</span>
                  <span className="shrink-0 whitespace-nowrap text-foreground">{money(CBC_PRICE)}</span>
                </div>
              )}
              {expandRow(false)}
            </div>
            <div className="mt-2 border-t border-border pt-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Итого по отдельности
                <Info className="h-4 w-4" />
              </div>
              <div className="mt-1 text-4xl font-semibold text-muted-foreground line-through md:text-5xl">
                {money(separate)}
              </div>
            </div>
          </div>

          {/* ReAge */}
          <div className="flex flex-col rounded-3xl bg-primary p-6 text-primary-foreground md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-display text-3xl">ReAge</div>
                <div className="mt-1 text-sm text-primary-foreground/70">Чекап «{checkup.name}»</div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground px-3 py-1.5 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Всё включено
              </span>
            </div>
            <div className="mt-4 flex-1">
              {checkup.markers.slice(0, VISIBLE_MARKERS).map((m) => (
                <div key={m.title} className={rowL}>
                  <span className={iconBoxR}>{renderIcon(markerIcon(m.title), true)}</span>
                  <span>{m.title}</span>
                  <Check className="h-5 w-5 shrink-0 text-primary-foreground/70" />
                </div>
              ))}
              {expanded &&
                checkup.markers.slice(VISIBLE_MARKERS).map((m) => (
                  <div key={m.title} className={`${rowL} animate-fade-in`}>
                    <span className={iconBoxR}>{renderIcon(markerIcon(m.title), true)}</span>
                    <span>{m.title}</span>
                    <Check className="h-5 w-5 shrink-0 text-primary-foreground/70" />
                  </div>
                ))}
              {gift && (
                <div className={rowL}>
                  <span className={iconBoxR}>
                    <Droplet className="h-5 w-5 text-primary-foreground/80" />
                  </span>
                  <span>Общий анализ крови</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm">
                    <Gift className="h-4 w-4" /> в подарок
                  </span>
                </div>
              )}
              {expandRow(true)}
            </div>
            <div className="mt-2 border-t border-primary-foreground/15 pt-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm text-primary-foreground/70">Цена пакета</div>
                  <div className="mt-1 text-4xl font-semibold md:text-5xl">{money(checkup.price)}</div>
                </div>
                <div className="rounded-2xl bg-primary-foreground/10 px-4 py-3">
                  <div className="text-sm text-primary-foreground/80">Ваша экономия</div>
                  <div className="mt-0.5 text-xl font-semibold">
                    {money(save)} · −{pct}%
                  </div>
                </div>
              </div>
              <Button
                onClick={addToCart}
                className="mt-5 h-14 w-full rounded-full bg-primary-foreground text-base font-semibold text-primary hover:bg-primary-foreground/90"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
                Пройти чекап за {money(checkup.price)}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center md:hidden">
          <Button size="lg" onClick={addToCart} className="h-12 w-full text-base sm:w-auto sm:px-8">
            <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
            Купить — {money(checkup.price)}
          </Button>
        </div>
      </div>
    </section>
  );
}
