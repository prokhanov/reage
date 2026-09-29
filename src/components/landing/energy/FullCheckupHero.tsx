import { ArrowRight, Check, Droplet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { markersLabel, money, type Checkup } from "@/data/checkups";
import { FULL_CHECKUP_MARKERS_COUNT, FULL_CHECKUP_TIERS, type FullTierId } from "@/data/fullCheckup";
import type { TierComposition } from "@/hooks/useFullCheckupTiers";
import { cn } from "@/lib/utils";

interface Props {
  checkup: Checkup;
  onAddToCart: () => void;
  tierId: FullTierId;
  onTierChange: (id: FullTierId) => void;
  /** Цены вариантов (с учётом настроек в админке). */
  tierPrices: Record<FullTierId, number>;
  compositions: TierComposition[] | null;
  onOpenCompare: () => void;
}

export function FullCheckupHero({
  checkup,
  onAddToCart,
  tierId,
  onTierChange,
  tierPrices,
  compositions,
  onOpenCompare,
}: Props) {
  const tierIdx = FULL_CHECKUP_TIERS.findIndex((t) => t.id === tierId);
  const countOf = (i: number) =>
    compositions?.[FULL_CHECKUP_TIERS[i].planIndex]?.count ??
    (FULL_CHECKUP_TIERS[i].id === "full" ? FULL_CHECKUP_MARKERS_COUNT : 0);
  const count = countOf(tierIdx);
  const prevCount = tierIdx > 0 ? countOf(tierIdx - 1) : 0;
  const addNote =
    tierIdx === 0
      ? `Ключевые показатели по всем системам организма — ${markersLabel(count)}`
      : `+ ${markersLabel(Math.max(count - prevCount, 0))} к ${tierIdx === 1 ? "Базовому" : "Полному"} — полная картина по ${markersLabel(count)}`;

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
            {checkup.heroSubtitle}
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

          <div className="mt-7 max-w-[520px]">
            <p className="mb-2.5 text-[13px] uppercase tracking-[0.05em] text-muted-foreground">
              Вариант чекапа
            </p>
            <div
              role="radiogroup"
              aria-label="Вариант чекапа"
              className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1"
            >
              {FULL_CHECKUP_TIERS.map((t) => {
                const active = t.id === tierId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onTierChange(t.id)}
                    className={cn(
                      "relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-16",
                      active
                        ? "border-primary bg-card shadow-sm"
                        : "border-transparent hover:bg-card/50",
                    )}
                  >
                    {t.popular && (
                      <span
                        className={cn(
                          "absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
                          active ? "bg-primary text-primary-foreground" : "bg-border text-foreground",
                        )}
                      >
                        Популярный
                      </span>
                    )}
                    <span className={cn("text-sm text-foreground sm:font-display sm:text-[17px]", active && "font-medium")}>
                      {t.label}
                    </span>
                    <span className="text-xs text-muted-foreground sm:text-[13px]">{money(tierPrices[t.id])}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm leading-snug text-foreground/80">{addNote}</p>
          </div>

          <div className="mt-6 flex flex-col items-start gap-3 sm:mt-7">
            <p className="text-sm text-muted-foreground sm:text-base">
              {markersLabel(count)} · Без записи
            </p>

            <div className="flex flex-wrap items-baseline gap-3">
              <div className="text-[2rem] leading-none text-foreground sm:text-4xl">
                {money(checkup.price)}
              </div>
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
              <button
                type="button"
                onClick={onOpenCompare}
                className="text-sm text-foreground underline underline-offset-4 hover:text-primary sm:text-base"
              >
                Что входит в каждый вариант
              </button>
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
