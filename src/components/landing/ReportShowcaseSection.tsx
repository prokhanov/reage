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
    bgColor: "from-blue-500/15 to-cyan-500/10",
    borderColor: "border-blue-500/25",
    span: "md:col-span-2 md:row-span-2",
  },
  {
    title: "Анализ систем",
    description: "Детальный разбор 5 систем организма",
    icon: Activity,
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-500/15 to-pink-500/10",
    borderColor: "border-purple-500/25",
    span: "md:col-span-1",
  },
  {
    title: "Биомаркеры",
    description: "Расшифровка каждого показателя",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    bgColor: "from-amber-500/15 to-orange-500/10",
    borderColor: "border-amber-500/25",
    span: "md:col-span-1",
  },
  {
    title: "Зоны риска",
    description: "Карта проблемных областей",
    icon: AlertTriangle,
    color: "from-rose-500 to-red-500",
    bgColor: "from-rose-500/15 to-red-500/10",
    borderColor: "border-rose-500/25",
    span: "md:col-span-1",
  },
  {
    title: "Назначения",
    description: "Конкретные действия для улучшения",
    icon: ClipboardList,
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-500/15 to-teal-500/10",
    borderColor: "border-emerald-500/25",
    span: "md:col-span-1",
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16 max-w-5xl mx-auto">
          {reportPages.map((page, index) => {
            const Icon = page.icon;
            const isHovered = hoveredIndex === index;
            const isLarge = index === 0;

            return (
              <div
                key={page.title}
                className={`${page.span} group relative rounded-2xl border ${page.borderColor} bg-gradient-to-br ${page.bgColor} backdrop-blur-sm p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-default overflow-hidden`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${page.color} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 rounded-2xl`} />

                <div className="relative z-10 h-full flex flex-col">
                  {/* Icon + number */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${page.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-foreground/10 group-hover:text-foreground/20 transition-colors">
                      0{index + 1}
                    </span>
                  </div>

                  {/* Text */}
                  <h3 className={`font-bold mb-2 ${isLarge ? "text-xl" : "text-lg"}`}>{page.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{page.description}</p>

                  {/* Mock content — bigger for the first card */}
                  {isLarge ? (
                    <div className="flex-1 mt-2 space-y-3">
                      <div className="h-2.5 bg-foreground/8 rounded-full w-full" />
                      <div className="h-2.5 bg-foreground/8 rounded-full w-4/5" />
                      <div className="h-2.5 bg-foreground/8 rounded-full w-3/5" />
                      <div className="h-8 bg-primary/8 rounded-lg w-full mt-4" />
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="h-14 bg-foreground/5 rounded-lg" />
                        <div className="h-14 bg-foreground/5 rounded-lg" />
                      </div>
                      <div className="h-2.5 bg-foreground/8 rounded-full w-5/6 mt-3" />
                      <div className="h-2.5 bg-foreground/8 rounded-full w-2/3" />
                    </div>
                  ) : (
                    <div className="flex-1 mt-auto space-y-2">
                      <div className="h-2 bg-foreground/8 rounded-full w-full" />
                      <div className="h-2 bg-foreground/8 rounded-full w-3/4" />
                      <div className="h-6 bg-foreground/5 rounded mt-3" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Features + CTA */}
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
