import { Check, X, Sparkles } from "lucide-react";

interface ComparisonRowProps {
  feature: string;
  reage: boolean | string;
  labs: boolean | string;
  genetics: boolean | string;
}

function ComparisonRow({ feature, reage, labs, genetics }: ComparisonRowProps) {
  const renderValue = (value: boolean | string, isHighlight?: boolean) => {
    if (typeof value === "string") {
      return (
        <span className={`text-sm font-medium ${isHighlight ? "text-primary" : "text-muted-foreground"}`}>
          {value}
        </span>);

    }
    return value ?
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isHighlight ? "bg-primary/20" : "bg-muted"}`}>
        <Check className={`w-4 h-4 ${isHighlight ? "text-primary" : "text-muted-foreground"}`} />
      </div> :

    <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
        <X className="w-4 h-4 text-muted-foreground/50" />
      </div>;

  };

  return (
    <div className="grid grid-cols-4 gap-4 py-4 border-b border-border/50 last:border-0 items-center">
      <div className="text-sm text-foreground font-medium pr-4">{feature}</div>
      <div className="flex justify-center">{renderValue(reage, true)}</div>
      <div className="flex justify-center">{renderValue(labs)}</div>
      <div className="flex justify-center">{renderValue(genetics)}</div>
    </div>);

}

export function ComparisonSection() {
  const comparisons: ComparisonRowProps[] = [
  { feature: "Расшифровка показателей", reage: true, labs: false, genetics: false },
  { feature: "Оптимальные диапазоны", reage: true, labs: false, genetics: false },
  { feature: "Рекомендации врача", reage: true, labs: false, genetics: false },
  { feature: "Биологический возраст", reage: true, labs: false, genetics: false },
  { feature: "Интегративный анализ", reage: true, labs: false, genetics: false },
  { feature: "AI-ассистент для вопросов", reage: true, labs: false, genetics: false },
  { feature: "Показатели в динамике", reage: true, labs: false, genetics: false },
  { feature: "Забор анализов на дому", reage: true, labs: false, genetics: true },
  { feature: "Персональный план", reage: true, labs: false, genetics: "Общий" }];


  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      
      {/* Decorative lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Почему ReAge — это не</span>
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              просто анализы?
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Сравниваем подходы: что вы получаете за свои деньги
          </p>
        </div>

        {/* Comparison Table — horizontal scroll on mobile */}
        <div className="max-w-4xl mx-auto animate-fade-in overflow-x-auto scrollbar-hide" style={{ animationDelay: '0.3s' }}>
          <div className="min-w-[600px]">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 mb-2">
              <div />
              
              {/* ReAge Column Header */}
              <div className="relative">
                <div className="absolute -inset-2 -top-4 rounded-t-3xl bg-gradient-to-b from-primary/20 to-transparent" />
                <div className="relative text-center py-6">
                  <div className="text-lg font-bold text-foreground">ReAge</div>
                </div>
              </div>
              
              {/* Labs Column Header */}
              <div className="text-center py-6">
                <div className="text-lg font-bold text-foreground">Лаборатории</div>
              </div>
              
              {/* Genetics Column Header */}
              <div className="text-center py-6">
                <div className="text-lg font-bold text-foreground">Генетика</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="relative">
              {/* Highlight column for ReAge */}
              <div className="absolute left-1/4 right-1/2 -inset-y-4 bg-primary/5 rounded-3xl border border-primary/10" style={{ left: 'calc(25% - 0.5rem)', right: 'calc(50% + 0.5rem)' }} />
              
              <div className="relative rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6">
                {comparisons.map((row, index) => <ComparisonRow key={index} {...row} />
                )}
              </div>
            </div>
          </div>

          {/* Footnote */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            * При регулярной сдаче расширенных панелей 4 раза в год
          </p>
        </div>

        {/* Bottom cards - key differentiators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
          <DifferentiatorCard
            emoji="🔬"
            title="Лаборатории"
            description="Дают цифры без контекста. Вы не знаете, что делать с результатами."
            delay={0.4} />
          
          <DifferentiatorCard
            emoji="🧬"
            title="Генетика"
            description="Показывает риски, но не текущее состояние. Делается один раз."
            delay={0.5} />
          
          <DifferentiatorCard
            emoji="📊"
            title="ReAge"
            description="Показывает динамику, даёт план действий и отслеживает прогресс."
            isHighlighted
            delay={0.6} />
          
        </div>
      </div>
    </section>);

}

function MobileComparisonCard({ feature, reage, labs, genetics }: ComparisonRowProps) {
  const renderMobileValue = (value: boolean | string, label: string, isHighlight?: boolean) => {
    const display = typeof value === "string" ? value :
      value ? <Check className={`w-4 h-4 ${isHighlight ? "text-primary" : "text-muted-foreground"}`} /> :
      <X className="w-4 h-4 text-muted-foreground/40" />;

    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-medium ${isHighlight ? "text-primary" : "text-foreground"}`}>{display}</span>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-card/50 border border-border/50 p-4">
      <h4 className="font-medium text-foreground mb-3">{feature}</h4>
      <div className="space-y-1">
        {renderMobileValue(reage, "ReAge", true)}
        {renderMobileValue(labs, "Лаборатории")}
        {renderMobileValue(genetics, "Генетика")}
      </div>
    </div>
  );
}

function DifferentiatorCard({
  emoji,
  title,
  description,
  isHighlighted,
  delay
}: {emoji: string;title: string;description: string;isHighlighted?: boolean;delay: number;}) {
  return (
    <div
      className={`
        relative rounded-2xl p-6 transition-all duration-300 animate-fade-in
        ${isHighlighted ?
      "bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 shadow-lg shadow-primary/10" :
      "bg-card/50 border border-border/50"}
      `
      }
      style={{ animationDelay: `${delay}s` }}>
      
      <div className="text-3xl mb-3">{emoji}</div>
      <h4 className={`text-lg font-bold mb-2 ${isHighlighted ? "text-primary" : "text-foreground"}`}>
        {title}
      </h4>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>);
}