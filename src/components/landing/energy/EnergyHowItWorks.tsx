const steps = [
  { n: "1", title: "Добавьте в корзину", text: "Оформите и оплатите заказ." },
  { n: "2", title: "Сдайте анализы в LabQuest", text: "В выбранном отделении, натощак." },
  { n: "3", title: "Получите результат", text: "С разбором в личном кабинете ReAge." },
];

const desktopSteps = [
  { n: "1", title: "Оформляете чекап", text: "Оплата онлайн, направление приходит на почту." },
  { n: "2", title: "Сдаёте кровь в LabQuest", text: "Любое удобное отделение, натощак, 15 минут." },
  { n: "3", title: "Получаете разбор в ReAge", text: "Результаты с пояснениями и понятными шагами." },
];

export function EnergyHowItWorks() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
          Как это работает
        </h2>

        {/* Мобильный вертикальный степпер */}
        <ol className="mt-6 space-y-0 md:hidden">
          {steps.map((s, idx) => (
            <li key={s.n} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="font-mono-tech flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm text-primary">
                  {s.n}
                </span>
                {idx < steps.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
              </div>
              <div className="pb-6">
                <div className="text-[15px] font-medium text-foreground">{s.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Десктоп — без изменений */}
        <ol className="mt-8 hidden gap-3 md:grid md:grid-cols-3">
          {desktopSteps.map((s) => (
            <li key={s.n} className="rounded-xl border hairline bg-card p-5">
              <span className="font-mono-tech flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm text-primary">
                {s.n}
              </span>
              <div className="mt-3 text-sm font-medium text-foreground">{s.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
