import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CheckupFacts } from "@/data/checkups";

interface Props {
  facts: CheckupFacts;
  price: number;
  inCart: boolean;
  onAddToCart: () => void;
}

const formatPrice = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

/** Блок «почему стоит проверить» с карточками-фактами. Данные — из `checkup.facts`. */
export function CheckupFactsBlock({ facts, price, inCart, onAddToCart }: Props) {
  return (
    <section className="border-b hairline bg-muted/40 max-lg:overflow-x-clip">
      <div className="mx-auto grid w-full max-w-[72rem] items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{facts.eyebrow}</p>
          <h2 className="mt-4 text-balance font-display text-[2rem] leading-[1.1] text-foreground sm:text-4xl lg:text-[2.75rem]">
            {facts.title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{facts.text}</p>
          <div className="mt-8 flex items-center gap-5 sm:gap-6">
            <Button size="lg" className="h-[52px] flex-1 gap-2 text-base sm:h-12 sm:flex-none" onClick={onAddToCart}>
              {inCart ? <Check className="h-4 w-4" aria-hidden /> : null}
              {inCart ? "В корзине" : facts.ctaLabel}
              {!inCart ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </Button>
            <span className="shrink-0 font-display font-bold text-2xl text-foreground sm:text-3xl">{formatPrice(price)}</span>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {facts.items.map((item) => (
            <article
              key={item.label}
              className="flex min-w-0 flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7"
            >
              <h3 className="font-sans text-base font-semibold text-foreground">{item.label}</h3>
              <p className="mt-3 font-display text-4xl leading-[1.05] text-primary sm:text-[2.35rem]">{item.value}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
