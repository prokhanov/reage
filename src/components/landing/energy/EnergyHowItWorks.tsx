import { Button } from "@/components/ui/button";
import { ENERGY_CHECKUP, money } from "@/data/checkups";

interface Props {
  onAddToCart?: () => void;
  /** Цена текущего чекапа для CTA. */
  price?: number;
}

const steps = [
  {
    title: "Выберите и оплатите чекап",
    text: "Оплата онлайн, направление приходит на почту.",
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
        <circle cx="50" cy="50" r="20" strokeWidth="2" />
        <circle cx="50" cy="50" r="35" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M50 10v15M50 75v15M10 50h15M75 50h15" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Сдайте анализы в LabQuest",
    text: "Приходите в удобное отделение без предварительной записи.",
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
        <path d="M40 10h20v12L55 60v20a5 5 0 0 1-10 0V60L40 22V10Z" strokeWidth="2" />
        <path d="M38 30h24" strokeWidth="1" opacity="0.5" />
        <path d="M45 50l5 5 10-10" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    title: "Получите результаты и расшифровку в ReAge",
    text: "Понятный результат и дальнейшие шаги — в личном кабинете.",
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
        <path d="M10 80c20 0 30-60 50-60s20 30 40 30" strokeWidth="2" />
        <circle cx="60" cy="20" r="5" strokeWidth="2" />
        <circle cx="60" cy="20" r="2" fill="currentColor" />
        <path d="M10 85h80" strokeWidth="1" opacity="0.3" />
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
  }
> = {
  primary: {
    text: "text-primary",
    border: "border-primary/20",
    bg: "bg-primary/10",
  },
  accent: {
    text: "text-accent",
    border: "border-accent/20",
    bg: "bg-accent/10",
  },
  info: {
    text: "text-info",
    border: "border-info/20",
    bg: "bg-info/10",
  },
};

export function EnergyHowItWorks({ onAddToCart, price = ENERGY_CHECKUP.price }: Props) {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <h2 className="font-display text-[1.7rem] leading-tight text-foreground md:text-3xl">
          Как это <span className="italic">работает</span>
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-3 md:gap-5">
          {steps.map((s, i) => {
            const a = accentClasses[s.accent];
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card/80 p-4 md:gap-4 md:p-5"
              >
                <div
                  className={`h-12 w-12 shrink-0 rounded-xl border ${a.border} ${a.bg} p-2.5 ${a.text} md:h-16 md:w-16 md:p-3`}
                  aria-hidden
                >
                  {s.visual}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-medium text-foreground md:text-lg">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {onAddToCart && (
          <div className="mt-8 flex justify-center md:mt-10">
            <Button
              size="lg"
              onClick={onAddToCart}
              className="h-12 w-full text-base md:w-auto md:px-8"
            >
              Добавить в корзину — {money(price)}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
