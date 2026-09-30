import { PartnerPrice, usePartnerPrice } from "@/components/PartnerPrice";
import { Fragment, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Dna,
  Droplet,
  FileText,
  Gift,
  Info,
  Pill,
  Plus,
  ShoppingCart,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/data/checkups";
import { useEnergyOrder } from "@/components/landing/energy/EnergyOrderContext";

const VISIBLE_MARKERS = 5;
const MOBILE_VISIBLE = 3;

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
  const pp = usePartnerPrice();
  const { checkup, addToCart } = useEnergyOrder();
  const gift = !!checkup.cbcBonusEnabled;
  const [expanded, setExpanded] = useState(false);
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

  const mobileList: { title: string; price: number }[] = [
    ...checkup.markers.map((m, i) => ({ title: m.title, price: prices[i] })),
    ...(gift && !checkup.markers.some((m) => /общий анализ крови/i.test(m.title))
      ? [{ title: "Общий анализ крови", price: CBC_PRICE }]
      : []),
  ];
  const mobileHidden = Math.max(mobileList.length - MOBILE_VISIBLE, 0);

  // Колонки одной сетки: ячейки идут парами L/R, поэтому строки стоят на одной линии.
  // На мобильных всё складывается: сначала левая карточка (order-1), потом правая (order-2).
  const cellL = "max-md:order-1 bg-card px-5 md:px-8";
  const cellR = "max-md:order-2 bg-primary px-5 text-primary-foreground md:px-8";

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

  const hideOnMobile = "max-md:hidden";

  const rowClassL = (i: number) =>
    `flex min-h-[62px] items-center gap-3.5 py-2 ${i === 0 ? "border-t border-border" : ""}`;
  const rowClassR = (i: number) =>
    `flex min-h-[62px] items-center gap-3.5 py-2 ${i === 0 ? "border-t border-primary-foreground/15" : ""}`;

  return (
    <section className="px-4 py-12 md:py-16">
      <div className="mx-auto max-w-5xl rounded-3xl bg-muted/60 px-4 py-10 md:px-12">
        <div className="text-center">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">Пакетом дешевле</h2>
          <p className="mt-2 text-muted-foreground">Чекап «{checkup.name}»</p>
        </div>

        {/* ============ Мобильная версия — плитки и карточки ============ */}
        <div className="mt-8 md:hidden">
          <div className="rounded-3xl bg-card px-5 py-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-2xl leading-tight text-foreground">Сдать по отдельности</h3>
              <span className="shrink-0 text-xl font-semibold tabular-nums text-muted-foreground line-through">{money(separate)}</span>
            </div>

            <div className="mt-5 border-t border-border pt-3">
              {mobileList.slice(0, MOBILE_VISIBLE).map(({ title, price }) => (
                <div key={title} className="flex items-center gap-2.5 py-2 text-[15px] text-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span className="min-w-0 flex-1 leading-snug">{title}</span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{money(price)}</span>
                </div>
              ))}

              {!expanded && mobileHidden > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mt-1 flex w-full items-center gap-1.5 py-2 text-[15px] text-muted-foreground transition-opacity hover:opacity-70"
                >
                  <span className="underline decoration-dashed underline-offset-4">
                    Ещё {mobileHidden} {pluralMarkers(mobileHidden)}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </button>
              )}

              {expanded &&
                mobileList.slice(MOBILE_VISIBLE).map(({ title, price }) => (
                  <div key={title} className="flex animate-fade-in items-center gap-2.5 py-2 text-[15px] text-foreground">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                    <span className="min-w-0 flex-1 leading-snug">{title}</span>
                    <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{money(price)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-primary/10 px-5 py-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-2xl leading-tight text-primary">Пакетом в ReAge</h3>
              <span className="shrink-0 text-2xl font-semibold tabular-nums text-primary"><PartnerPrice price={checkup.price} /></span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((checkup.price / separate) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-sm font-semibold text-primary">−{pct}%</span>
            </div>

            <div className="mt-4 flex items-start gap-2.5 text-[15px] font-medium text-primary">
              <FileText className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1 leading-snug">
                Получаете подробную расшифровку всех показателей, оценку рисков и рекомендации по улучшению
              </span>
              <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-primary/15 px-5 py-4">
              <span className="text-[15px] font-medium text-primary">Ваша выгода</span>
              <span className="text-2xl font-semibold tabular-nums text-primary">{money(save)}</span>
            </div>
          </div>

          <Button
            onClick={addToCart}
            className="mt-5 h-[76px] w-full rounded-2xl text-xl font-semibold"
          >
            <ShoppingCart className="h-6 w-6 shrink-0" aria-hidden />
            Пройти чекап за {money(pp(checkup.price))}
            <ArrowRight className="h-6 w-6 shrink-0" aria-hidden />
          </Button>
        </div>

        {/* ============ Десктоп/планшет — таблица парами ============ */}
        <div className="mt-8 hidden grid-cols-1 md:grid md:grid-cols-2 md:gap-x-5">
          {/* Шапки */}
          <div className={`${cellL} rounded-t-3xl pb-5 pt-8`}>
            <h3 className="font-display text-[1.75rem] leading-tight text-foreground md:text-3xl">Если сдавать отдельно</h3>
            <p className="mt-1 text-[15px] text-muted-foreground">в лаборатории и у врача</p>
          </div>
          <div className={`${cellR} rounded-t-3xl pb-5 pt-8`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-[1.75rem] leading-tight md:text-3xl">ReAge</h3>
                <p className="mt-1 text-[15px] text-primary-foreground/70">Чекап «{checkup.name}»</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground px-3.5 py-2 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Всё включено
              </span>
            </div>
          </div>

          {/* Показатели — парами, чтобы строки совпадали */}
          {checkup.markers.slice(0, VISIBLE_MARKERS).map((m, i) => (
            <Fragment key={m.title}>
              <div className={`${cellL} ${hideOnMobile}`}>
                <div className={rowClassL(i)}>
                  <span className={iconBoxL}>{renderIcon(markerIcon(m.title), false)}</span>
                  <span className="flex-1 text-[15px] leading-snug text-foreground">{m.title}</span>
                  <span className="shrink-0 whitespace-nowrap text-[15px] tabular-nums text-foreground">{money(prices[i])}</span>
                </div>
              </div>
              <div className={cellR}>
                <div className={rowClassR(i)}>
                  <span className={iconBoxR}>{renderIcon(markerIcon(m.title), true)}</span>
                  <span className="flex-1 text-[15px] leading-snug">{m.title}</span>
                  <Check className="h-5 w-5 shrink-0 text-primary-foreground/70" />
                </div>
              </div>
            </Fragment>
          ))}

          {/* Кнопка «Ещё N показателей» — тоже парой */}
          {hiddenCount > 0 && !expanded && (
            <Fragment>
              <div className={`${cellL} ${hideOnMobile}`}>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="flex min-h-[62px] w-full items-center gap-3.5 py-2 text-left transition-opacity hover:opacity-70"
                >
                  <span className={iconBoxL}>
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <span className="flex-1 text-[15px] text-muted-foreground underline decoration-dashed underline-offset-4">
                    Ещё {hiddenCount} {pluralMarkers(hiddenCount)}
                  </span>
                </button>
              </div>
              <div className={cellR}>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="flex min-h-[62px] w-full items-center gap-3.5 py-2 text-left transition-opacity hover:opacity-70"
                >
                  <span className={iconBoxR}>
                    <Plus className="h-5 w-5 text-primary-foreground/80" />
                  </span>
                  <span className="flex-1 text-[15px] text-primary-foreground/80 underline decoration-dashed decoration-primary-foreground/40 underline-offset-4">
                    Ещё {hiddenCount} {pluralMarkers(hiddenCount)}
                  </span>
                </button>
              </div>
            </Fragment>
          )}

          {/* Скрытые показатели — парами */}
          {expanded &&
            checkup.markers.slice(VISIBLE_MARKERS).map((m, i) => (
              <Fragment key={m.title}>
                <div className={`${cellL} ${hideOnMobile} animate-fade-in`}>
                  <div className={rowClassL(-1)}>
                    <span className={iconBoxL}>{renderIcon(markerIcon(m.title), false)}</span>
                    <span className="flex-1 text-[15px] leading-snug text-foreground">{m.title}</span>
                    <span className="shrink-0 whitespace-nowrap text-[15px] tabular-nums text-foreground">{money(prices[VISIBLE_MARKERS + i])}</span>
                  </div>
                </div>
                <div className={`${cellR} animate-fade-in`}>
                  <div className={rowClassR(-1)}>
                    <span className={iconBoxR}>{renderIcon(markerIcon(m.title), true)}</span>
                    <span className="flex-1 text-[15px] leading-snug">{m.title}</span>
                    <Check className="h-5 w-5 shrink-0 text-primary-foreground/70" />
                  </div>
                </div>
              </Fragment>
            ))}

          {/* ОАК в подарок — парой */}
          {gift && (
            <Fragment>
              <div className={`${cellL} ${hideOnMobile}`}>
                <div className={rowClassL(-1)}>
                  <span className={iconBoxL}>
                    <Droplet className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <span className="flex-1 text-[15px] leading-snug text-foreground">Общий анализ крови</span>
                  <span className="shrink-0 whitespace-nowrap text-[15px] tabular-nums text-foreground">{money(CBC_PRICE)}</span>
                </div>
              </div>
              <div className={cellR}>
                <div className={rowClassR(-1)}>
                  <span className={iconBoxR}>
                    <Droplet className="h-5 w-5 text-primary-foreground/80" />
                  </span>
                  <span className="flex-1 text-[15px] leading-snug">Общий анализ крови</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm">
                    <Gift className="h-4 w-4" /> в подарок
                  </span>
                </div>
              </div>
            </Fragment>
          )}

          {/* Отчёт — парой */}
          <Fragment>
            <div className={`${cellL} ${hideOnMobile}`}>
              <div className={rowClassL(-1)}>
                <span className={iconBoxL}>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </span>
                <span className="flex-1 text-[15px] font-medium leading-snug text-foreground">
                  Получаете только список показателей и референсные пределы, без пояснений
                </span>
                <X className="h-5 w-5 shrink-0 text-muted-foreground/50" />
              </div>
            </div>
            <div className={cellR}>
              <div className={rowClassR(-1)}>
                <span className={iconBoxR}>
                  <FileText className="h-5 w-5 text-primary-foreground/80" />
                </span>
                <span className="flex-1 text-[15px] font-medium leading-snug">
                  Получаете подробную расшифровку всех показателей, оценку рисков и рекомендации по улучшению
                </span>
                <Check className="h-5 w-5 shrink-0 text-primary-foreground/70" />
              </div>
            </div>
          </Fragment>

          {/* Итоги + кнопка */}
          <div className={`${cellL} max-md:mb-5 rounded-b-3xl pb-8 pt-6`}>
            <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
              Итого по отдельности
              <Info className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-4xl font-semibold tabular-nums tracking-tight text-muted-foreground line-through md:text-5xl">
              {money(separate)}
            </div>
          </div>
          <div className={`${cellR} rounded-b-3xl pb-8 pt-6`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[15px] text-primary-foreground/70">Цена пакета</div>
                <div className="mt-1.5 text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">
                  <PartnerPrice price={checkup.price} />
                </div>
              </div>
              <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-3">
                <div className="text-[15px] text-primary-foreground/80">Ваша экономия</div>
                <div className="mt-1 whitespace-nowrap text-xl font-semibold">
                  {money(save)} · <span className="text-accent">−{pct}%</span>
                </div>
              </div>
            </div>
            <Button
              onClick={addToCart}
              className="mt-6 h-[88px] w-full rounded-2xl bg-primary-foreground text-xl font-semibold text-primary hover:bg-primary-foreground/90 md:text-2xl"
            >
              <ShoppingCart className="h-7 w-7 shrink-0" aria-hidden />
              Пройти чекап за {money(pp(checkup.price))}
              <ArrowRight className="h-7 w-7 shrink-0" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
