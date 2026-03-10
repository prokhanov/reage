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
  Droplets,
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
    risks: ["Инсулинорезистентность", "Преддиабет", "Гипергликемия", "Дефицит B12", "Дефицит магния", "Дефицит цинка", "Дефицит селена", "Оксидативный стресс", "Митохондриальная дисфункция", "Хроническая усталость"]
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
    risks: ["Риск атеросклероза", "Дислипидемия", "Гиперхолестеринемия", "Риск тромбоза", "Кардиоваскулярный риск", "Гипергомоцистеинемия", "Эндотелиальная дисфункция", "Нарушение липидного профиля", "Анемия", "Дефицит железа"]
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
    risks: ["Хроническое воспаление", "Системное воспаление", "Снижение иммунитета", "Аутоиммунные риски", "Нарушение гемопоэза", "Нарушение свёртываемости", "Хроническая гипоксия", "Ускоренное старение"]
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
    risks: ["Гипотиреоз", "Гипертиреоз", "Дефицит витамина D", "Гормональный дисбаланс", "Хронический стресс", "Надпочечниковая усталость", "Дефицит тестостерона", "Избыток эстрогенов", "Нарушение кортизолового ритма", "Снижение фертильности"]
  },
  {
    id: "metabolism",
    emoji: "🔄",
    icon: RefreshCw,
    name: "Обмен веществ и детоксикация",
    gradient: "from-[hsl(215,48%,52%)] to-[hsl(185,42%,48%)]",
    markers: ["ALT", "AST", "GGT", "Билирубин", "ALP", "Общий белок", "Трансферрин", "Мочевая кислота"],
    insights: [
      "Как работает печень",
      "Эффективность детоксикации",
      "Состояние белкового обмена",
      "Риск подагры и гиперурикемии"
    ],
    risks: ["Нарушение функции печени", "Жировой гепатоз", "Фиброз печени", "Токсическая нагрузка", "Нарушение детоксикации", "Подагра", "Гиперурикемия", "Нарушение белкового обмена"]
  },
  {
    id: "kidneys",
    emoji: "💧",
    icon: Droplets,
    name: "Почки и водно-солевой баланс",
    gradient: "from-[hsl(190,45%,50%)] to-[hsl(210,40%,55%)]",
    markers: ["Креатинин", "Мочевина", "Натрий", "Калий", "Хлор", "Кальций", "Фосфор", "Цистатин С"],
    insights: [
      "Функция почек",
      "Баланс электролитов",
      "Риск мочекаменной болезни",
      "Состояние минерального обмена"
    ],
    risks: ["Почечная недостаточность", "Нефропатия", "Нарушение электролитного баланса", "Гиперкалиемия", "Гипонатриемия", "Нарушение водно-солевого баланса", "Риск мочекаменной болезни", "Дефицит кальция"]
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
                  Система {index + 1}/6
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

            {/* Risks */}
            <div className="pt-4 border-t border-border/30">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Выявляемые риски</h4>
              <div className="flex flex-wrap gap-1.5">
                {category.risks.map((risk) => (
                  <span
                    key={risk}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/5 text-destructive/80 border border-destructive/15"
                  >
                    {risk}
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
            Все системы взаимосвязаны — мы анализируем их комплексно. 85+ биомаркеров, сгруппированных в{" "}
            <span className="text-foreground font-medium">6 систем организма</span>
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
