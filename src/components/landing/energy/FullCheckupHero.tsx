import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { money, type Checkup } from "@/data/checkups";
import { FULL_CHECKUP_MARKERS_COUNT } from "@/data/fullCheckup";

interface Props {
  checkup: Checkup;
  onAddToCart: () => void;
}

export function FullCheckupHero({ checkup, onAddToCart }: Props) {
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
          <span className="inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {checkup.tag}
          </span>

          <h1 className="font-display mt-4 text-balance text-[2.1rem] leading-[1.1] text-foreground sm:text-[2.75rem] xl:text-[3.4rem]">
            {checkup.heroTitle}
          </h1>
          <p className="mt-3 max-w-md text-lg leading-relaxed text-muted-foreground sm:mt-4 xl:text-xl">
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

          <div className="mt-6 flex flex-col items-start gap-3 sm:mt-8">
            <p className="text-sm text-muted-foreground sm:text-base">
              {FULL_CHECKUP_MARKERS_COUNT} показателей · Без записи
            </p>

            <div className="flex flex-wrap items-baseline gap-3">
              <div className="font-mono-tech text-[2rem] leading-none text-foreground sm:text-4xl">
                {money(checkup.price)}
              </div>
            </div>

            <Button
              id="energy-hero-cta"
              size="lg"
              onClick={onAddToCart}
              className="mt-1 h-[52px] w-full gap-2 text-base sm:h-12 sm:w-auto"
            >
              Купить
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
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
