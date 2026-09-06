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
    <section className="border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-12 md:px-6 md:py-16">
        <h2 className="font-display text-2xl text-foreground md:text-3xl">
          Что входит в ReAge Energy
        </h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Шесть показателей, с которых начинается разбор усталости.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.title} className="flex items-start gap-3 rounded-xl border hairline bg-card p-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <i.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{i.title}</span>
                <span className="block text-sm text-muted-foreground">{i.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
