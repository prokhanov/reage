import { Check, Sparkles, ArrowRight, FlaskConical, CalendarCheck, UserCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BiomarkerCategory {
  emoji: string;
  name: string;
  markers: string[];
}

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  biomarkers: string;
  analyses: string;
  consultations: string;
  biomarkersBySystem: BiomarkerCategory[];
  glowColor?: string;
  isPopular?: boolean;
  badge?: string;
  delay: number;
}

function PricingCard({ name, price, period, description, biomarkers, analyses, consultations, biomarkersBySystem, glowColor, isPopular, badge, delay }: PricingCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="group relative h-full animate-fade-in"
      style={{ animationDelay: `${delay}s` }}>
      
      <div className="absolute -inset-0.5 rounded-3xl opacity-50 blur-xl" style={{ background: glowColor }} />
      
      <div className="relative h-full rounded-3xl border border-primary/30 p-8 transition-all duration-500 flex flex-col bg-gradient-to-b from-card to-card/80 shadow-2xl shadow-primary/10">

        {badge &&
        <div className={`
            absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold
            ${isPopular ?
        "bg-gradient-to-r from-primary to-accent text-white" :
        "bg-muted text-muted-foreground"}
          `}>
            {badge}
          </div>
        }
        
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-foreground mb-4">{name}</h3>
          
          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold whitespace-nowrap ${isPopular ? "bg-gradient-hero bg-clip-text text-transparent" : "text-foreground"}`}>
              {price}
            </span>
            <span className="text-muted-foreground whitespace-nowrap">/{period}</span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="space-y-3 mb-6">
          <BiomarkersMetricRow biomarkers={biomarkers} biomarkersBySystem={biomarkersBySystem} isPopular={isPopular} />
          <MetricRow icon={<CalendarCheck className="w-4 h-4" />} label="Анализов" value={analyses} isPopular={isPopular} />
          <MetricRow icon={<UserCheck className="w-4 h-4" />} label="Консультаций" value={`${consultations} в год`} isPopular={isPopular} />
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1">{description}</p>
        
        <Button
          className={`w-full ${isPopular ? "shadow-neon-primary" : ""}`}
          variant={isPopular ? "default" : "outline"}
          size="lg"
          onClick={() => navigate("/register")}>
          Выбрать план
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>);
}

function BiomarkersMetricRow({ biomarkers, biomarkersBySystem, isPopular }: {biomarkers: string;biomarkersBySystem: BiomarkerCategory[];isPopular?: boolean;}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border/30 hover:border-primary/40 hover:bg-muted/80 transition-colors cursor-pointer text-left">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FlaskConical className="w-4 h-4" />
            <span>Биомаркеров</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${isPopular ? "text-primary" : "text-foreground"}`}>{biomarkers}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="center">
        <h4 className="text-sm font-semibold text-foreground mb-3">Биомаркеры по системам</h4>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {biomarkersBySystem.map((cat, i) =>
          <div key={i}>
              <div className="flex items-center gap-2 mb-1.5">
                <span>{cat.emoji}</span>
                <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                <span className="text-xs text-muted-foreground">({cat.markers.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cat.markers.map((m, j) =>
              <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/50 text-muted-foreground">{m}</span>
              )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>);

}

function MetricRow({ icon, label, value, isPopular }: {icon: React.ReactNode;label: string;value: string;isPopular?: boolean;}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-bold ${isPopular ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>);

}

const standardBiomarkers: BiomarkerCategory[] = [
{ emoji: "⚡", name: "Энергия и восстановление", markers: ["Глюкоза", "Гемоглобин", "Ферритин", "Витамин B12", "Фолиевая кислота", "Железо"] },
{ emoji: "❤️", name: "Сердечно-сосудистая система", markers: ["Холестерин общий", "ЛПНП", "ЛПВП", "Триглицериды", "АСТ", "АЛТ"] },
{ emoji: "🛡️", name: "Воспаление и иммунитет", markers: ["СОЭ", "Лейкоциты", "С-реактивный белок", "Нейтрофилы"] },
{ emoji: "🧬", name: "Эндокринная система", markers: ["ТТГ", "Т4 свободный", "Кортизол", "Инсулин"] },
{ emoji: "🔄", name: "Обмен веществ и детоксикация", markers: ["Креатинин", "Мочевина", "Билирубин общий", "Общий белок", "Альбумин", "Мочевая кислота", "ГГТ", "Щелочная фосфатаза", "Калий", "Натрий"] }];


const plusBiomarkers: BiomarkerCategory[] = [
{ emoji: "⚡", name: "Энергия и восстановление", markers: ["Глюкоза", "Гемоглобин", "Ферритин", "Витамин B12", "Фолиевая кислота", "Железо", "Витамин D", "Магний", "Цинк"] },
{ emoji: "❤️", name: "Сердечно-сосудистая система", markers: ["Холестерин общий", "ЛПНП", "ЛПВП", "Триглицериды", "АСТ", "АЛТ", "Аполипопротеин B", "Липопротеин(а)", "Гомоцистеин"] },
{ emoji: "🛡️", name: "Воспаление и иммунитет", markers: ["СОЭ", "Лейкоциты", "С-реактивный белок", "Нейтрофилы", "Интерлейкин-6", "Фибриноген"] },
{ emoji: "🧬", name: "Эндокринная система", markers: ["ТТГ", "Т4 свободный", "Т3 свободный", "Кортизол", "Инсулин", "ДГЭА-сульфат", "Тестостерон общий", "ГСПГ"] },
{ emoji: "🔄", name: "Обмен веществ и детоксикация", markers: ["Креатинин", "Мочевина", "Билирубин общий", "Общий белок", "Альбумин", "Мочевая кислота", "ГГТ", "Щелочная фосфатаза", "Калий", "Натрий", "Трансферрин", "ОЖСС", "HbA1c"] }];


const premiumBiomarkers: BiomarkerCategory[] = [
{ emoji: "⚡", name: "Энергия и восстановление", markers: ["Глюкоза", "Гемоглобин", "Ферритин", "Витамин B12", "Фолиевая кислота", "Железо", "Витамин D", "Магний", "Цинк", "Коэнзим Q10", "Селен", "Медь"] },
{ emoji: "❤️", name: "Сердечно-сосудистая система", markers: ["Холестерин общий", "ЛПНП", "ЛПВП", "Триглицериды", "АСТ", "АЛТ", "Аполипопротеин B", "Липопротеин(а)", "Гомоцистеин", "NT-proBNP", "hs-CRP", "Фосфолипиды"] },
{ emoji: "🛡️", name: "Воспаление и иммунитет", markers: ["СОЭ", "Лейкоциты", "С-реактивный белок", "Нейтрофилы", "Интерлейкин-6", "Фибриноген", "TNF-α", "Иммуноглобулин G", "Иммуноглобулин A"] },
{ emoji: "🧬", name: "Эндокринная система", markers: ["ТТГ", "Т4 свободный", "Т3 свободный", "Кортизол", "Инсулин", "ДГЭА-сульфат", "Тестостерон общий", "ГСПГ", "Эстрадиол", "Прогестерон", "ИФР-1", "Мелатонин"] },
{ emoji: "🔄", name: "Обмен веществ и детоксикация", markers: ["Креатинин", "Мочевина", "Билирубин общий", "Общий белок", "Альбумин", "Мочевая кислота", "ГГТ", "Щелочная фосфатаза", "Калий", "Натрий", "Трансферрин", "ОЖСС", "HbA1c", "Глутатион", "8-OHdG", "МДА"] }];


export function PricingSection() {
  const plans = [
  {
    name: "Базовый",
    price: "75 000₽",
    period: "год",
    description: "Базовый, но умный чек-ап. 46 показателей крови и мочи, которые показывают, как работает обмен веществ, сердце, печень, почки, гормоны и воспаление. Подходит для регулярного трекинга здоровья и раннего выявления рисков — до появления симптомов.",
    badge: "Старт",
    biomarkers: "30",
    analyses: "2 раза в год",
    consultations: "3",
    biomarkersBySystem: standardBiomarkers,
    glowColor: "linear-gradient(135deg, hsl(175, 70%, 55%), hsl(165, 65%, 50%))",
    delay: 0.1
  },
  {
    name: "Плюс",
    price: "135 000₽",
    period: "год",
    description: "Углублённый уровень поверх Стандарта. Добавляет расширенную оценку сердечно-сосудистых рисков, дефицитов, гормонального баланса и обмена железа — для более точного понимания причин усталости, снижения энергии и скрытых рисков.",
    badge: "Популярный",
    isPopular: true,
    biomarkers: "50",
    analyses: "3 раза в год",
    consultations: "4",
    biomarkersBySystem: plusBiomarkers,
    glowColor: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
    delay: 0.2
  },
  {
    name: "Премиум",
    price: "220 000₽",
    period: "год",
    description: "Максимальный уровень глубины анализа. Дополняет Стандарт и Плюс оценкой митохондриальной функции, окислительного стресса, низкоуровневого воспаления и ранних изменений со стороны сердца — для тех, кто хочет понимать процессы старения на самом глубоком уровне.",
    badge: "VIP",
    biomarkers: "70+",
    analyses: "4 раза в год",
    consultations: "6",
    biomarkersBySystem: premiumBiomarkers,
    glowColor: "linear-gradient(135deg, hsl(210, 75%, 60%), hsl(220, 70%, 55%))",
    delay: 0.3
  }];


  return (
    <section className="relative py-20 md:py-28 overflow-visible">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Выберите свой </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              план мониторинга
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Годовая подписка с регулярными анализами.             
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) =>
          <PricingCard key={index} {...plan} />
          )}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-12 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <TrustBadge icon="🔒" text="Безопасная оплата" />
          <TrustBadge icon="↩️" text="Возврат за 14 дней" />
          
        </div>
      </div>
    </section>);

}

function TrustBadge({ icon, text }: {icon: string;text: string;}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
      <span>{icon}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>);

}