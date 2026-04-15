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
  ChevronDown,
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
  },
  {
    title: "Анализ систем",
    description: "Детальный разбор 5 систем организма",
    detail: "Сердечно-сосудистая, иммунная, эндокринная, метаболическая и нервная системы — оценка каждой по 100-балльной шкале",
    icon: Activity,
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    title: "Биомаркеры",
    description: "Расшифровка каждого показателя",
    detail: "Все 85+ маркеров с визуальными шкалами, пояснениями простым языком и сравнением с оптимальными значениями",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    bgColor: "from-amber-500/10 to-orange-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    title: "Зоны риска",
    description: "Карта проблемных областей",
    detail: "Стратегическая дорожная карта: что требует внимания сейчас, в ближайшие месяцы и в долгосрочной перспективе",
    icon: AlertTriangle,
    color: "from-rose-500 to-red-500",
    bgColor: "from-rose-500/10 to-red-500/10",
    borderColor: "border-rose-500/30",
  },
  {
    title: "Персональные назначения",
    description: "Конкретные действия для улучшения",
    detail: "Персональный план: витамины, минералы, питание, обследования — с дозировками, формой приёма и длительностью",
    icon: ClipboardList,
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-500/10 to-teal-500/10",
    borderColor: "border-emerald-500/30",
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
  const [openIndex, setOpenIndex] = useState(0);

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

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
          {/* Left: Accordion */}
          <div className="space-y-3">
            {reportPages.map((page, index) => {
              const Icon = page.icon;
              const isOpen = index === openIndex;

              return (
                <div
                  key={page.title}
                  className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? `${page.borderColor} bg-gradient-to-br ${page.bgColor}`
                      : "border-border/40 bg-card/40 hover:bg-card/60"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full flex items-center gap-4 p-4 text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen
                          ? `bg-gradient-to-br ${page.color} text-white shadow-lg`
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold transition-colors ${isOpen ? "text-foreground" : "text-muted-foreground"}`}>
                        {page.title}
                      </h4>
                      {!isOpen && (
                        <p className="text-xs text-muted-foreground/70 truncate">{page.description}</p>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`transition-all duration-300 ease-out ${
                      isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-4 pb-5">
                      <p className="text-sm text-muted-foreground mb-4 pl-14">
                        {page.detail}
                      </p>

                      {/* Mini mockup */}
                      <div className="ml-14 bg-background/40 rounded-lg border border-border/20 p-4">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/15">
                          <div className={`w-6 h-6 rounded bg-gradient-to-br ${page.color} flex items-center justify-center`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <div className="h-2 bg-foreground/12 rounded-full w-20" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-foreground/8 rounded-full w-full" />
                          <div className="h-2 bg-foreground/8 rounded-full w-4/5" />
                          <div className="h-2 bg-foreground/8 rounded-full w-3/5" />
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="h-10 bg-foreground/5 rounded" />
                            <div className="h-10 bg-foreground/5 rounded" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

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
