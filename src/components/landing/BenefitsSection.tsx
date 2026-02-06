import { 
  Activity, 
  TrendingUp, 
  Brain, 
  Calendar, 
  Shield, 
  Clock,
  Target,
  Sparkles
} from "lucide-react";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
  delay: number;
}

function BenefitCard({ icon, title, description, highlight, delay }: BenefitCardProps) {
  return (
    <div 
      className="group relative animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative h-full rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-6 transition-all duration-500 hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        
        {/* Content */}
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        
        {/* Highlight badge */}
        {highlight && (
          <div className="inline-flex items-center gap-1 mt-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            {highlight}
          </div>
        )}
      </div>
    </div>
  );
}

export function BenefitsSection() {
  const benefits = [
    {
      icon: <Activity className="w-6 h-6 text-primary" />,
      title: "50+ биомаркеров",
      description: "Расширенная панель анализов покрывает все ключевые системы организма — от гормонов до витаминов.",
      highlight: "Больше, чем в клиниках",
      delay: 0.1,
    },
    {
      icon: <Target className="w-6 h-6 text-primary" />,
      title: "Биологический возраст",
      description: "Узнайте реальный возраст вашего организма. Мощная мотивация для изменений образа жизни.",
      delay: 0.15,
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-primary" />,
      title: "Тренды здоровья",
      description: "Отслеживайте динамику показателей во времени. Видите прогресс и понимаете, что работает.",
      highlight: "4 анализа в год",
      delay: 0.2,
    },
    {
      icon: <Brain className="w-6 h-6 text-primary" />,
      title: "AI-рекомендации",
      description: "Персональный план по питанию, добавкам и образу жизни. Конкретные шаги, а не общие советы.",
      delay: 0.25,
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Оптимальные диапазоны",
      description: "Анализируем узкие оптимальные зоны, а не широкие лабораторные нормы. Видим проблему раньше.",
      delay: 0.3,
    },
    {
      icon: <Clock className="w-6 h-6 text-primary" />,
      title: "Забор на дому",
      description: "Медсестра приедет в удобное время. 15 минут — и вы свободны. Результат за 5 дней.",
      highlight: "Экономия 3+ часов",
      delay: 0.35,
    },
    {
      icon: <Calendar className="w-6 h-6 text-primary" />,
      title: "Регулярный мониторинг",
      description: "Квартальные анализы формируют полную картину. Здоровье под контролем круглый год.",
      delay: 0.4,
    },
    {
      icon: <Sparkles className="w-6 h-6 text-primary" />,
      title: "AI-ассистент",
      description: "Задавайте вопросы о своих результатах. Получайте ответы на основе ваших данных.",
      highlight: "24/7 доступ",
      delay: 0.45,
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Делим жизнь на до и после</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Полные дашборды </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              по здоровью
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Не нужно бояться цифр — нужно их использовать
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} {...benefit} />
          ))}
        </div>
      </div>
    </section>
  );
}
