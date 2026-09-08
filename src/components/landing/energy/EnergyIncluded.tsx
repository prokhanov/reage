import {
  Activity,
  Battery,
  Bolt,
  Droplet,
  Gauge,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";

interface IncludedItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

const items: IncludedItem[] = [
  {
    title: "ОАК + СОЭ + лейкоцитарная формула",
    description: "воспаление и риск анемии",
    icon: Droplet,
  },
  { title: "Ферритин", description: "запасы железа в тканях", icon: Battery },
  { title: "Витамин D, 25-OH", description: "иммунитет и тонус", icon: Sun },
  { title: "Витамин B12", description: "нервная система и энергия клеток", icon: Bolt },
  { title: "ТТГ", description: "работа щитовидной железы", icon: Activity },
  { title: "Глюкоза", description: "уровень сахара сейчас", icon: Sparkles },
  { title: "HbA1c", description: "средний сахар за три месяца", icon: Gauge },
];

export function EnergyIncluded() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
            Что входит в ReAge Energy
          </h2>
          <p className="mt-2 text-base text-muted-foreground md:text-lg">
            Семь ключевых показателей, с которых начинается разбор причин усталости.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card sm:mt-8">
          <ul className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-8 sm:gap-y-6 md:gap-x-12 md:gap-y-7">
            {items.map((item) => (
              <li key={item.title} className="flex min-w-0 items-center gap-3 sm:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base text-foreground sm:text-lg md:text-xl">{item.title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground sm:text-base">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
