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
    <section className="relative flex flex-col-reverse overflow-hidden border-b hairline bg-background md:block md:min-h-[700px]">
      {/* Photo area — right side on desktop, below text on mobile */}
      <div className="relative mt-8 h-[300px] w-full overflow-hidden rounded-t-[2rem] md:absolute md:inset-y-0 md:right-0 md:mt-0 md:h-auto md:w-[54%] md:rounded-none">

        <img
          src={heroWoman}
          alt="Девушка с закрытыми глазами на солнце"
          width={1024}
          height={1024}
          className="h-full w-full object-cover object-center"
        />
        {/* Soft organic curve blending photo into the light background */}
        <div
          className="pointer-events-none absolute -left-[16%] -top-[10%] hidden h-[120%] w-[34%] rounded-[100%] bg-background md:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 -top-8 h-16 rounded-[100%] bg-background md:hidden"
          aria-hidden
        />
        <p
          className="absolute right-4 top-12 text-right text-[9px] font-medium uppercase leading-relaxed tracking-[0.22em] text-foreground/80 md:right-10 md:top-12 md:text-xs"
          style={{ textShadow: "0 1px 2px hsl(var(--background) / 0.85)" }}
        >
          <span className="whitespace-nowrap">Больше энергии</span>
          <br />
          <span className="whitespace-nowrap">для важных вещей</span>
          <span className="mt-3 ml-auto block h-px w-16 bg-foreground/30" />
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[72rem] px-4 pb-2 pt-12 md:px-6 md:pb-20 md:pt-24">
        <div className="md:w-[48%] md:pr-8">
          <span className="inline-flex items-center gap-2 rounded-full border hairline bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            Анализы сдаются в LabQuest
          </span>

          <h1 className="font-display mt-6 text-5xl leading-[1.05] text-foreground md:text-6xl">
            ReAge Energy
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            Чекап для тех, кто просыпается уставшим. Шесть анализов, которые чаще всего
            объясняют нехватку энергии.
          </p>

          <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.title} className="rounded-xl border hairline bg-card/70 p-4">
                <f.icon className="h-5 w-5 text-primary" aria-hidden />
                <dt className="mt-2 text-sm font-medium text-foreground">{f.title}</dt>
                <dd className="text-xs leading-snug text-muted-foreground">{f.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <div className="font-mono-tech text-3xl text-foreground md:text-4xl">5 990 ₽</div>
            <Button size="lg" onClick={onAddToCart} className="gap-2">
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
