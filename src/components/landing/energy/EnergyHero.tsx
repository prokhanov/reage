import { FlaskConical, Building2, Clock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import heroWoman from "@/assets/energy/hero-woman.jpg";

const facts = [
  { icon: FlaskConical, title: "6 анализов", text: "Ключевые причины усталости" },
  { icon: Building2, title: "LabQuest", text: "Сеть лабораторий" },
  { icon: Clock, title: "1–2 дня", text: "Готовность результатов" },
];

interface Props {
  onAddToCart: () => void;
}

export function EnergyHero({ onAddToCart }: Props) {
  return (
    <section className="relative flex flex-col-reverse overflow-hidden border-b hairline bg-background lg:block lg:min-h-[640px] xl:min-h-[700px]">
      {/* Photo area — right side on desktop, below text on mobile/tablet */}
      <div className="relative mt-8 aspect-[4/3] max-h-[420px] w-full overflow-hidden rounded-t-[2rem] sm:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:aspect-auto lg:h-auto lg:max-h-none lg:w-[52%] lg:rounded-none">

        <img
          src={heroWoman}
          alt="Девушка с закрытыми глазами на солнце"
          width={1024}
          height={1024}
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="h-full w-full object-cover object-[50%_35%] lg:object-center"
        />
        {/* Soft organic curve blending photo into the light background */}
        <div
          className="pointer-events-none absolute -left-[16%] -top-[10%] hidden h-[120%] w-[34%] rounded-[100%] bg-background lg:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 -top-8 h-16 rounded-[100%] bg-background lg:hidden"
          aria-hidden
        />
        <p
          className="absolute right-4 top-8 text-right text-[9px] font-medium uppercase leading-relaxed tracking-[0.22em] text-foreground/80 sm:top-10 sm:text-[10px] lg:right-10 lg:top-12 lg:text-xs"
          style={{ textShadow: "0 1px 2px hsl(var(--background) / 0.85)" }}
        >
          <span className="whitespace-nowrap">Больше энергии</span>
          <br />
          <span className="whitespace-nowrap">для важных вещей</span>
          <span className="mt-3 ml-auto block h-px w-16 bg-foreground/30" />
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[72rem] px-4 pb-2 pt-10 sm:px-6 sm:pt-12 lg:pb-20 lg:pt-24">
        <div className="lg:w-[48%] lg:pr-8">

          <span className="inline-flex items-center gap-2 rounded-full border hairline bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            Анализы сдаются в LabQuest
          </span>

          <h1 className="font-display mt-5 text-4xl leading-[1.05] text-foreground sm:mt-6 sm:text-5xl xl:text-6xl">
            ReAge Energy
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground xl:text-lg">
            Чекап для тех, кто просыпается уставшим. Шесть анализов, которые чаще всего
            объясняют нехватку энергии.
          </p>

          <dl className="mt-7 grid grid-cols-1 gap-3 xs:grid-cols-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl border hairline bg-card/70 p-4 sm:block">
                <f.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="sm:mt-2">
                  <dt className="text-sm font-medium text-foreground">{f.title}</dt>
                  <dd className="text-xs leading-snug text-muted-foreground">{f.text}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-5">
            <div className="font-mono-tech text-3xl text-foreground sm:text-4xl">5 990 ₽</div>
            <Button size="lg" onClick={onAddToCart} className="w-full gap-2 sm:w-auto">
              Добавить в корзину
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">Результаты в ReAge</p>
        </div>
      </div>
    </section>
  );
}
