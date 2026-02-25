import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
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
  ThermometerSun } from
"lucide-react";

const appFeatures = [
{
  id: "dashboard",
  icon: LayoutDashboard,
  title: "Моё здоровье",
  subtitle: "Главный экран",
  description: "Все ключевые метрики на одном экране — биовозраст, индекс здоровья, тренды по системам",
  badges: ["Биовозраст", "Индекс здоровья"],
  features: [
  { icon: ThermometerSun, text: "Тепловая карта тела" },
  { icon: TrendingUp, text: "Тренды по 5 системам" },
  { icon: BarChart3, text: "История изменений" }],

  color: "from-blue-500 to-indigo-500"
},
{
  id: "analyses",
  icon: FlaskConical,
  title: "Анализы",
  subtitle: "История исследований",
  description: "Все ваши анализы в одном месте с удобной навигацией и статусами",
  badges: ["Карточки анализов", "Статусы"],
  features: [
  { icon: FileText, text: "Детальный просмотр" },
  { icon: Clock, text: "История анализов" },
  { icon: Activity, text: "Количество маркеров" }],

  color: "from-emerald-500 to-teal-500"
},
{
  id: "biomarkers",
  icon: Activity,
  title: "Биомаркеры",
  subtitle: "Все показатели",
  description: "50+ биомаркеров с группировкой по системам, шкалой нормы и трендами",
  badges: ["По системам", "Шкала нормы"],
  features: [
  { icon: BarChart3, text: "Группировка по 5 системам" },
  { icon: TrendingUp, text: "Индивидуальные тренды" },
  { icon: Lightbulb, text: "Пояснения простым языком" }],

  color: "from-amber-500 to-orange-500"
},
{
  id: "trends",
  icon: TrendingUp,
  title: "Тренды",
  subtitle: "Динамика во времени",
  description: "Отслеживайте изменения любого показателя на графиках с референсными линиями",
  badges: ["Графики", "Период"],
  features: [
  { icon: BarChart3, text: "Выбор периода" },
  { icon: Activity, text: "Референсные линии" },
  { icon: TrendingUp, text: "Сравнение анализов" }],

  color: "from-violet-500 to-purple-500"
},
{
  id: "state",
  icon: Heart,
  title: "Моё состояние",
  subtitle: "Дневник симптомов",
  description: "Отслеживайте симптомы по 11 категориям для более точного анализа",
  badges: ["11 категорий", "История"],
  features: [
  { icon: FileText, text: "Опрос по категориям" },
  { icon: Clock, text: "История изменений" },
  { icon: TrendingUp, text: "Связь с анализами" }],

  color: "from-rose-500 to-pink-500"
},
{
  id: "assistant",
  icon: MessageSquare,
  title: "AI Ассистент",
  subtitle: "Персональный врач 24/7",
  description: "Задавайте вопросы о здоровье — AI учитывает все ваши данные и анализы",
  badges: ["24/7", "AI"],
  features: [
  { icon: Sparkles, text: "Учитывает ваши данные" },
  { icon: MessageSquare, text: "Мгновенные ответы" },
  { icon: Lightbulb, text: "Персональные советы" }],

  color: "from-cyan-500 to-blue-500"
},
{
  id: "recommendations",
  icon: Lightbulb,
  title: "Рекомендации",
  subtitle: "AI-генерированные отчёты",
  description: "Персональные рекомендации по питанию, добавкам и образу жизни",
  badges: ["Питание", "Добавки", "Образ жизни"],
  features: [
  { icon: Sparkles, text: "AI-анализ" },
  { icon: FileText, text: "Конкретные продукты" },
  { icon: Activity, text: "Дозировки и сроки" }],

  color: "from-yellow-500 to-amber-500"
},
{
  id: "prescriptions",
  icon: FileText,
  title: "Назначения",
  subtitle: "Назначения врача",
  description: "Все назначения от врача в одном месте с дозировками и сроками контроля",
  badges: ["Препараты", "Контроль"],
  features: [
  { icon: Clock, text: "Сроки контроля" },
  { icon: FileText, text: "Дозировки" },
  { icon: Activity, text: "Критерии эффективности" }],

  color: "from-green-500 to-emerald-500"
}];


function FeatureCard({ feature, index }: {feature: typeof appFeatures[0];index: number;}) {
  const Icon = feature.icon;

  return (
    <Card
      className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-500 hover:bg-card/80 hover:border-primary/30 hover:shadow-xl animate-fade-in"
      style={{ animationDelay: `${index * 75}ms` }}>

      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
      
      <CardContent className="p-6 relative">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-lg">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.subtitle}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {feature.description}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {feature.badges.map((badge) =>
          <Badge key={badge} variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>

        {/* Features list - shown on hover */}
        <div className="space-y-2">
          <div className="pt-4 border-t border-border/50">
            {feature.features.map((f, i) => {
              const FeatureIcon = f.icon;
              return (
                <div key={i} className="flex items-center gap-2 text-sm py-1">
                  <FeatureIcon className="w-4 h-4 text-primary shrink-0" />
                  <span>{f.text}</span>
                </div>);

            })}
          </div>
        </div>
      </CardContent>
    </Card>);

}

export function AppFeaturesSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-muted/30">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="outline" className="mb-4 px-4 py-1.5">
            📱 Приложение
          </Badge>
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
          <HeroShowcase />
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center gap-8 mb-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">8</div>
            <div className="text-sm text-muted-foreground">Разделов</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">50+</div>
            <div className="text-sm text-muted-foreground">Биомаркеров</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">24/7</div>
            <div className="text-sm text-muted-foreground">AI-ассистент</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">5</div>
            <div className="text-sm text-muted-foreground">Систем организма</div>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {appFeatures.map((feature, index) =>
          <FeatureCard key={feature.id} feature={feature} index={index} />
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '600ms' }}>
          


          













        </div>
      </div>
    </section>);

}