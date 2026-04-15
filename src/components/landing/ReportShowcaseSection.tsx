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
  ChevronLeft,
  ChevronRight } from
"lucide-react";

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
}];


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
}];


export function ReportShowcaseSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => prev === 0 ? reportPages.length - 1 : prev - 1);
  };

  const handleNext = () => {
    setActiveIndex((prev) => prev === reportPages.length - 1 ? 0 : prev + 1);
  };

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
          {/* Left: Report mockups with carousel */}
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/15 rounded-full blur-2xl" />
            
            {/* Stacked report pages with animation */}
            <div className="relative h-[350px] md:h-[450px] flex items-center justify-center">
              {reportPages.map((page, index) => {// Calculate position relative to active index
                const position = (index - activeIndex + reportPages.length) % reportPages.length;

                return (
                  <div
                    key={page.title}
                    className={`absolute bg-gradient-to-br ${page.color} backdrop-blur-sm border ${page.borderColor} rounded-2xl p-4 md:p-6 shadow-2xl transition-all duration-500 ease-out cursor-pointer w-[220px] h-[300px] md:w-[280px] md:h-[380px]`}
                    style={{
                      transform: `
                        translateX(${position * 20}px) 
                        translateY(${position * -10}px) 
                        rotate(${-3 + position * 3}deg)
                        scale(${1 - position * 0.05})
                      `,
                      zIndex: reportPages.length - position,
                      opacity: position === 0 ? 1 : 0.7 - position * 0.15
                    }}
                    onClick={() => setActiveIndex(index)}>
                    
                    <div className="h-full flex flex-col">
                      {/* Page header mockup */}
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/30">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{page.title}</h4>
                          <p className="text-xs text-muted-foreground">{page.description}</p>
                        </div>
                      </div>
                      
                      {/* Content lines mockup */}
                      <div className="flex-1 space-y-3">
                        <div className="h-3 bg-foreground/10 rounded-full w-full" />
                        <div className="h-3 bg-foreground/10 rounded-full w-4/5" />
                        <div className="h-3 bg-foreground/10 rounded-full w-3/4" />
                        <div className="h-8 bg-primary/10 rounded-lg w-full mt-4" />
                        <div className="h-3 bg-foreground/10 rounded-full w-5/6" />
                        <div className="h-3 bg-foreground/10 rounded-full w-2/3" />
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="h-16 bg-foreground/5 rounded-lg" />
                          <div className="h-16 bg-foreground/5 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </div>);

              })}
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full bg-card/80 border border-border/50 backdrop-blur-sm flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group">
                
                <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              
              {/* Dots indicator */}
              <div className="flex items-center gap-2">
                {reportPages.map((_, index) =>
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex ?
                  'w-6 bg-primary' :
                  'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`
                  } />

                )}
              </div>
              
              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full bg-card/80 border border-border/50 backdrop-blur-sm flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group">
                
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
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
                    style={{ animationDelay: `${index * 100}ms` }}>
                    
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>);

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
                className="inline-block w-full">
                
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
    </section>);

}