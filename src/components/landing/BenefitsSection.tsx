import {
  Activity,
  HeartPulse,
  FileText,
  Stethoscope,
  NotebookText,
  Search,
  Apple,
  TrendingUp,
  Sparkles } from
"lucide-react";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function BenefitCard({ icon, title, description, delay }: BenefitCardProps) {
  return (
    <div
      className="group relative animate-fade-in"
      style={{ animationDelay: `${delay}s` }}>
      
      <div className="relative h-full rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6 transition-all duration-500 hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{description}</p>
      </div>
    </div>);

}

export function BenefitsSection() {
  const benefits = [
  {
    icon: <Activity className="w-6 h-6 text-primary" />,
    title: "85+ биомаркеров\nздоровья",
    description: "Расширенный анализ крови, который позволяет оценить состояние основных систем организма и выявить ключевые факторы риска",
    delay: 0.1
  },
  {
    icon: <HeartPulse className="w-6 h-6 text-primary" />,
    title: "Биологический возраст организма",
    description: "Расчёт биологического возраста -\nэто не просто цифра, а ключевой показатель эффективности вашего образа жизни \n\n",
    delay: 0.15
  },
  {
    icon: <FileText className="w-6 h-6 text-primary" />,
    title: "Подробный отчёт по всем показателям",
    description: "Полная расшифровка результатов и объяснение того, как показатели связаны между собой и влияют на здоровье и самочувствие",
    delay: 0.2
  },
  {
    icon: <Stethoscope className="w-6 h-6 text-primary" />,
    title: "Конкретные рекомендации врача",
    description: "Персональный план от нашего специалиста: витамины и минералы с указанием формы, дозировки, кратности и длительности приёма",
    delay: 0.25
  },
  {
    icon: <NotebookText className="w-6 h-6 text-primary" />,
    title: "Простой и понятный личный кабинет",
    description: "Следите за результатами анализов, ведите дневник самочувствия и получайте обратную связь — всё в одном месте",
    delay: 0.3
  },
  {
    icon: <Search className="w-6 h-6 text-primary" />,
    title: "Дополнительные обследования",
    description: "При необходимости указываем, какие дополнительные анализы или консультации профильных врачей могут быть вам рекомендованы",
    delay: 0.35
  },
  {
    icon: <Apple className="w-6 h-6 text-primary" />,
    title: "Изменения питания\nи образа жизни",
    description: "Практические рекомендации по питанию,  и другим факторам здоровья, которые позволят улучшить ваши показатели и самочувствие",
    delay: 0.4
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    title: "Контроль динамики и прогресса",
    description: "Анализы 4 раза в год позволяют отслеживать изменения показателей и корректировать рекомендации по мере динамики",
    delay: 0.45
  }];


  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Что входит в сервис?</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Всё для </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              управления здоровьем в одном сервисе  
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) =>
          <BenefitCard key={index} {...benefit} />
          )}
        </div>
      </div>
    </section>);

}