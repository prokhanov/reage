import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface IncludedItem {
  title: string;
  description: string;
}

const items: IncludedItem[] = [
  { title: "Общий анализ крови", description: "воспаление и риск анемии" },
  { title: "Ферритин", description: "запасы железа в тканях" },
  { title: "Витамин D (25-OH)", description: "иммунитет и тонус" },
  { title: "ТТГ", description: "работа щитовидной железы" },
  { title: "В12", description: "нервная система и энергия клеток" },
  { title: "Гемоглобин", description: "перенос кислорода к тканям" },
  { title: "Железо сывороточное", description: "доступное железо прямо сейчас" },
  { title: "Трансферрин", description: "транспорт железа в крови" },
  { title: "Т4 свободный", description: "уточняет работу щитовидной железы" },
  { title: "Т3 свободный", description: "скорость обмена веществ" },
  { title: "Глюкоза", description: "уровень сахара сейчас" },
  { title: "HbA1c", description: "средний сахар за три месяца" },
  { title: "Инсулин", description: "чувствительность тканей к инсулину" },
  { title: "Фолиевая кислота", description: "кроветворение и нервная система" },
  { title: "Магний", description: "сон, тревожность и судороги" },
  { title: "С-реактивный белок", description: "скрытое воспаление" },
  { title: "АЛТ и АСТ", description: "нагрузка на печень" },
  { title: "Креатинин и СКФ", description: "работа почек" },
  { title: "Липидный профиль", description: "холестерин и сосуды" },
  { title: "Кортизол утренний", description: "реакция на стресс" },
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
          <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
            Что входит в ReAge Energy
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Двадцать показателей, с которых начинается разбор причин усталости.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card sm:mt-8">
          <ul className="grid gap-x-12 gap-y-6 p-6 sm:p-8 md:grid-cols-2 md:gap-y-7">
            {visibleItems.map((item) => (
              <li key={item.title} className="min-w-0">
                <h3 className="font-display text-base text-foreground md:text-lg">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>

          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
