import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const checkups = [
  {
    title: "Чекап для мужчин",
    text: "Гормоны, метаболизм, сердце",
    price: "9 990 ₽",
    tag: "Мужское здоровье",
    accent: "info" as const,
    visual: (
      <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
        <path d="M50 0 L100 50 L50 100 L0 50 Z" />
      </svg>
    ),
  },
  {
    title: "Чекап для женщин",
    text: "Железо, щитовидная железа, обмен веществ",
    price: "9 990 ₽",
    tag: "Женское здоровье",
    accent: "accent" as const,
    visual: (
      <svg viewBox="0 0 100 100" className="h-full w-full fill-current">
        <circle cx="50" cy="50" r="40" />
      </svg>
    ),
  },
];

const accentClasses: Record<
  (typeof checkups)[number]["accent"],
  { text: string; border: string; bg: string; glowFrom: string; glowTo: string }
> = {
  info: {
    text: "text-info",
    border: "border-info/30",
    bg: "bg-info/10",
    glowFrom: "from-info/40",
    glowTo: "to-info/10",
  },
  accent: {
    text: "text-accent",
    border: "border-accent/30",
    bg: "bg-accent/10",
    glowFrom: "from-accent/40",
    glowTo: "to-accent/10",
  },
};

export function EnergyOtherCheckups() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
              Другие чекапы <span className="text-primary">ReAge</span>
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground md:text-base">
              Выберите персональную программу для глубокого анализа состояния организма.
            </p>
          </div>
          <div className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
          {checkups.map((c) => {
            const a = accentClasses[c.accent];
            return (
              <Link
                key={c.title}
                to="/"
                className="group relative block rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {/* Glow */}
                <div
                  className={`absolute -inset-0.5 rounded-[2.25rem] bg-gradient-to-r ${a.glowFrom} ${a.glowTo} opacity-20 blur-2xl transition duration-500 group-hover:opacity-60`}
                  aria-hidden
                />

                <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-border bg-card/80 p-6 backdrop-blur-sm transition-colors duration-300 group-hover:border-border-strong/80 md:p-8">
                  {/* Soft radial accent */}
                  <div
                    className={`absolute -right-12 -top-12 h-48 w-48 rounded-full ${a.bg} blur-3xl transition duration-500 group-hover:opacity-80`}
                    aria-hidden
                  />

                  <span
                    className={`relative mb-6 inline-flex w-fit items-center rounded-full border ${a.border} ${a.bg} px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${a.text}`}
                  >
                    {c.tag}
                  </span>

                  <div className="relative mt-auto">
                    <h3 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                      {c.title}
                    </h3>
                    <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-muted-foreground md:text-base">
                      {c.text}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4 md:mt-8">
                      <div>
                        <span className="label-mono mb-1 block">Стоимость</span>
                        <span className="font-display text-2xl font-semibold text-foreground">
                          {c.price}
                        </span>
                      </div>
                      <span className="inline-flex h-12 items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                        Подробнее
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>

                  {/* Visual accent */}
                  <div
                    className={`absolute bottom-0 right-0 h-32 w-32 ${a.text} opacity-10 transition-opacity duration-500 group-hover:opacity-20`}
                    aria-hidden
                  >
                    {c.visual}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
