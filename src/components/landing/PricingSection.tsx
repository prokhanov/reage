import { Check, Sparkles, ArrowRight, FlaskConical, CalendarCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PricingCardProps {
  name: string;
  price: string;
  yearPrice: string;
  period: string;
  description: string;
  biomarkers: string;
  analyses: string;
  consultations: string;
  extras: string[];
  isPopular?: boolean;
  badge?: string;
  delay: number;
}

function PricingCard({ name, price, yearPrice, period, description, biomarkers, analyses, consultations, extras, isPopular, badge, delay }: PricingCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`
        group relative h-full animate-fade-in
        ${isPopular ? "md:-mt-4 md:mb-4" : ""}
      `}
      style={{ animationDelay: `${delay}s` }}>
      
      {isPopular &&
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-primary via-accent to-primary opacity-50 blur-xl" />
      }
      
      <div className={`
        relative h-full rounded-3xl border p-8 transition-all duration-500
        ${isPopular ?
      "bg-gradient-to-b from-card to-card/80 border-primary/50 shadow-2xl shadow-primary/20" :
      "bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:bg-card/80"}
      `}>
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
          <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          
          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-4xl md:text-5xl font-bold ${isPopular ? "bg-gradient-hero bg-clip-text text-transparent" : "text-foreground"}`}>
              {price}
            </span>
            <span className="text-muted-foreground">/{period}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">(или {yearPrice}/год)</p>
        </div>

        {/* Key metrics */}
        <div className="space-y-3 mb-6">
          <MetricRow icon={<FlaskConical className="w-4 h-4" />} label="Биомаркеров" value={biomarkers} isPopular={isPopular} />
          <MetricRow icon={<CalendarCheck className="w-4 h-4" />} label="Анализов" value={analyses} isPopular={isPopular} />
          <MetricRow icon={<UserCheck className="w-4 h-4" />} label="Консультаций" value={`${consultations} в год`} isPopular={isPopular} />
        </div>

        <div className="border-t border-border/50 my-6" />
        
        {/* Extras */}
        <ul className="space-y-3 mb-8">
          {extras.map((feature, index) =>
          <li key={index} className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isPopular ? "bg-primary/20" : "bg-muted"}`}>
                <Check className={`w-3 h-3 ${isPopular ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          )}
        </ul>
        
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

function MetricRow({ icon, label, value, isPopular }: { icon: React.ReactNode; label: string; value: string; isPopular?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-bold ${isPopular ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function PricingSection() {
  const plans = [
  {
    name: "Standard",
    price: "10 000₽",
    yearPrice: "120 000₽",
    period: "мес",
    description: "Базовый мониторинг здоровья",
    badge: "Старт",
    biomarkers: "30",
    analyses: "2 раза в год",
    consultations: "3",
    extras: [
    "Биологический возраст",
    "AI-рекомендации",
    "Личный кабинет",
    "Забор крови на дому"],
    delay: 0.1
  },
  {
    name: "Plus",
    price: "13 300₽",
    yearPrice: "160 000₽",
    period: "мес",
    description: "Расширенный мониторинг",
    badge: "Популярный",
    isPopular: true,
    biomarkers: "50",
    analyses: "3 раза в год",
    consultations: "4",
    extras: [
    "Биологический возраст + тренды",
    "Полные AI-рекомендации",
    "AI-ассистент 24/7",
    "Приоритетная поддержка"],
    delay: 0.2
  },
  {
    name: "Premium",
    price: "20 000₽",
    yearPrice: "240 000₽",
    period: "мес",
    description: "Максимальный контроль",
    badge: "VIP",
    biomarkers: "70+",
    analyses: "4 раза в год",
    consultations: "6",
    extras: [
    "Расширенные панели биомаркеров",
    "Персональный менеджер",
    "Экспресс-результаты (3 дня)",
    "Семейный доступ (до 2 чел.)"],
    delay: 0.3
  }];


  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Прозрачные цены</span>
          </div>
          
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
          <TrustBadge icon="📞" text="Поддержка 24/7" />
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