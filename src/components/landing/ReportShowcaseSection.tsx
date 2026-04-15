import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileDown,
  FileText,
  Target,
  TrendingUp,
  Pill,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Activity,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

const reportPages = [
  {
    title: "Общее резюме",
    description: "Главные выводы о вашем здоровье",
    detail: "Краткий обзор всех ключевых показателей, биологический возраст и общая оценка состояния организма",
    icon: FileText,
    color: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-500/10 to-cyan-500/10",
    borderColor: "border-blue-500/30",
    accentColor: "text-blue-400",
  },
  {
    title: "Анализ систем",
    description: "Детальный разбор 5 систем организма",
    detail: "Сердечно-сосудистая, иммунная, эндокринная, метаболическая и нервная системы — оценка каждой по 100-балльной шкале",
    icon: Activity,
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500/30",
    accentColor: "text-purple-400",
  },
  {
    title: "Биомаркеры",
    description: "Расшифровка каждого показателя",
    detail: "Все 85+ маркеров с визуальными шкалами, пояснениями простым языком и сравнением с оптимальными значениями",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    bgColor: "from-amber-500/10 to-orange-500/10",
    borderColor: "border-amber-500/30",
    accentColor: "text-amber-400",
  },
  {
    title: "Зоны риска",
    description: "Карта проблемных областей",
    detail: "Стратегическая дорожная карта: что требует внимания сейчас, в ближайшие месяцы и в долгосрочной перспективе",
    icon: AlertTriangle,
    color: "from-rose-500 to-red-500",
    bgColor: "from-rose-500/10 to-red-500/10",
    borderColor: "border-rose-500/30",
    accentColor: "text-rose-400",
  },
  {
    title: "Назначения",
    description: "Конкретные действия для улучшения",
    detail: "Персональный план: витамины, минералы, питание, обследования — с дозировками, формой приёма и длительностью",
    icon: ClipboardList,
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-500/10 to-teal-500/10",
    borderColor: "border-emerald-500/30",
    accentColor: "text-emerald-400",
  },
];

const reportFeatures = [
  {
    icon: FileText,
    title: "Подробная расшифровка анализов",
    description: "Разбираем показатели простым языком и объясняем их влияние на организм ",
  },
  {
    icon: TrendingUp,
    title: "Связи между показателями",
    description: "Показываем, как анализы влияют друг на друга и что это означает для здоровья",
  },
  {
    icon: Target,
    title: "Инсайты о состоянии организма",
    description: "Объясняем сильные и слабые стороны организма, выявляем потенциальные риски ",
  },
  {
    icon: Pill,
    title: "Биологический возраст",
    description: "Рассчитываем ваш биологический возраст и показываем факторы, ускоряющие старение",
  },
  {
    icon: CheckCircle2,
    title: "Конкретные рекомендации врача",
    description: "Персональный план действий: подбор витаминов и минералов, рекомендации по питанию и дополнительным обследованиям",
  },
];

export function ReportShowcaseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePage = reportPages[activeIndex];
  const ActiveIcon = activePage.icon;

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          <Badge className="mb-6 px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            Что я получу?
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Ваш </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              персональный отчёт на понятном языке
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Дорожная карта вашего здоровья: расшифровка всех показателей и персональные рекомендации нашего врача
          </p>
        </div>

        {/* Tabs row */}
        <div className="flex gap-1.5 mb-8 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:justify-center">
          {reportPages.map((page, index) => {
            const Icon = page.icon;
            const isActive = index === activeIndex;
            return (
              <button
                key={page.title}
                onClick={() => setActiveIndex(index)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0 ${
                  isActive
                    ? `bg-gradient-to-r ${page.color} text-white shadow-lg`
                    : "bg-card/60 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="w-4 h-4" />
                {page.title}
              </button>
            );
          })}
        </div>

        {/* Active tab content card */}
        <div
          key={activeIndex}
          className={`rounded-2xl border ${activePage.borderColor} bg-gradient-to-br ${activePage.bgColor} backdrop-blur-sm p-6 md:p-10 mb-16 animate-fade-in`}
        >
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Left info — 2 cols */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${activePage.color} flex items-center justify-center shadow-lg`}>
                  <ActiveIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{activePage.title}</h3>
                  <p className="text-sm text-muted-foreground">{activePage.description}</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">{activePage.detail}</p>
              <Badge variant="outline" className="text-xs border-border/50">
                Раздел {activeIndex + 1} из {reportPages.length}
              </Badge>
            </div>

            {/* Right mockup — 3 cols */}
            <div className="lg:col-span-3">
              <div className="bg-background/40 rounded-xl border border-border/30 p-5 md:p-6">
                {/* Mock header */}
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/20">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activePage.color} flex items-center justify-center`}>
                    <ActiveIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="h-3 bg-foreground/15 rounded-full w-32" />
                  <div className="ml-auto h-3 bg-foreground/10 rounded-full w-16" />
                </div>
                {/* Mock content */}
                <div className="space-y-3">
                  <div className="h-3 bg-foreground/10 rounded-full w-full" />
                  <div className="h-3 bg-foreground/10 rounded-full w-4/5" />
                  <div className="h-3 bg-foreground/10 rounded-full w-3/4" />
                  <div className="h-10 bg-primary/8 rounded-lg w-full mt-5" />
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="h-16 bg-foreground/5 rounded-lg" />
                    <div className="h-16 bg-foreground/5 rounded-lg" />
                    <div className="h-16 bg-foreground/5 rounded-lg" />
                  </div>
                  <div className="h-3 bg-foreground/10 rounded-full w-5/6 mt-4" />
                  <div className="h-3 bg-foreground/10 rounded-full w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features + CTA grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="grid gap-3">
            {reportFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm animate-fade-in hover:bg-card/80 transition-colors"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <span className="font-semibold">Хотите увидеть пример?</span>
              </div>
              <p className="text-muted-foreground mb-6">
                Скачайте образец отчёта и убедитесь в качестве нашего сервиса
              </p>
              <a href="/sample-report.pdf" target="_blank" rel="noopener noreferrer" className="inline-block w-full">
                <Button size="lg" className="w-full group">
                  <FileDown className="w-5 h-5 mr-2" />
                  Скачать пример отчёта (PDF)
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
