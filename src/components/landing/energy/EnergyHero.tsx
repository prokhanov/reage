import { FlaskConical, Building2, Clock } from "lucide-react";

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
    <section className="border-b hairline">
      <div className="mx-auto grid w-full max-w-[72rem] items-center gap-10 px-4 py-12 md:grid-cols-2 md:px-6 md:py-16">
        <div>
          <span className="inline-flex items-center rounded-full border hairline bg-card px-3 py-1 text-xs text-muted-foreground">
            Анализы сдаются в LabQuest
          </span>

          <h1 className="font-display mt-5 text-4xl leading-tight text-foreground md:text-5xl">
            ReAge Energy
          </h1>
          <p className="mt-3 max-w-md text-base text-muted-foreground md:text-lg">
            Чекап для тех, кто просыпается уставшим. Шесть анализов, которые чаще всего
            объясняют нехватку энергии.
          </p>

          <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.title} className="rounded-xl border hairline bg-card p-4">
                <f.icon className="h-5 w-5 text-primary" aria-hidden />
                <dt className="mt-2 text-sm font-medium text-foreground">{f.title}</dt>
                <dd className="text-xs text-muted-foreground">{f.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="font-mono-tech text-3xl text-foreground">5 990 ₽</div>
            <Button size="lg" onClick={onAddToCart}>
              Добавить в корзину
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Результаты в ReAge</p>
        </div>

        <figure className="relative overflow-hidden rounded-2xl border hairline bg-card">
          <img
            src={heroWoman}
            alt="Девушка с закрытыми глазами на солнце"
            width={1024}
            height={1024}
            className="h-full w-full object-cover"
          />
          <figcaption
            className="absolute top-6 right-6 text-right text-[10px] font-medium uppercase leading-relaxed tracking-[0.22em] text-foreground/80 md:top-10 md:right-10 md:text-xs"
            style={{ textShadow: "0 1px 2px hsl(var(--background) / 0.85)" }}
          >
            <span className="whitespace-nowrap">Больше энергии</span>
            <br />
            <span className="whitespace-nowrap">для важных вещей</span>
            <span className="mt-3 ml-auto block h-px w-16 bg-foreground/30" />
          </figcaption>

        </figure>
      </div>
    </section>
  );
}
