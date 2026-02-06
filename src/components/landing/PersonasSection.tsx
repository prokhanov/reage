import { 
  Briefcase, 
  Dumbbell, 
  Heart, 
  Baby,
  Clock,
  Trophy,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PersonaCardProps {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  age: string;
  pain: string;
  goal: string;
  result: string;
  delay: number;
}

function PersonaCard({ icon, emoji, title, age, pain, goal, result, delay }: PersonaCardProps) {
  return (
    <div 
      className="group relative h-full animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Hover glow */}
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
      
      <div className="relative h-full rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 transition-all duration-500 group-hover:bg-card/80 group-hover:border-primary/30 group-hover:shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{emoji}</div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{age}</p>
            </div>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        
        {/* Pain point */}
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Боль</div>
          <p className="text-sm text-foreground leading-relaxed">{pain}</p>
        </div>
        
        {/* Goal */}
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Цель</div>
          <p className="text-sm text-foreground leading-relaxed">{goal}</p>
        </div>
        
        {/* Result */}
        <div className="mt-auto pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-status-warning" />
            <span className="text-sm font-medium text-primary">{result}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PersonasSection() {
  const navigate = useNavigate();
  
  const personas = [
    {
      emoji: "👨‍💼",
      icon: <Briefcase className="w-5 h-5" />,
      title: "Занятой профессионал",
      age: "35-50 лет",
      pain: "Нет времени на походы по клиникам. Чувствую, что здоровье ухудшается, но непонятно что делать.",
      goal: "Системно следить за здоровьем без потери времени",
      result: "Биовозраст -4 года за 12 месяцев",
      delay: 0.1,
    },
    {
      emoji: "🏃‍♂️",
      icon: <Dumbbell className="w-5 h-5" />,
      title: "Биохакер / Спортсмен",
      age: "25-45 лет",
      pain: "Хочу оптимизировать показатели. Нужны данные, а не догадки.",
      goal: "Максимальная производительность и энергия",
      result: "Оптимизация 12 биомаркеров",
      delay: 0.2,
    },
    {
      emoji: "👩‍⚕️",
      icon: <Heart className="w-5 h-5" />,
      title: "Осознанный про здоровье",
      age: "30-55 лет",
      pain: "Уже слежу за питанием и спортом, но не вижу полной картины.",
      goal: "Понять, работает ли то, что я делаю",
      result: "Тренды показали эффект диеты",
      delay: 0.3,
    },
    {
      emoji: "👨‍👩‍👧",
      icon: <Baby className="w-5 h-5" />,
      title: "Планирую семью",
      age: "28-40 лет",
      pain: "Хочу быть здоровым для детей. Нужно понять текущее состояние.",
      goal: "Подготовить организм к родительству",
      result: "Нормализация гормонов",
      delay: 0.4,
    },
    {
      emoji: "⏰",
      icon: <Clock className="w-5 h-5" />,
      title: "После 40",
      age: "40-60 лет",
      pain: "Начались первые звоночки. Хочу замедлить старение.",
      goal: "Профилактика возрастных заболеваний",
      result: "Биовозраст моложе на 7 лет",
      delay: 0.5,
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />
      
      {/* Floating orbs */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Для кого это</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Узнайте себя </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              в наших клиентах
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            ReAge подходит тем, кто готов взять здоровье в свои руки
          </p>
        </div>

        {/* Personas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {personas.slice(0, 3).map((persona, index) => (
            <PersonaCard key={index} {...persona} />
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {personas.slice(3).map((persona, index) => (
            <PersonaCard key={index + 3} {...persona} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Button 
            size="lg"
            variant="outline"
            onClick={() => navigate("/register")}
            className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5 group"
          >
            Это про меня — начать
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
