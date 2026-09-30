import { PartnerPrice, usePartnerPrice } from "@/components/PartnerPrice";
import { ArrowRight, Check, Droplet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { markersLabel, money, withMarkersCount, type Checkup } from "@/data/checkups";
import { CheckupVariantSwitcher } from "@/components/landing/energy/CheckupVariantSwitcher";
import { YandexSplitBadge, calculateSplitPayment } from "@/components/landing/YandexSplitBadge";
import type { ResolvedVariant } from "@/hooks/useResolvedCheckups";

interface Props {
  checkup: Checkup;
  onAddToCart: () => void;
  variants: ResolvedVariant[];
  onVariantChange: (slug: string) => void;
  onOpenCompare: () => void;
}

export function FullCheckupHero({ checkup, onAddToCart, variants, onVariantChange, onOpenCompare }: Props) {
  const count = checkup.markers.length;

  const visual = (
    <>
      <img
        src={checkup.heroImage}
        alt={checkup.heroAlt}
        width={1024}
        height={1024}
        sizes="52vw"
        className="h-full w-full object-cover object-center"
      />
      <div
        className="absolute -left-[16%] -top-[10%] h-[120%] w-[34%] rounded-[100%] bg-background"
        aria-hidden
      />
      <p
        className="absolute right-10 top-12 text-right text-xs font-medium uppercase leading-relaxed tracking-[0.22em] text-foreground/80"
        style={{ textShadow: "0 1px 2px hsl(var(--background) / 0.85)" }}
      >
        <span className="whitespace-nowrap">{checkup.heroCaption[0]}</span>
        <br />
        <span className="whitespace-nowrap">{checkup.heroCaption[1]}</span>
        <span className="mt-3 ml-auto block h-px w-16 bg-foreground/30" />
      </p>
    </>
  );

  return (
    <section className="relative overflow-hidden border-b hairline bg-background lg:min-h-[640px] xl:min-h-[700px]">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] overflow-hidden lg:block">
        {visual}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[72rem] px-4 pb-2 pt-8 sm:px-6 sm:pt-12 lg:pb-20 lg:pt-24">
        <div className="lg:w-[48%] lg:pr-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
            <Droplet className="h-4 w-4 text-primary" aria-hidden />
            По анализам крови и мочи
          </span>

          <h1 className="font-display mt-4 text-balance text-[2.1rem] leading-[1.1] text-foreground sm:text-[2.75rem] xl:text-[3.4rem]">
            {checkup.heroTitle}
            <span className="mt-2 block text-[0.55em] font-medium leading-tight text-muted-foreground">
              по анализу крови и мочи
            </span>
          </h1>
          <p className="font-display mt-2 text-balance text-xl leading-snug text-muted-foreground sm:text-2xl xl:text-[1.75rem]">
            {withMarkersCount(checkup.heroSubtitle, count)}
          </p>

          {checkup.leadBullets && (
            <ul className="mt-5 max-w-md space-y-2 text-base text-foreground sm:text-lg">
              {checkup.leadBullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          <CheckupVariantSwitcher
            variants={variants}
            activeSlug={checkup.slug}
            onChange={onVariantChange}
          />

          <div className="mt-6 flex flex-col items-start gap-3 sm:mt-7">
            <p className="text-sm text-muted-foreground sm:text-base">
              {markersLabel(count)} · Без записи
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
              <div className="text-[2rem] font-bold leading-none text-foreground sm:text-4xl">
                <PartnerPrice price={checkup.price} />
              </div>

              <YandexSplitBadge amount={calculateSplitPayment(checkup.price)} payments={4} />
            </div>

            <div className="mt-1 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:gap-6">
              <Button
                id="energy-hero-cta"
                size="lg"
                onClick={onAddToCart}
                className="h-[52px] w-full gap-2 text-base sm:h-12 sm:w-auto"
              >
                Купить
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              {variants.length > 1 && <button
                type="button"
                onClick={onOpenCompare}
                className="text-sm text-foreground underline underline-offset-4 hover:text-primary sm:text-base"
              >
                Что входит в каждый вариант
              </button>}
            </div>
          </div>
        </div>

        <div className="relative mt-7 h-[260px] w-full overflow-hidden rounded-2xl sm:h-[320px] lg:hidden">
          <img
            src={checkup.heroImage}
            alt={checkup.heroAlt}
            width={1024}
            height={1024}
            sizes="100vw"
            className="h-full w-full object-cover object-[50%_30%]"
          />
        </div>
      </div>
    </section>
  );
}
