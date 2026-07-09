import { Check, X } from "lucide-react";

type CellIcon = "yes" | "no";

interface Cell {
  icon?: CellIcon;
  text?: string;
}

interface ComparisonRowProps {
  feature: string;
  reage: Cell;
  checkup: Cell;
  labs: Cell;
  genetics: Cell;
}

function CellView({ cell, highlight }: { cell: Cell; highlight?: boolean }) {
  const { icon, text } = cell;

  if (icon === "yes") {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15">
        <Check className="w-4 h-4 text-emerald-500" />
      </div>
    );
  }
  if (icon === "no") {
    return (
      <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
        <X className="w-4 h-4 text-muted-foreground/60" />
      </div>
    );
  }
  if (text) {
    return (
      <span className={`text-sm ${highlight ? "text-primary font-medium" : "text-muted-foreground"}`}>
        {text}
      </span>
    );
  }
  return null;
}

function ComparisonRow({ feature, reage, checkup, labs, genetics }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-5 gap-3 py-4 border-b border-border/50 last:border-0 items-center">
      <div className="text-sm text-foreground font-medium pr-2">{feature}</div>
      <div className="flex justify-center"><CellView cell={reage} highlight /></div>
      <div className="flex justify-center"><CellView cell={checkup} /></div>
      <div className="flex justify-center"><CellView cell={labs} /></div>
      <div className="flex justify-center"><CellView cell={genetics} /></div>
    </div>
  );
}

export function ComparisonSection() {
  const comparisons: ComparisonRowProps[] = [
    {
      feature: "Расшифровка показателей",
      reage: { icon: "yes" },
      checkup: { icon: "yes" },
      labs: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Рекомендации врача",
      reage: { icon: "yes" },
      checkup: { icon: "yes" },
      labs: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Тренды здоровья",
      reage: { text: "Несколько раз в год" },
      checkup: { text: "Раз в год" },
      labs: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Биологический возраст",
      reage: { icon: "yes" },
      checkup: { icon: "no" },
      labs: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Комплексная оценка организма",
      reage: { icon: "yes" },
      checkup: { icon: "yes" },
      labs: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Персональный план",
      reage: { icon: "yes" },
      checkup: { text: "Общий" },
      labs: { icon: "no" },
      genetics: { text: "Общий" },
    },
    {
      feature: "AI-ассистент",
      reage: { icon: "yes" },
      checkup: { icon: "no" },
      labs: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Учет взаимосвязей",
      reage: { icon: "yes" },
      checkup: { icon: "no" },
      labs: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Цена за год",
      reage: { text: "от 69 990₽" },
      checkup: { text: "~75 000₽" },
      labs: { text: "~80 000₽*" },
      genetics: { text: "~80 000₽" },
    },
  ];

  return (
    <section id="comparison" className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="text-foreground">Почему ReAge — это не</span>
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">просто анализы?</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Сравниваем подходы: что вы получаете за свои деньги
          </p>
        </div>

        <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible">
            <div className="relative min-w-[860px]">
              {/* Highlight ReAge column (2nd of 5) */}
              <div
                className="absolute bg-primary/5 rounded-3xl border border-primary/10"
                style={{ left: "20%", width: "20%", top: "-1rem", bottom: "-1rem" }}
              />

              <div className="relative grid grid-cols-5 gap-3 mb-2">
                <div />
                <div className="text-center py-6"><div className="text-lg font-bold text-primary">ReAge</div></div>
                <div className="text-center py-6"><div className="text-lg font-bold text-foreground">Чекап с врачом</div></div>
                <div className="text-center py-6"><div className="text-lg font-bold text-foreground">Лаборатории</div></div>
                <div className="text-center py-6"><div className="text-lg font-bold text-foreground">Генетика</div></div>
              </div>

              <div className="relative rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6">
                {comparisons.map((row, index) => <ComparisonRow key={index} {...row} />)}
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            * При регулярной сдаче расширенных панелей 3 раза в год
          </p>
        </div>
      </div>
    </section>
  );
}
