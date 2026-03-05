import { useState } from "react";
import { StatsMarqueeSection } from "@/components/landing/StatsMarqueeSection";
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
  CheckCircle2,
  FileText,
  Target,
  TrendingUp,
  Pill
} from "lucide-react";

const biomarkerCategories = [
  {
    id: "energy",
    emoji: "⚡",
    icon: Zap,
    name: "Энергия и восстановление",
    gradient: "from-[hsl(230,45%,55%)] to-[hsl(195,50%,50%)]",
    markers: ["Глюкоза", "HbA1c", "Инсулин", "HOMA-IR", "ЛДГ", "Коэнзим Q10", "Малоновый диальдегид", "Антиоксидантный статус", "Магний", "B12", "B9", "Цинк", "Селен", "Альбумин", "Лактат"],
    insights: [
      "Почему постоянная усталость",
      "Достаточно ли энергии производят ваши клетки",
      "Есть ли скрытый дефицит микроэлементов",
      "Как быстро вы восстанавливаетесь после нагрузки"
    ],
    symptoms: ["Хроническая усталость", "Тяга к сладкому", "Туман в голове", "Медленное восстановление", "Мышечная слабость"]
  },
  {
    id: "cardio",
    emoji: "❤️",
    icon: Heart,
    name: "Сердечно-сосудистая система",
    gradient: "from-[hsl(220,50%,50%)] to-[hsl(260,40%,55%)]",
    markers: ["Общий холестерин", "ЛПВП", "ЛПНП", "Триглицериды", "ЛПОНП", "ApoA1", "ApoB", "ApoB/ApoA1", "не-HDL холестерин", "Индекс атерогенности", "Гомоцистеин", "Lp(a)", "Ферритин", "Железо", "Медь", "NT-proBNP", "КФК"],
    insights: [
      "Риск атеросклероза",
      "Состояние сосудистой стенки",
      "Баланс «плохого» и «хорошего» холестерина",
      "Скрытые маркеры сердечного риска"
    ],
    symptoms: ["Повышенное давление", "Одышка", "Отёки ног", "Боль в груди", "Головокружения"]
  },
  {
    id: "immune",
    emoji: "🛡️",
    icon: Shield,
    name: "Воспалительная и иммунная система",
    gradient: "from-[hsl(200,45%,50%)] to-[hsl(175,40%,48%)]",
    markers: ["Гемоглобин", "Эритроциты", "Гематокрит", "MCV", "MCH/MCHC", "Лейкоциты", "Нейтрофилы", "Лимфоциты", "Моноциты", "Эозинофилы", "Базофилы", "Тромбоциты", "CD3+", "CD4+", "CD8+", "CD19+", "NK-клетки", "СОЭ", "CRP", "IL-6", "TNF-α", "IgM", "IgG"],
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
    gradient: "from-[hsl(245,40%,55%)] to-[hsl(210,45%,50%)]",
    markers: ["ТТГ", "Т4 свободный", "Т3 свободный", "Тестостерон", "Эстрадиол", "Эстрон", "Эстриол", "Кортизол", "DHEA-S", "SHBG", "Витамин D", "IGF-1"],
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
    gradient: "from-[hsl(215,48%,52%)] to-[hsl(185,42%,48%)]",
    markers: ["ALT", "AST", "GGT", "Билирубин", "ALP", "Общий белок", "Трансферрин", "Креатинин", "Мочевина", "Натрий", "Калий", "Хлор", "Кальций"],
    insights: [
      "Как работает печень",
      "Риск диабета",
      "Функция почек",
      "Эффективность детоксикации"
    ],
    symptoms: ["Тяжесть после еды", "Тошнота", "Отёки", "Тяга к сладкому", "Проблемы с кожей"]
  }
];

const serviceSections = [
  {
    icon: Target,
    title: "Резюме на 1 странице",
    items: [
      "Биологический возраст vs паспортный",
      "Индекс здоровья (0-100)",
      "Топ-3 зоны внимания",
      "Топ-3 сильные стороны"
    ]
  },
  {
    icon: TrendingUp,
    title: "Детальный анализ по системам",
    items: [
      "Оценка каждой системы (0-100 баллов)",
      "Маркеры в норме / отклонения",
      "Объяснение простым языком"
    ]
  },
  {
    icon: FileText,
    title: "Персональные рекомендации",
    items: [
      "Питание (конкретные продукты)",
      "Добавки и БАДы (дозировки, длительность)",
      "Образ жизни (сон, активность)",
      "Что проверить дополнительно"
    ]
  },
  {
    icon: Pill,
    title: "Назначения врача",
    items: [
      "Препараты (если нужны)",
      "Сроки контроля",
      "Критерии эффективности"
    ]
  }
];

function CategoryCard({ category, index }: { category: typeof biomarkerCategories[0]; index: number }) {
  const Icon = category.icon;
  const isEven = index % 2 === 0;

  return (
    <div
      className="group relative animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Outer glow on hover */}
      <div className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${category.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-all duration-700`} />

      <div className="relative rounded-2xl bg-card/40 backdrop-blur-xl border border-border/40 overflow-hidden transition-all duration-500 group-hover:border-border/80 group-hover:bg-card/60">
        <div className="flex flex-col md:flex-row">
          
          {/* Visual side */}
          <div className={`relative md:w-80 shrink-0 p-8 md:p-10 flex flex-col justify-center bg-gradient-to-br ${category.gradient} overflow-hidden`}>
            {/* Large decorative emoji */}
            <div className="absolute -bottom-6 -right-6 text-[120px] leading-none opacity-[0.15] select-none pointer-events-none">
              {category.emoji}
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Icon className="w-6 h-6 text-white" />
                <span className="text-white/70 text-sm font-medium uppercase tracking-widest">
                  Система {index + 1}/5
                </span>
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                {category.name}
              </h3>
              
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                <span className="text-white font-semibold text-sm">{category.markers.length}</span>
                <span className="text-white/80 text-sm">маркеров</span>
              </div>
            </div>
          </div>

          {/* Content side */}
          <div className="flex-1 p-6 md:p-8 space-y-6">
            {/* Insights */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Что узнаете</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${category.gradient} mt-1.5 shrink-0`} />
                    <span className="text-foreground/80">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Markers cloud */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Биомаркеры</h4>
              <div className="flex flex-wrap gap-1.5">
                {category.markers.map((marker) => (
                  <span
                    key={marker}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted/60 text-foreground/70 border border-border/40 transition-colors duration-200 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  >
                    {marker}
                  </span>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div className="pt-4 border-t border-border/30">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Признаки нарушений</h4>
              <div className="flex flex-wrap gap-1.5">
                {category.symptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/5 text-destructive/80 border border-destructive/15"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BiomarkersDeepDiveSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Что мы{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              измеряем
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Все системы взаимосвязаны — мы анализируем их комплексно. 50+ биомаркеров, сгруппированных в{" "}
            <span className="text-foreground font-medium">5 систем организма</span>
            — от энергии до гормонов
          </p>
        </div>


        {/* Category cards */}
        <div className="space-y-6 mb-20">
          {biomarkerCategories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>




      </div>
    </section>
  );
}
