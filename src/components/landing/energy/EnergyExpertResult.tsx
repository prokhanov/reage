import expertDoctor from "@/assets/energy/expert-doctor.jpg";

const secondary = [
  { name: "Витамин D (25-OH)", value: "24 нг/мл", status: "Погранично", tone: "warning" as const },
  { name: "ТТГ", value: "2.1 мЕд/л", status: "Норма", tone: "success" as const },
  { name: "HbA1c", value: "5.4 %", status: "Норма", tone: "success" as const },
];

const toneClass: Record<"success" | "warning" | "risk", string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  risk: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function EnergyExpertResult() {
  return (
    <section className="border-b hairline">
      <div className="mx-auto grid w-full max-w-[72rem] gap-6 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="rounded-xl border hairline bg-card p-5">
          <img
            src={expertDoctor}
            alt="Врач Анна Ковалёва"
            width={768}
            height={896}
            loading="lazy"
            className="aspect-[4/5] w-full rounded-lg object-cover"
          />
          <div className="mt-4 text-base font-medium text-foreground">Д-р Анна Ковалёва</div>
          <div className="text-sm text-muted-foreground">Эндокринолог, стаж 10+ лет</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Составила состав чекапа и правила интерпретации результатов.
          </p>
        </div>

        <div>
          <h2 className="font-display text-2xl text-foreground md:text-3xl">Пример результата</h2>

          <div className="mt-5 rounded-xl border hairline bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base font-medium text-foreground">Ферритин</span>
              <span className="font-mono-tech text-lg text-foreground">12 мкг/л</span>
            </div>
            <span
              className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs ${toneClass.risk}`}
            >
              Понижено
            </span>

            <div className="mt-4">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 w-[18%] bg-destructive" />
                <div className="absolute inset-y-0 left-[18%] w-[14%] bg-warning" />
                <div className="absolute inset-y-0 left-[32%] right-[18%] bg-success" />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span>10</span>
                <span>30–150 — оптимум</span>
                <span>300</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Запасы железа на нижней границе: типичная причина утренней разбитости, зябкости и
              снижения выносливости. Показан разбор питания и контроль показателя через 3 месяца.
            </p>
          </div>

          <ul className="mt-3 space-y-3">
            {secondary.map((s) => (
              <li
                key={s.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border hairline bg-card px-5 py-4"
              >
                <span className="text-sm text-foreground">{s.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono-tech text-sm text-foreground">{s.value}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${toneClass[s.tone]}`}>
                    {s.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
