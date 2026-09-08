import { FlaskConical, Building2, Clock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ENERGY_CHECKUP, markersLabel, money, type Checkup } from "@/data/checkups";

interface Props {
  onAddToCart: () => void;
  checkup?: Checkup;
}

export function EnergyHero({ onAddToCart, checkup = ENERGY_CHECKUP }: Props) {
  const isEnergy = checkup.slug === "energy";

  const facts = [
    {
      icon: FlaskConical,
      title: markersLabel(checkup.markers.length),
      text: isEnergy ? "Ключевые причины усталости" : "В одном заборе крови",
    },
    { icon: Building2, title: "LabQuest", text: "Сеть лабораторий" },
    { icon: Clock, title: "1–2 дня", text: "Готовность результатов" },
  ];

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
      {/* Визуал: на десктопе — справа абсолютом, на мобильном — под кнопкой (в потоке ниже) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] overflow-hidden lg:block">
        {visual}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[72rem] px-4 pb-2 pt-8 sm:px-6 sm:pt-12 lg:pb-20 lg:pt-24">
        <div className="lg:w-[48%] lg:pr-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            Анализы сдаются в LabQuest
          </span>

          <h1 className="font-display mt-4 text-balance text-[2.1rem] leading-[1.1] text-foreground sm:mt-6 sm:text-[2.75rem] xl:text-[3.4rem]">
            {checkup.heroTitle}
          </h1>
          <p className="font-display mt-2 text-balance text-xl leading-snug text-muted-foreground sm:text-2xl xl:text-[1.75rem]">
            {checkup.heroSubtitle}
          </p>
          <p className="mt-3 max-w-md text-lg leading-relaxed text-muted-foreground sm:mt-4 xl:text-xl">
            {checkup.lead}
          </p>

          {/* Мобильные чипсы: коротко, без тяжёлых карточек */}
          <ul className="mt-5 flex flex-wrap gap-2 lg:hidden">
            {facts.map((f) => (
              <li
                key={f.title}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground"
              >
                <f.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                {f.title}
              </li>
            ))}
          </ul>

          {/* Десктопные карточки-факты */}
          <dl className="mt-7 hidden gap-3 lg:grid lg:grid-cols-3">
            {facts.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card/70 p-4">
                <f.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="mt-2">
                  <dt className="text-base font-medium text-foreground">{f.title}</dt>
                  <dd className="text-sm leading-snug text-muted-foreground">{f.text}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-8 sm:gap-5">
            <div className="font-mono-tech text-[2rem] leading-none text-foreground sm:text-4xl">
              {money(checkup.price)}
            </div>
            <Button
              id="energy-hero-cta"
              size="lg"
              onClick={onAddToCart}
              className="h-[52px] w-full gap-2 text-base sm:h-12 sm:w-auto"
            >
              Добавить в корзину
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <p className="mt-3 text-base text-muted-foreground">Результаты в ReAge</p>
        </div>

        {/* Визуал на мобильном — после CTA */}
        {isEnergy ? (
          <div className="relative mt-7 h-[260px] w-full overflow-hidden rounded-2xl sm:h-[320px] lg:hidden">
            <img
              src={heroWoman}
              alt="Девушка с закрытыми глазами на солнце"
              width={1024}
              height={1024}
              sizes="100vw"
              className="h-full w-full object-cover object-[50%_30%]"
            />
          </div>
        ) : (
          <div className="relative mt-7 h-[180px] w-full overflow-hidden rounded-2xl border border-border bg-card sm:h-[220px] lg:hidden">
            <div
              className={`absolute -right-16 -top-16 h-64 w-64 rounded-full ${a.bg} blur-3xl`}
              aria-hidden
            />
            <div
              className={`absolute inset-0 m-auto h-28 w-28 ${a.text} opacity-25 sm:h-36 sm:w-36`}
              aria-hidden
            >
              {checkupShape(checkup.shape)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
