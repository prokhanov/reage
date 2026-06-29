import { Check, X, Minus, AlertTriangle } from "lucide-react";

type CellIcon = "yes" | "no" | "partial" | "dash";

interface Cell {
  icon?: CellIcon;
  text?: string;
}

interface ComparisonRowProps {
  feature: string;
  reage: Cell;
  labs: Cell;
  checkup: Cell;
  genetics: Cell;
}

function CellView({ cell, highlight }: { cell: Cell; highlight?: boolean }) {
  const { icon, text } = cell;

  const iconEl = (() => {
    if (icon === "yes") {
      return (
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${highlight ? "bg-primary/20" : "bg-emerald-500/15"}`}>
          <Check className={`w-4 h-4 ${highlight ? "text-primary" : "text-emerald-500"}`} />
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
    if (icon === "partial") {
      return (
        <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
      );
    }
    if (icon === "dash") {
      return (
        <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
          <Minus className="w-4 h-4 text-muted-foreground/60" />
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      {iconEl}
      {text && (
        <span className={`text-xs leading-snug ${highlight ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {text}
        </span>
      )}
    </div>
  );
}

function ComparisonRow({ feature, reage, labs, checkup, genetics }: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-5 gap-3 py-4 border-b border-border/50 last:border-0 items-start">
      <div className="text-sm text-foreground font-medium pr-2 pt-1">{feature}</div>
      <div className="flex justify-center pt-1"><CellView cell={reage} highlight /></div>
      <div className="flex justify-center pt-1"><CellView cell={labs} /></div>
      <div className="flex justify-center pt-1"><CellView cell={checkup} /></div>
      <div className="flex justify-center pt-1"><CellView cell={genetics} /></div>
    </div>
  );
}

export function ComparisonSection() {
  const comparisons: ComparisonRowProps[] = [
    {
      feature: "Что вы покупаете",
      reage: { text: "Систему наблюдения за здоровьем" },
      labs: { text: "Разовые анализы" },
      checkup: { text: "Разовое комплексное обследование" },
      genetics: { text: "Генетический тест" },
    },
    {
      feature: "Главная цель",
      reage: { text: "Контроль здоровья и его изменений" },
      labs: { text: "Узнать значения анализов" },
      checkup: { text: "Найти заболевания" },
      genetics: { text: "Оценить наследственные риски" },
    },
    {
      feature: "Подбор анализов",
      reage: { icon: "yes", text: "Сбалансированная панель 100+ биомаркеров" },
      labs: { icon: "no", text: "Выбираете самостоятельно" },
      checkup: { icon: "partial", text: "Зависит от программы" },
      genetics: { icon: "dash" },
    },
    {
      feature: "Комплексная оценка организма",
      reage: { icon: "yes", text: "100+ биомаркеров и 5 систем" },
      labs: { icon: "no", text: "Каждый анализ отдельно" },
      checkup: { icon: "partial", text: "Частично" },
      genetics: { icon: "partial", text: "Только наследственные риски" },
    },
    {
      feature: "Биологический возраст",
      reage: { icon: "yes" },
      labs: { icon: "no" },
      checkup: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Подробный отчёт",
      reage: { icon: "yes", text: "50+ страниц с объяснениями и графиками" },
      labs: { icon: "no", text: "Только результаты" },
      checkup: { icon: "partial", text: "Краткое заключение врача" },
      genetics: { icon: "partial", text: "Генетический отчёт" },
    },
    {
      feature: "Персональные рекомендации",
      reage: { icon: "yes", text: "Пошаговый план действий" },
      labs: { icon: "no" },
      checkup: { icon: "yes" },
      genetics: { icon: "partial", text: "Общие" },
    },
    {
      feature: "AI-ассистент",
      reage: { icon: "yes" },
      labs: { icon: "no" },
      checkup: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Личный кабинет и дашборды",
      reage: { icon: "yes" },
      labs: { icon: "partial", text: "Только результаты" },
      checkup: { icon: "no" },
      genetics: { icon: "partial", text: "Иногда" },
    },
    {
      feature: "История здоровья",
      reage: { icon: "yes", text: "Автоматически пополняется после каждого исследования" },
      labs: { icon: "no" },
      checkup: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Оценка эффективности питания, спорта, сна, лечения, добавок",
      reage: { icon: "yes" },
      labs: { icon: "partial", text: "Только самостоятельно" },
      checkup: { icon: "partial", text: "При повторном обследовании" },
      genetics: { icon: "no" },
    },
    {
      feature: "Регулярное сопровождение",
      reage: { icon: "yes", text: "В течение года" },
      labs: { icon: "no" },
      checkup: { icon: "no" },
      genetics: { icon: "no" },
    },
    {
      feature: "Домашний забор крови",
      reage: { icon: "yes" },
      labs: { icon: "partial", text: "Иногда" },
      checkup: { icon: "partial", text: "Иногда" },
      genetics: { icon: "partial", text: "Обычно нет" },
    },
    {
      feature: "Нужно разбираться самому",
      reage: { text: "🙂 Нет" },
      labs: { text: "😵 Да" },
      checkup: { text: "🙂 Нет" },
      genetics: { text: "😐 Частично" },
    },
    {
      feature: "Что остаётся через несколько лет",
      reage: { text: "📚 Полная цифровая история здоровья" },
      labs: { text: "📂 Разрозненные PDF" },
      checkup: { text: "📂 Архив заключений" },
      genetics: { text: "📄 Тот же отчёт" },
    },
    {
      feature: "Средняя стоимость за год",
      reage: { text: "₽₽₽₽" },
      labs: { text: "₽₽₽" },
      checkup: { text: "₽₽₽₽" },
      genetics: { text: "₽₽₽" },
    },
    {
      feature: "Результат",
      reage: { text: "Больше энергии, лучше самочувствие, меньше рисков и уверенность в долгой здоровой жизни" },
      labs: { text: "Результаты анализов" },
      checkup: { text: "Заключение врача и рекомендации" },
      genetics: { text: "Информация о наследственных рисках" },
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

        <div className="max-w-6xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible">
            <div className="relative min-w-[900px]">
              {/* Highlight ReAge column (2nd of 5) */}
              <div
                className="absolute bg-primary/5 rounded-3xl border border-primary/10"
                style={{ left: "20%", width: "20%", top: "-1rem", bottom: "-1rem" }}
              />

              <div className="relative grid grid-cols-5 gap-3 mb-2">
                <div />
                <div className="text-center py-6"><div className="text-lg font-bold text-primary">ReAge</div></div>
                <div className="text-center py-6"><div className="text-lg font-bold text-foreground">Лаборатории</div></div>
                <div className="text-center py-6"><div className="text-lg font-bold text-foreground">Чекап с доктором</div></div>
                <div className="text-center py-6"><div className="text-lg font-bold text-foreground">Генетика</div></div>
              </div>

              <div className="relative rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6">
                {comparisons.map((row, index) => <ComparisonRow key={index} {...row} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileComparisonCard({ feature, reage, labs, checkup, genetics }: ComparisonRowProps) {
  const row = (label: string, cell: Cell, highlight?: boolean) => (
    <div className="flex items-start justify-between gap-3 py-2 border-t border-border/40 first:border-0">
      <span className={`text-sm ${highlight ? "text-primary font-medium" : "text-muted-foreground"}`}>{label}</span>
      <div className="text-right max-w-[60%]">
        <CellView cell={cell} highlight={highlight} />
      </div>
    </div>
  );

  return (
    <div className="rounded-xl bg-card/50 border border-border/50 p-4">
      <h4 className="font-semibold text-foreground mb-2">{feature}</h4>
      <div>
        {row("ReAge", reage, true)}
        {row("Лаборатории", labs)}
        {row("Чекап с доктором", checkup)}
        {row("Генетика", genetics)}
      </div>
    </div>
  );
}
