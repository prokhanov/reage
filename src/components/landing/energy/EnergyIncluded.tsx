import { useState } from "react";
import {
  Activity,
  Battery,
  Bolt,
  ChevronDown,
  Droplet,
  Flame,
  Gauge,
  HeartPulse,
  Leaf,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

interface IncludedItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

const items: IncludedItem[] = [
  { title: "Общий анализ крови", description: "воспаление и риск анемии", icon: Droplet },
  { title: "Ферритин", description: "запасы железа в тканях", icon: Battery },
  { title: "Витамин D (25-OH)", description: "иммунитет и тонус", icon: Sun },
  { title: "ТТГ", description: "работа щитовидной железы", icon: Activity },
  { title: "В12", description: "нервная система и энергия клеток", icon: Bolt },
  { title: "Гемоглобин", description: "перенос кислорода к тканям", icon: Wind },
  { title: "Железо сывороточное", description: "доступное железо прямо сейчас", icon: Gauge },
  { title: "Трансферрин", description: "транспорт железа в крови", icon: Waves },
  { title: "Т4 свободный", description: "уточняет работу щитовидной железы", icon: Activity },
  { title: "Т3 свободный", description: "скорость обмена веществ", icon: Activity },
  { title: "Глюкоза", description: "уровень сахара сейчас", icon: Sparkles },
  { title: "HbA1c", description: "средний сахар за три месяца", icon: Gauge },
  { title: "Инсулин", description: "чувствительность тканей к инсулину", icon: Flame },
  { title: "Фолиевая кислота", description: "кроветворение и нервная система", icon: Leaf },
  { title: "Магний", description: "сон, тревожность и судороги", icon: Moon },
  { title: "С-реактивный белок", description: "скрытое воспаление", icon: Shield },
  { title: "АЛТ и АСТ", description: "нагрузка на печень", icon: Leaf },
  { title: "Креатинин и СКФ", description: "работа почек", icon: Waves },
  { title: "Липидный профиль", description: "холестерин и сосуды", icon: HeartPulse },
  { title: "Кортизол утренний", description: "реакция на стресс", icon: Flame },
];

const VISIBLE = 6;

export function EnergyIncluded() {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, VISIBLE);
  const hiddenCount = items.length - VISIBLE;

  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
            Что входит в ReAge Energy
          </h2>
          <p className="mt-2 text-base text-muted-foreground md:text-lg">
            Двадцать показателей, с которых начинается разбор причин усталости.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card sm:mt-8">
          <ul className="grid gap-x-12 gap-y-6 p-6 sm:p-8 md:grid-cols-2 md:gap-y-7">
            {visibleItems.map((item) => (
              <li key={item.title} className="flex min-w-0 items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-foreground md:text-xl">{item.title}</h3>
                  <p className="mt-0.5 text-base leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-4 text-base text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? "свернуть" : `показать ещё ${hiddenCount}`}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
