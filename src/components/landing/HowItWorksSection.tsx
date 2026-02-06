import { Calendar, Home, FlaskConical, LineChart, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface StepProps {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  isLast?: boolean;
  delay: number;
}

function Step({ number, icon, title, description, features, isLast, delay }: StepProps) {
  return (
    <div className="relative animate-fade-in" style={{ animationDelay: `${delay}s` }}>
      {/* Connector line */}
      {!isLast && (
        <div className="hidden lg:block absolute top-16 left-[calc(100%_-_1rem)] w-[calc(100%_-_4rem)] h-0.5">
          <div className="w-full h-full bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <ArrowRight className="w-4 h-4 text-primary/40" />
          </div>
        </div>
      )}
      
      {/* Step card */}
      <div className="group relative h-full">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
        
        <div className="relative h-full rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 transition-all duration-500 group-hover:bg-card/80 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:-translate-y-2">
          {/* Step number */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              {icon}
            </div>
            <span className="text-6xl font-black text-muted/20 group-hover:text-primary/20 transition-colors">
              {number}
            </span>
          </div>
          
          {/* Content */}
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            {title}
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>
          
          {/* Features */}
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  const navigate = useNavigate();
  
  const steps = [
    {
      number: "01",
      icon: <Calendar className="w-7 h-7 text-white" />,
      title: "Выберите время",
      description: "Запишитесь онлайн на удобный день и время. Медсестра приедет к вам домой или в офис.",
      features: [
        "Онлайн-запись за 2 минуты",
        "Утренние и вечерние слоты",
        "Напоминание за день до визита",
      ],
      delay: 0.1,
    },
    {
      number: "02",
      icon: <Home className="w-7 h-7 text-white" />,
      title: "Забор на дому",
      description: "Медсестра приезжает в назначенное время. Забор крови занимает 15 минут в комфортных условиях.",
      features: [
        "Сертифицированные медсёстры",
        "Одноразовые материалы",
        "Транспортировка в лабораторию",
      ],
      delay: 0.2,
    },
    {
      number: "03",
      icon: <FlaskConical className="w-7 h-7 text-white" />,
      title: "Анализ 50+ маркеров",
      description: "Лаборатория исследует 50+ биомаркеров. AI рассчитывает биологический возраст и тренды.",
      features: [
        "Аккредитованная лаборатория",
        "Расчёт биологического возраста",
        "Анализ 5 систем организма",
      ],
      delay: 0.3,
    },
    {
      number: "04",
      icon: <LineChart className="w-7 h-7 text-white" />,
      title: "Получите результат",
      description: "Через 5 дней — подробный отчёт с AI-рекомендациями. Видите тренды и план действий.",
      features: [
        "Персональные рекомендации",
        "Сравнение с предыдущими",
        "Доступ к AI-ассистенту",
      ],
      delay: 0.4,
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      
      {/* Decorative orbs */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <span className="text-sm font-medium text-primary">4 простых шага</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Как это </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              работает
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            От записи до получения персональных рекомендаций — всего 5 дней
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 mb-16">
          {steps.map((step, index) => (
            <Step 
              key={index} 
              {...step} 
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <Button 
            size="lg" 
            onClick={() => navigate("/register")}
            className="text-lg px-10 py-6 shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300 group"
          >
            Записаться на забор
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Первый анализ со скидкой 20%
          </p>
        </div>
      </div>
    </section>
  );
}
