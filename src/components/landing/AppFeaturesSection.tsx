import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { HeroShowcase, type ShowcaseSection } from "@/components/landing/HeroShowcase";
import {
  LayoutDashboard,
  FlaskConical,
  Activity,
  TrendingUp,
  Heart,
  MessageSquare,
  Lightbulb,
  FileText,
  Sparkles,
  Clock,
  BarChart3,
  ThermometerSun,
} from "lucide-react";

const appFeatures: Record<ShowcaseSection, {
  icon: typeof LayoutDashboard;
  title: string;
  subtitle: string;
  description: string;
  badges: string[];
  features: { icon: typeof LayoutDashboard; text: string }[];
  color: string;
}> = {
  dashboard: {
    icon: LayoutDashboard,
    title: "Моё здоровье",
    subtitle: "Главный экран",
    description: "Все ключевые метрики на одном экране — биовозраст, индекс здоровья, тренды по системам",
    badges: ["Биовозраст", "Индекс здоровья"],
    features: [
      { icon: ThermometerSun, text: "Тепловая карта тела" },
      { icon: TrendingUp, text: "Тренды по 5 системам" },
      { icon: BarChart3, text: "История изменений" },
    ],
    color: "from-blue-500 to-indigo-500",
  },
  analyses: {
    icon: FlaskConical,
    title: "Анализы",
    subtitle: "История исследований",
    description: "Все ваши анализы в одном месте с удобной навигацией и статусами",
    badges: ["Карточки анализов", "Статусы"],
    features: [
      { icon: FileText, text: "Детальный просмотр" },
      { icon: Clock, text: "История анализов" },
      { icon: Activity, text: "Количество маркеров" },
    ],
    color: "from-emerald-500 to-teal-500",
  },
  biomarkers: {
    icon: Activity,
    title: "Биомаркеры",
    subtitle: "Все показатели",
    description: "50+ биомаркеров с группировкой по системам, шкалой нормы и трендами",
    badges: ["По системам", "Шкала нормы"],
    features: [
      { icon: BarChart3, text: "Группировка по 5 системам" },
      { icon: TrendingUp, text: "Индивидуальные тренды" },
      { icon: Lightbulb, text: "Пояснения простым языком" },
    ],
    color: "from-amber-500 to-orange-500",
  },
  trends: {
    icon: TrendingUp,
    title: "Тренды",
    subtitle: "Динамика во времени",
    description: "Отслеживайте изменения любого показателя на графиках с референсными линиями",
    badges: ["Графики", "Период"],
    features: [
      { icon: BarChart3, text: "Выбор периода" },
      { icon: Activity, text: "Референсные линии" },
      { icon: TrendingUp, text: "Сравнение анализов" },
    ],
    color: "from-violet-500 to-purple-500",
  },
  state: {
    icon: Heart,
    title: "Моё состояние",
    subtitle: "Дневник симптомов",
    description: "Отслеживайте симптомы по 11 категориям для более точного анализа",
    badges: ["11 категорий", "История"],
    features: [
      { icon: FileText, text: "Опрос по категориям" },
      { icon: Clock, text: "История изменений" },
      { icon: TrendingUp, text: "Связь с анализами" },
    ],
    color: "from-rose-500 to-pink-500",
  },
  assistant: {
    icon: MessageSquare,
    title: "AI Ассистент",
    subtitle: "Персональный врач 24/7",
    description: "Задавайте вопросы о здоровье — AI учитывает все ваши данные и анализы",
    badges: ["24/7", "AI"],
    features: [
      { icon: Sparkles, text: "Учитывает ваши данные" },
      { icon: MessageSquare, text: "Мгновенные ответы" },
      { icon: Lightbulb, text: "Персональные советы" },
    ],
    color: "from-cyan-500 to-blue-500",
  },
  recommendations: {
    icon: Lightbulb,
    title: "Рекомендации",
    subtitle: "AI-генерированные отчёты",
    description: "Персональные рекомендации по питанию, добавкам и образу жизни",
    badges: ["Питание", "Добавки", "Образ жизни"],
    features: [
      { icon: Sparkles, text: "AI-анализ" },
      { icon: FileText, text: "Конкретные продукты" },
      { icon: Activity, text: "Дозировки и сроки" },
    ],
    color: "from-yellow-500 to-amber-500",
  },
  prescriptions: {
    icon: FileText,
    title: "Назначения",
    subtitle: "Назначения врача",
    description: "Все назначения от врача в одном месте с дозировками и сроками контроля",
    badges: ["Препараты", "Контроль"],
    features: [
      { icon: Clock, text: "Сроки контроля" },
      { icon: FileText, text: "Дозировки" },
      { icon: Activity, text: "Критерии эффективности" },
    ],
    color: "from-green-500 to-emerald-500",
  },
};

export function AppFeaturesSection() {
  const [activeSection, setActiveSection] = useState<ShowcaseSection>("dashboard");
  const handleSectionChange = useCallback((section: ShowcaseSection) => {
    setActiveSection(section);
  }, []);

  const feature = appFeatures[activeSection];
  const Icon = feature.icon;

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-muted/30">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Всё в одном приложении —{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              полный контроль
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            8 разделов для управления вашим здоровьем — от анализов до AI-ассистента
          </p>

          {/* Interactive Showcase */}
          <HeroShowcase onSectionChange={handleSectionChange} />

          {/* Active feature description */}
          <div key={activeSection} className="mt-8 max-w-2xl mx-auto text-left animate-fade-in">
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.subtitle}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {feature.badges.map((badge) => (
                  <Badge key={badge} variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>

              <div className="pt-4 border-t border-border/50 space-y-2">
                {feature.features.map((f, i) => {
                  const FeatureIcon = f.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      <FeatureIcon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{f.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
