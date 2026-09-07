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
    description: "Проверяет общее состояние крови, воспаление и риск анемии — частых спутников хронической усталости.",
    tag: "Базовый скрининг",
    color: "primary",
  },
  {
    title: "Ферритин",
    description: "Отражает запасы железа в тканях. При их падении клетки получают меньше кислорода и появляется разбитость.",
    tag: "Запасы железа",
    color: "accent",
  },
  {
    title: "Витамин D (25-OH)",
    description: "Влияет на иммунитет, настроение и мышечную силу; дефицит — одна из частых причин вялости.",
    tag: "Иммунитет и тонус",
    color: "info",
  },
  {
    title: "ТТГ",
    description: "Оценивает щитовидную железу, которая задаёт скорость метаболизма и общий уровень энергии.",
    tag: "Метаболизм",
    color: "primary",
  },
  {
    title: "Глюкоза",
    description: "Показывает уровень сахара натощак: перепады провоцируют сонливость и тягу к сладкому.",
    tag: "Сахар сейчас",
    color: "accent",
  },
  {
    title: "HbA1c",
    description: "Отражает средний сахар за 3 месяца и помогает увидеть скрытую нагрузку на метаболизм.",
    tag: "Сахар в динамике",
    color: "info",
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
    <li className="group flex items-start gap-4 py-5 sm:gap-5 sm:py-6">
      <div className="mt-1.5 shrink-0">
        <div
          className={cn(
            "h-2 w-2 rounded-full ring-4 transition-transform duration-200 group-hover:scale-125",
            dotStyles[item.color],
          )}
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              tagStyles[item.color],
            )}
          >
            {item.tag}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      </div>
    </li>
  );
}

export function EnergyIncluded() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 sm:px-6 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
            Что входит в ReAge Energy
          </h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Шесть показателей, с которых начинается разбор причин усталости.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm sm:mt-8">
          <ul className="divide-y divide-border px-4 sm:px-6">
            {items.map((item) => (
              <IncludedItemRow key={item.title} item={item} />
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
            <span className="font-medium">6 показателей</span>
            <span className="font-mono text-[10px] uppercase tracking-wider">Результаты за 1–2 дня</span>
          </div>
        </div>
      </div>
    </section>
  );
}
