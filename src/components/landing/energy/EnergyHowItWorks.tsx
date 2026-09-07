const steps = [
  {
    n: "01",
    label: "Заказ",
    title: "Оформляете чекап",
    text: "Оплата онлайн, направление приходит на почту — всё готово к визиту в лабораторию.",
    accent: "primary" as const,
    visual: (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
      >
        <circle cx="50" cy="50" r="20" strokeWidth="1" />
        <circle cx="50" cy="50" r="35" strokeWidth="0.5" strokeDasharray="4 4" />
        <path d="M50 10v15M50 75v15M10 50h15M75 50h15" strokeWidth="1" />
        <circle cx="50" cy="50" r="4" fill="currentColor" />
        <circle cx="80" cy="20" r="3" fill="currentColor" className="animate-pulse" />
      </svg>
    ),
  },
  {
    n: "02",
    label: "LabQuest",
    title: "Сдаёте анализы",
    text: "Приходите в любое удобное отделение LabQuest натощак — процедура займёт 15 минут.",
    accent: "accent" as const,
    visual: (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
      >
        <path d="M40 10h20v12L55 60v20a5 5 0 0 1-10 0V60L40 22V10Z" strokeWidth="1.2" />
        <path d="M38 30h24" strokeWidth="0.5" opacity="0.5" />
        <path d="M45 50l5 5 10-10" strokeWidth="1.5" />
        <circle cx="72" cy="78" r="3" fill="currentColor" className="animate-pulse" />
      </svg>
    ),
  },
  {
    n: "03",
    label: "ReAge",
    title: "Получаете разбор",
    text: "Результаты, персональные рекомендации и понятный план действий — в личном кабинете ReAge.",
    accent: "info" as const,
    visual: (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
      >
        <path d="M10 80c20 0 30-60 50-60s20 30 40 30" strokeWidth="1" />
        <circle cx="60" cy="20" r="5" strokeWidth="1" />
        <circle cx="60" cy="20" r="2" fill="currentColor" />
        <path d="M10 85h80" strokeWidth="0.5" opacity="0.3" />
        <circle cx="85" cy="15" r="3" fill="currentColor" className="animate-pulse" />
      </svg>
    ),
  },
];

const accentClasses: Record<
  (typeof steps)[number]["accent"],
  {
    text: string;
    border: string;
    bg: string;
    glowFrom: string;
    glowTo: string;
  }
> = {
  primary: {
    text: "text-primary",
    border: "border-primary/20",
    bg: "bg-primary/10",
    glowFrom: "from-primary/30",
    glowTo: "to-primary/5",
  },
  accent: {
    text: "text-accent",
    border: "border-accent/20",
    bg: "bg-accent/10",
    glowFrom: "from-accent/30",
    glowTo: "to-accent/5",
  },
  info: {
    text: "text-info",
    border: "border-info/20",
    bg: "bg-info/10",
    glowFrom: "from-info/30",
    glowTo: "to-info/5",
  },
};

export function EnergyHowItWorks() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <div className="mb-8 flex flex-col gap-3 md:mb-10">
          <span className="font-mono-tech w-fit text-[10px] uppercase tracking-[0.25em] text-muted-foreground border-l border-border pl-3">
            3 простых шага
          </span>
          <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
            Как это <span className="italic">работает</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {steps.map((s) => {
            const a = accentClasses[s.accent];
            return (
              <div
                key={s.n}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card/80 p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:bg-card/60 md:p-8"
              >
                {/* Soft accent glow */}
                <div
                  className={`absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br ${a.glowFrom} ${a.glowTo} blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60`}
                  aria-hidden
                />

                <div className="relative z-10 flex flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono-tech inline-flex items-center rounded-full border ${a.border} ${a.bg} px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${a.text}`}
                    >
                      Step {s.n}
                    </span>
                    <span className="font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </span>
                  </div>

                  <div className={`mx-auto my-6 h-24 w-24 md:my-8 md:h-28 md:w-28 ${a.text} opacity-80 transition-opacity duration-500 group-hover:opacity-100`}>
                    {s.visual}
                  </div>

                  <div className="mt-auto">
                    <h3 className="font-display text-xl font-medium text-foreground md:text-2xl">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {s.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
