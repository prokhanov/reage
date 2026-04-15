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
  ArrowRight
} from "lucide-react";

const reportPages = [
  {
    title: "Общее резюме",
    description: "Главные выводы о вашем здоровье",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30"
  },
  {
    title: "Анализ систем",
    description: "Детальный разбор 5 систем организма",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30"
  },
  {
    title: "Биомаркеры",
    description: "Расшифровка каждого показателя",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30"
  },
  {
    title: "Зоны риска",
    description: "Карта проблемных областей",
    color: "from-rose-500/20 to-red-500/20",
    borderColor: "border-rose-500/30"
  },
  {
    title: "Персональные назначения",
    description: "Конкретные действия для улучшения",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30"
  }
];

const reportFeatures = [
  {
    icon: FileText,
    title: "Подробная расшифровка анализов",
    description: "Разбираем показатели простым языком и объясняем их влияние на организм "
  },
  {
    icon: TrendingUp,
    title: "Связи между показателями",
    description: "Показываем, как анализы влияют друг на друга и что это означает для здоровья"
  },
  {
    icon: Target,
    title: "Инсайты о состоянии организма",
    description: "Объясняем сильные и слабые стороны организма, выявляем потенциальные риски "
  },
  {
    icon: Pill,
    title: "Биологический возраст",
    description: "Рассчитываем ваш биологический возраст и показываем факторы, ускоряющие старение"
  },
  {
    icon: CheckCircle2,
    title: "Конкретные рекомендации врача",
    description: "Персональный план действий: подбор витаминов и минералов, рекомендации по питанию и дополнительным обследованиям"
  }
];

export function ReportShowcaseSection() {
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
            Дорожная карта вашего здоровья: расшифровка всех показателей и персональные рекомендации нашего врача
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left: Static report sections list */}
          <div className="space-y-3">
            {reportPages.map((page, index) => (
              <div
                key={page.title}
                className={`flex gap-4 p-5 rounded-2xl bg-gradient-to-br ${page.color} border ${page.borderColor} backdrop-blur-sm animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{page.title}</h4>
                  <p className="text-sm text-muted-foreground">{page.description}</p>
                </div>
              </div>
            ))}
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
