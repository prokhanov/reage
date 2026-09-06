const steps = [
  { n: "1", title: "Оформляете чекап", text: "Оплата онлайн, направление приходит на почту." },
  { n: "2", title: "Сдаёте кровь в LabQuest", text: "Любое удобное отделение, натощак, 15 минут." },
  { n: "3", title: "Получаете разбор в ReAge", text: "Результаты с пояснениями и понятными шагами." },
];

export function EnergyHowItWorks() {
  return (
    <section className="border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-12 md:px-6 md:py-16">
        <h2 className="font-display text-2xl text-foreground md:text-3xl">Как это работает</h2>
        <ol className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {steps.map((s) => (
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
