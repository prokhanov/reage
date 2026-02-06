import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Heart, 
  Shield, 
  Dna, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from "lucide-react";

const biomarkerCategories = [
  {
    id: "energy",
    emoji: "⚡",
    icon: Zap,
    name: "Энергия и восстановление",
    color: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/10",
    markers: ["Гемоглобин", "Ферритин", "Железо", "B12", "B9", "Трансферрин"],
    insights: [
      "Почему постоянная усталость",
      "Достаточно ли кислорода доставляется к тканям",
      "Есть ли скрытый дефицит железа",
      "Как быстро вы восстанавливаетесь после нагрузки"
    ],
    symptoms: ["Хроническая усталость", "Бледность", "Одышка при нагрузке", "Холодные конечности", "Выпадение волос"]
  },
  {
    id: "cardio",
    emoji: "❤️",
    icon: Heart,
    name: "Сердечно-сосудистая система",
    color: "from-red-500 to-rose-500",
    bgGlow: "bg-red-500/10",
    markers: ["Холестерин", "ЛПНП", "ЛПВП", "Триглицериды", "Гомоцистеин", "ApoB", "Lp(a)"],
    insights: [
      "Риск атеросклероза",
      "Состояние сосудистой стенки",
      'Баланс "плохого" и "хорошего" холестерина',
      "Скрытые маркеры сердечного риска"
    ],
    symptoms: ["Повышенное давление", "Одышка", "Отёки ног", "Боль в груди", "Головокружения"]
  },
  {
    id: "immune",
    emoji: "🛡️",
    icon: Shield,
    name: "Воспалительная и иммунная система",
    color: "from-emerald-500 to-teal-500",
    bgGlow: "bg-emerald-500/10",
    markers: ["CRP", "СОЭ", "Лейкоциты", "Нейтрофилы", "Лимфоциты", "IL-6"],
    insights: [
      "Есть ли хроническое воспаление (главная причина старения)",
      "Как работает иммунитет",
      "Есть ли скрытые инфекции",
      "Риск аутоиммунных процессов"
    ],
    symptoms: ["Частые простуды", "Долгое заживление ран", "Боли в суставах", "Повышенная температура"]
  },
  {
    id: "endocrine",
    emoji: "🧬",
    icon: Dna,
    name: "Эндокринная и стрессовая система",
    color: "from-violet-500 to-purple-500",
    bgGlow: "bg-violet-500/10",
    markers: ["ТТГ", "Т3", "Т4", "Кортизол", "Тестостерон", "Эстрадиол", "Инсулин", "SHBG"],
    insights: [
      "Гормональный баланс",
      "Уровень стресса (хронический кортизол)",
      "Работа щитовидной железы",
      "Инсулинорезистентность (предиабет)"
    ],
    symptoms: ["Набор веса", "Выпадение волос", "Раздражительность", "Снижение либидо", "Проблемы со сном"]
  },
  {
    id: "metabolism",
    emoji: "🔄",
    icon: RefreshCw,
    name: "Обмен веществ и детоксикация",
    color: "from-blue-500 to-cyan-500",
    bgGlow: "bg-blue-500/10",
    markers: ["Глюкоза", "HbA1c", "ALT", "AST", "GGT", "Креатинин", "Мочевина", "Билирубин"],
    insights: [
      "Как работает печень",
      "Риск диабета",
      "Функция почек",
      "Эффективность детоксикации"
    ],
    symptoms: ["Тяжесть после еды", "Тошнота", "Отёки", "Тяга к сладкому", "Проблемы с кожей"]
  }
];


function CategoryCard({ category, index }: { category: typeof biomarkerCategories[0]; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = category.icon;

  return (
    <Card 
      className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-500 hover:bg-card/80 hover:border-primary/30 hover:shadow-xl cursor-pointer"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${category.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <CardContent className="p-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-2xl shadow-lg`}>
              {category.emoji}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{category.name}</h3>
              <p className="text-sm text-muted-foreground">{category.markers.length} маркеров</p>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Markers */}
        <div className="flex flex-wrap gap-2 mb-4">
          {category.markers.slice(0, isExpanded ? undefined : 4).map((marker) => (
            <Badge key={marker} variant="secondary" className="text-xs">
              {marker}
            </Badge>
          ))}
          {!isExpanded && category.markers.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{category.markers.length - 4}
            </Badge>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-border/50 animate-fade-in">
            {/* What you'll learn */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Что узнаете:</h4>
              <ul className="space-y-1.5">
                {category.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Symptoms */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Признаки нарушений:</h4>
              <div className="flex flex-wrap gap-2">
                {category.symptoms.map((symptom) => (
                  <Badge key={symptom} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BiomarkersDeepDiveSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4 px-4 py-1.5">
            🔬 Научный подход
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Что мы{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              измеряем
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            50+ биомаркеров, сгруппированных в{" "}
            <span className="text-foreground font-medium">5 систем организма</span>
            — от энергии до гормонов
          </p>
        </div>

        {/* Central pentagon visualization */}
        <div className="relative mb-16">
          <div className="flex justify-center mb-8">
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              {/* Central circle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30">
                  <span className="text-3xl md:text-4xl font-bold text-primary-foreground">50+</span>
                </div>
              </div>
              
              {/* Orbiting icons */}
              {biomarkerCategories.map((cat, i) => {
                const angle = (i * 72 - 90) * (Math.PI / 180);
                const radius = 100;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                return (
                  <div
                    key={cat.id}
                    className={`absolute w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl md:text-2xl shadow-lg transform transition-transform hover:scale-110`}
                    style={{
                      left: `calc(50% + ${x}px - 28px)`,
                      top: `calc(50% + ${y}px - 28px)`,
                    }}
                  >
                    {cat.emoji}
                  </div>
                );
              })}
              
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                {biomarkerCategories.map((_, i) => {
                  const angle1 = (i * 72 - 90) * (Math.PI / 180);
                  const angle2 = ((i + 1) % 5 * 72 - 90) * (Math.PI / 180);
                  const radius = 100;
                  const cx = 160;
                  const cy = 160;
                  
                  return (
                    <line
                      key={i}
                      x1={cx + Math.cos(angle1) * radius}
                      y1={cy + Math.sin(angle1) * radius}
                      x2={cx + Math.cos(angle2) * radius}
                      y2={cy + Math.sin(angle2) * radius}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      className="hidden md:block"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
          
          <p className="text-center text-muted-foreground">
            Все системы взаимосвязаны — мы анализируем их комплексно
          </p>
        </div>

        {/* Category cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {biomarkerCategories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
