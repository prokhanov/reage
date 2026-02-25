import { AlertTriangle, TrendingDown, HelpCircle, ArrowRight, Zap } from "lucide-react";

interface PainCardProps {
  icon: React.ReactNode;
  painNumber: string;
  painTitle: string;
  painDescription: string;
  solutionTitle: string;
  solutionDescription: string;
  accentColor: string;
  delay: number;
}

function PainCard({
  icon,
  painNumber,
  painTitle,
  painDescription,
  solutionTitle,
  solutionDescription,
  accentColor,
  delay
}: PainCardProps) {
  return (
    <div
      className="group relative animate-fade-in"
      style={{ animationDelay: `${delay}s` }}>

      {/* Glow effect on hover */}
      <div
        className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-r ${accentColor} opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500`} />

      
      {/* Card */}
      <div className="relative h-full rounded-3xl bg-card/40 backdrop-blur-xl border border-border/50 p-8 overflow-hidden transition-all duration-500 group-hover:bg-card/60 group-hover:border-primary/30 group-hover:shadow-xl">
        {/* Background gradient orb */}
        <div
          className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${accentColor} opacity-[0.08] blur-3xl group-hover:opacity-[0.15] transition-opacity duration-500`} />

        
        {/* Pain number badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${accentColor} shadow-lg`}>
            {icon}
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Правда {painNumber}
          </span>
        </div>
        
        {/* Pain section */}
        <div className="mb-8">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 leading-tight">
            {painTitle}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {painDescription}
          </p>
        </div>
        
        {/* Divider with arrow */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-border via-primary/30 to-border" />
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20">
            <ArrowRight className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-border via-primary/30 to-border" />
        </div>
        
        {/* Solution section */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Решение
            </span>
          </div>
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {solutionTitle}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {solutionDescription}
          </p>
        </div>
      </div>
    </div>);

}

export function PainPointsSection() {
  const painPoints = [
  {
    icon: <AlertTriangle className="w-6 h-6 text-white" />,
    painNumber: "01",
    painTitle: "Анализы «в норме», а самочувствие — нет",
    painDescription: "Врачи говорят: «Всё хорошо», но усталость, туман в голове и лишний вес никуда не уходят. Стандартные референсы слишком широкие.",
    solutionTitle: "Оптимальные диапазоны",
    solutionDescription: "Мы используем узкие оптимальные зоны вместо широких «норм». Видим проблему до того, как она станет диагнозом.",
    accentColor: "from-red-500 to-orange-500",
    delay: 0.1
  },
  {
    icon: <TrendingDown className="w-6 h-6 text-white" />,
    painNumber: "02",
    painTitle: "Нет понимания динамики здоровья",
    painDescription: "Один анализ — это снимок. Вы не видите, улучшается ваше здоровье или ухудшается. Каждый раз как с чистого листа.",
    solutionTitle: "Тренды 4× в год",
    solutionDescription: "Регулярные замеры показывают траекторию. Вы видите прогресс и понимаете, работают ли ваши усилия.",
    accentColor: "from-amber-500 to-yellow-500",
    delay: 0.2
  },
  {
    icon: <HelpCircle className="w-6 h-6 text-white" />,
    painNumber: "03",
    painTitle: "Непонятно, что делать с результатами",
    painDescription: "Получили PDF с цифрами — и что дальше? Гуглить? Идти к терапевту, который назначит ещё анализы?",
    solutionTitle: "AI-план действий",
    solutionDescription: "Персональные рекомендации по питанию, добавкам и образу жизни. Конкретные шаги, а не абстрактные советы.",
    accentColor: "from-purple-500 to-pink-500",
    delay: 0.3
  }];


  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-float opacity-50" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-float-delayed opacity-50" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          



          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">3 правды, которые </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              неприятно слышать
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Почему стандартный подход к анализам не работает — и как мы это решаем
          </p>
        </div>

        {/* Pain Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {painPoints.map((pain, index) =>
          <PainCard key={index} {...pain} />
          )}
        </div>
      </div>
    </section>);

}