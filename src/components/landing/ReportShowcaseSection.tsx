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
    icon: FileText,
    color: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
  },
  {
    title: "Анализ систем",
    description: "Детальный разбор 5 систем организма",
    icon: Activity,
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
  },
  {
    title: "Биомаркеры",
    description: "Расшифровка каждого показателя",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    bgColor: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
  },
  {
    title: "Зоны риска",
    description: "Карта проблемных областей",
    icon: AlertTriangle,
    color: "from-rose-500 to-red-500",
    bgColor: "from-rose-500/20 to-red-500/20",
    borderColor: "border-rose-500/30",
  },
  {
    title: "Персональные назначения",
    description: "Конкретные действия для улучшения",
    icon: ClipboardList,
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
  },
];

const reportFeatures = [
  {
    icon: FileText,
    title: "Подробная расшифровка анализов",
    description:
      "Разбираем показатели простым языком и объясняем их влияние на организм ",
  },
  {
    icon: TrendingUp,
    title: "Связи между показателями",
    description:
      "Показываем, как анализы влияют друг на друга и что это означает для здоровья",
  },
  {
    icon: Target,
    title: "Инсайты о состоянии организма",
    description:
      "Объясняем сильные и слабые стороны организма, выявляем потенциальные риски ",
  },
  {
    icon: Pill,
    title: "Биологический возраст",
    description:
      "Рассчитываем ваш биологический возраст и показываем факторы, ускоряющие старение",
  },
  {
    icon: CheckCircle2,
    title: "Конкретные рекомендации врача",
    description:
      "Персональный план действий: подбор витаминов и минералов, рекомендации по питанию и дополнительным обследованиям",
  },
];

export function ReportShowcaseSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const activePage = reportPages[activeIndex];
  const ActiveIcon = activePage.icon;

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background effects */}
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
            Дорожная карта вашего здоровья: расшифровка всех показателей и
            персональные рекомендации нашего врача
          </p>
        </div>

        {/* Timeline stepper */}
        <div className="mb-12 md:mb-16">
          {/* Desktop: horizontal timeline */}
          <div className="hidden md:flex items-start justify-between relative max-w-4xl mx-auto">
            {/* Connecting line */}
            <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-border/50" />
            <div
              className="absolute top-6 left-[10%] h-0.5 bg-gradient-to-r from-primary to-primary/50 transition-all duration-500"
              style={{
                width: `${(activeIndex / (reportPages.length - 1)) * 80}%`,
              }}
            />

            {reportPages.map((page, index) => {
              const Icon = page.icon;
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;

              return (
                <button
                  key={page.title}
                  onClick={() => setActiveIndex(index)}
                  className="flex flex-col items-center gap-3 relative z-10 group w-[18%]"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-br ${page.color} text-white shadow-lg shadow-primary/20 scale-110`
                        : isPast
                        ? "bg-primary/20 text-primary"
                        : "bg-card border border-border/50 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {page.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile: horizontal scroll pills */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {reportPages.map((page, index) => {
              const Icon = page.icon;
              const isActive = index === activeIndex;

              return (
                <button
                  key={page.title}
                  onClick={() => setActiveIndex(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-card/80 border border-border/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {page.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left: Active page preview */}
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/15 rounded-full blur-2xl" />

            <div
              key={activeIndex}
              className={`relative bg-gradient-to-br ${activePage.bgColor} backdrop-blur-sm border ${activePage.borderColor} rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in`}
            >
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/30">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${activePage.color} flex items-center justify-center shadow-lg`}
                >
                  <ActiveIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{activePage.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {activePage.description}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="ml-auto text-xs border-border/50"
                >
                  Стр. {activeIndex + 1} / {reportPages.length}
                </Badge>
              </div>

              {/* Content mockup */}
              <div className="space-y-4">
                <div className="h-3 bg-foreground/10 rounded-full w-full" />
                <div className="h-3 bg-foreground/10 rounded-full w-4/5" />
                <div className="h-3 bg-foreground/10 rounded-full w-3/4" />
                <div className="h-10 bg-primary/10 rounded-lg w-full mt-6" />
                <div className="h-3 bg-foreground/10 rounded-full w-5/6" />
                <div className="h-3 bg-foreground/10 rounded-full w-2/3" />
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="h-20 bg-foreground/5 rounded-lg" />
                  <div className="h-20 bg-foreground/5 rounded-lg" />
                </div>
                <div className="h-3 bg-foreground/10 rounded-full w-3/5 mt-4" />
                <div className="h-3 bg-foreground/10 rounded-full w-4/5" />
              </div>
            </div>
          </div>

          {/* Right: Features and CTA */}
          <div className="space-y-8">
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
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Download CTA */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <span className="font-semibold">Хотите увидеть пример?</span>
              </div>
              <p className="text-muted-foreground mb-6">
                Скачайте образец отчёта и убедитесь в качестве нашего сервиса
              </p>
              <a
                href="/sample-report.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full"
              >
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
