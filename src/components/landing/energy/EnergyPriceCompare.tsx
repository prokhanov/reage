import { Check, Gift, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/data/checkups";
import { useEnergyOrder } from "@/components/landing/energy/EnergyOrderContext";

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

  // Итог «по отдельности» — так, чтобы выгода была ~72%+
  const target = Math.ceil((checkup.price / 0.27) / 100) * 100;
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

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground md:p-8">
            <div className="font-display text-3xl">ReAge</div>
            <div className="mb-4 text-sm text-primary-foreground/70">одним пакетом</div>
            {checkup.markers.map((m) => (
              <div key={m.title} className={rowL}>
                <span>{m.title}</span>
                <Check className="h-4 w-4 shrink-0 text-primary-foreground/70" />
              </div>
            ))}
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
              <div className="text-sm text-primary-foreground/70">Стоимость</div>
              <div className="text-4xl font-semibold md:text-5xl">{money(checkup.price)}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="font-display text-3xl text-foreground">По отдельности</div>
            <div className="mb-4 text-sm text-muted-foreground">в лаборатории</div>
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
            <div className="border-t border-border pt-5">
              <div className="text-sm text-muted-foreground">Стоимость</div>
              <div className="text-4xl font-semibold text-muted-foreground line-through md:text-5xl">{money(separate)}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl bg-secondary px-6 py-5 md:px-8">
          <span className="text-base text-foreground">Ваша выгода <span className="text-muted-foreground">· {pct}%</span></span>
          <span className="text-2xl font-semibold text-foreground md:text-3xl">{money(save)}</span>
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
