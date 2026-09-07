import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type MarkerColor = "primary" | "accent" | "info";

interface IncludedItem {
  title: string;
  description: string;
  tag: string;
  color: MarkerColor;
}

const items: IncludedItem[] = [
  {
    title: "Общий анализ крови",
    description: "проверяет общее состояние крови, воспаление и риск анемии",
    tag: "базовый скрининг",
    color: "primary",
  },
  {
    title: "Ферритин",
    description: "при падении клетки получают меньше кислорода — отсюда разбитость",
    tag: "запасы железа",
    color: "accent",
  },
  {
    title: "Витамин D (25-OH)",
    description: "дефицит — одна из частых причин вялости и сниженного настроения",
    tag: "иммунитет и тонус",
    color: "info",
  },
  {
    title: "ТТГ",
    description: "сбой в её работе легко маскируется под обычную усталость",
    tag: "щитовидная железа",
    color: "accent",
  },
  {
    title: "В12",
    description: "нужен для нервной системы и производства энергии в клетках",
    tag: "нервная система",
    color: "info",
  },
  {
    title: "Гемоглобин",
    description: "определяет базовую выносливость при обычной нагрузке",
    tag: "перенос кислорода",
    color: "primary",
  },
  {
    title: "Железо сывороточное",
    description: "показывает, сколько железа доступно прямо сейчас",
    tag: "обмен железа",
    color: "accent",
  },
  {
    title: "Трансферрин",
    description: "отражает, насколько организм пытается «добрать» железо",
    tag: "транспорт железа",
    color: "accent",
  },
  {
    title: "Т4 свободный",
    description: "уточняет работу щитовидной железы вместе с ТТГ",
    tag: "гормоны",
    color: "info",
  },
  {
    title: "Т3 свободный",
    description: "активный гормон, задающий скорость обмена веществ",
    tag: "гормоны",
    color: "info",
  },
  {
    title: "Глюкоза",
    description: "перепады сахара дают сонливость и тягу к сладкому",
    tag: "сахар сейчас",
    color: "primary",
  },
  {
    title: "HbA1c",
    description: "средний сахар за 3 месяца — скрытая нагрузка на метаболизм",
    tag: "сахар в динамике",
    color: "primary",
  },
  {
    title: "Инсулин",
    description: "помогает увидеть сопротивляемость тканей к инсулину",
    tag: "метаболизм",
    color: "accent",
  },
  {
    title: "Фолиевая кислота",
    description: "участвует в кроветворении и работе нервной системы",
    tag: "витамины",
    color: "info",
  },
  {
    title: "Магний",
    description: "нехватка проявляется судорогами, тревогой и плохим сном",
    tag: "минералы",
    color: "primary",
  },
  {
    title: "С-реактивный белок",
    description: "маркер скрытого воспаления, забирающего энергию",
    tag: "воспаление",
    color: "accent",
  },
  {
    title: "АЛТ и АСТ",
    description: "показывают, справляется ли печень с нагрузкой",
    tag: "печень",
    color: "info",
  },
  {
    title: "Креатинин и СКФ",
    description: "оценивают работу почек и вывод продуктов обмена",
    tag: "почки",
    color: "info",
  },
  {
    title: "Липидный профиль",
    description: "холестерин и фракции — база сосудистого здоровья",
    tag: "сосуды",
    color: "primary",
  },
  {
    title: "Кортизол утренний",
    description: "гормон стресса: и избыток, и нехватка дают истощение",
    tag: "стресс",
    color: "accent",
  },
];

const dotStyles: Record<MarkerColor, string> = {
  primary: "bg-primary ring-primary/20",
  accent: "bg-accent ring-accent/20",
  info: "bg-info ring-info/20",
};

const tagStyles: Record<MarkerColor, string> = {
  primary: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  info: "text-info bg-info/10",
};

function IncludedItemRow({ item }: { item: IncludedItem }) {
  return (
    <li className="group flex items-start gap-3">
      <span
        className={cn(
          "mt-2 h-2 w-2 shrink-0 rounded-full ring-4 transition-transform duration-200 group-hover:scale-125",
          dotStyles[item.color],
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-display text-base text-foreground md:text-lg">{item.title}</h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              tagStyles[item.color],
            )}
          >
            {item.tag}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      </div>
    </li>
  );
}

export function EnergyIncluded() {
  const [expanded, setExpanded] = useState(false);

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

        <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm sm:mt-8">
          <div className={cn("relative", !expanded && "max-h-[360px] overflow-hidden")}>
            <ul className="grid gap-x-10 gap-y-7 p-5 sm:p-7 md:grid-cols-2 md:gap-y-8">
              {items.map((item) => (
                <IncludedItemRow key={item.title} item={item} />
              ))}
            </ul>

            {!expanded && (
              <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-card via-card/85 to-transparent pb-4 pt-16">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Показать все
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-4 text-xs text-muted-foreground sm:px-7">
            <span className="font-medium">20 показателей</span>
            {expanded ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(false)}
                className="h-auto gap-1.5 px-0 py-0 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Свернуть
                <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
              </Button>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-wider">Результаты за 1–2 дня</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
