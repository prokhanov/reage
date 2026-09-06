import { Droplet, Activity, Sun, Gauge, CircleDot, LineChart } from "lucide-react";

const items = [
  { icon: Droplet, title: "Общий анализ крови", text: "Скрытая анемия и воспаление" },
  { icon: CircleDot, title: "Ферритин", text: "Запасы железа в организме" },
  { icon: Sun, title: "Витамин D (25-OH)", text: "Тонус, настроение, иммунитет" },
  { icon: Activity, title: "ТТГ", text: "Работа щитовидной железы" },
  { icon: Gauge, title: "Глюкоза", text: "Уровень сахара натощак" },
  { icon: LineChart, title: "HbA1c", text: "Средний сахар за 3 месяца" },
];

export function EnergyIncluded() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
          Что входит в ReAge Energy
        </h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          <span className="sm:hidden">6 исследований</span>
          <span className="hidden sm:inline">
            Шесть показателей, с которых начинается разбор усталости.
          </span>
        </p>

        {/* Мобильный список: тонкие разделители, без рамок у каждого пункта.
            Планшет/десктоп — прежняя сетка карточек. */}
        <ul className="mt-6 divide-y divide-border/60 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0">
          {items.map((i) => (
            <li
              key={i.title}
              className="flex min-h-[60px] items-center gap-3 py-3 sm:min-h-0 sm:items-start sm:rounded-xl sm:border sm:border-border sm:bg-card sm:p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:mt-0.5">
                <i.icon className="h-[18px] w-[18px] text-primary" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-foreground sm:text-sm">
                  {i.title}
                </span>
                <span className="block text-sm text-muted-foreground">{i.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
