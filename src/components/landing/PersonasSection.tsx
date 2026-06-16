import { useState } from "react";
import { 
  Briefcase, 
  Dumbbell, 
  Heart, 
  Baby,
  Clock,
  Trophy,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Persona {
  id: string;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  shortTitle: string;
  age: string;
  pain: string;
  goal: string;
  result: string;
  quote: string;
}

export function PersonasSection() {
  const navigate = useNavigate();
  const [activePersona, setActivePersona] = useState(0);
  
  const personas: Persona[] = [
    {
      id: "professional",
      emoji: "👨‍💼",
      icon: <Briefcase className="w-5 h-5" />,
      title: "Занятой профессионал",
      shortTitle: "Профессионал",
      age: "35-50 лет",
      pain: "Нет времени на походы по клиникам. Чувствую, что здоровье ухудшается, но непонятно что делать.",
      goal: "Системно следить за здоровьем без потери времени",
      result: "Биовозраст -4 года за 12 месяцев",
      quote: "Теперь я точно знаю, на что обращать внимание",
    },
    {
      id: "biohacker",
      emoji: "🏃‍♂️",
      icon: <Dumbbell className="w-5 h-5" />,
      title: "Биохакер / Спортсмен",
      shortTitle: "Биохакер",
      age: "25-45 лет",
      pain: "Хочу оптимизировать показатели. Нужны данные, а не догадки.",
      goal: "Максимальная производительность и энергия",
      result: "Оптимизация 12 биомаркеров",
      quote: "Наконец-то вижу результаты своих усилий в цифрах",
    },
    {
      id: "conscious",
      emoji: "👩‍⚕️",
      icon: <Heart className="w-5 h-5" />,
      title: "Осознанный про здоровье",
      shortTitle: "Осознанный",
      age: "30-55 лет",
      pain: "Уже слежу за питанием и спортом, но не вижу полной картины.",
      goal: "Понять, работает ли то, что я делаю",
      result: "Тренды показали эффект диеты",
      quote: "ReAge подтвердил, что мой образ жизни работает",
    },
    {
      id: "family",
      emoji: "👨‍👩‍👧",
      icon: <Baby className="w-5 h-5" />,
      title: "Планирую семью",
      shortTitle: "Семья",
      age: "28-40 лет",
      pain: "Хочу быть здоровым для детей. Нужно понять текущее состояние.",
      goal: "Подготовить организм к родительству",
      result: "Нормализация гормонов",
      quote: "Подготовились к беременности осознанно",
    },
    {
      id: "longevity",
      emoji: "⏰",
      icon: <Clock className="w-5 h-5" />,
      title: "После 40",
      shortTitle: "Долголетие",
      age: "40-60 лет",
      pain: "Начались первые звоночки. Хочу замедлить старение.",
      goal: "Профилактика возрастных заболеваний",
      result: "Биовозраст моложе на 7 лет",
      quote: "Чувствую себя моложе, чем 5 лет назад",
    },
  ];

  const activeData = personas[activePersona];

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
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
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
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
        </div>

        {/* Persona Switcher */}
        <div className="relative mb-10 md:mb-12">
          {/* Scrollable container */}
          <div className="relative overflow-hidden">
            {/* Gradient masks */}
            <div className="absolute left-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            {/* Switcher */}
            <div className="flex justify-center">
              <div className="flex gap-2 md:gap-4 px-8 md:px-16 overflow-x-auto scrollbar-hide py-2">
                {personas.map((persona, index) => (
                  <button
                    key={persona.id}
                    onClick={() => setActivePersona(index)}
                    className={`relative flex-shrink-0 px-5 md:px-8 py-3 md:py-4 rounded-2xl text-sm md:text-lg font-medium transition-all duration-300 whitespace-nowrap ${
                      activePersona === index
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {/* Active background */}
                    {activePersona === index && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl animate-scale-in" />
                    )}
                    
                    {/* Hover background */}
                    {activePersona !== index && (
                      <div className="absolute inset-0 bg-muted/50 rounded-2xl opacity-0 hover:opacity-100 transition-opacity" />
                    )}
                    
                    <span className="relative flex items-center gap-2 md:gap-3">
                      <span className="text-lg md:text-2xl">{persona.emoji}</span>
                      <span className="hidden sm:inline">{persona.shortTitle}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="max-w-5xl mx-auto">
          <div 
            key={activePersona}
            className="relative animate-fade-in"
          >
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-[40px] blur-2xl opacity-50" />
            
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Left side - Info */}
                <div className="p-8 md:p-12 space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className="text-5xl md:text-6xl">{activeData.emoji}</div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">{activeData.title}</h3>
                      <p className="text-muted-foreground">{activeData.age}</p>
                    </div>
                  </div>
                  
                  {/* Quote */}
                  <div className="relative pl-4 border-l-2 border-primary/50">
                    <p className="text-lg md:text-xl text-foreground/80 italic">
                      "{activeData.quote}"
                    </p>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="bg-muted/30 rounded-2xl p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Боль</div>
                      <p className="text-sm text-foreground">{activeData.pain}</p>
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Цель</div>
                      <p className="text-sm text-foreground">{activeData.goal}</p>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Result showcase */}
                <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-8 md:p-12 flex flex-col justify-center items-center">
                  {/* Decorative elements */}
                  <div className="absolute top-8 right-8 text-primary/10">
                    <Sparkles className="w-24 h-24" />
                  </div>
                  
                  {/* Result card */}
                  <div className="relative z-10 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Trophy className="w-6 h-6 text-status-warning" />
                      <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Результат</span>
                    </div>
                    
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-6">
                      {activeData.result}
                    </div>
                    
                    <Button 
                      size="lg"
                      onClick={() => navigate("/register")}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/25 group"
                    >
                      Это про меня
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                  
                  {/* Icon decoration */}
                  <div className="absolute bottom-8 left-8 flex items-center justify-center w-16 h-16 rounded-2xl bg-card/50 backdrop-blur border border-border/50 text-primary">
                    {activeData.icon}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
