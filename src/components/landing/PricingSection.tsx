import { Check, Sparkles, ArrowRight, FlaskConical, CalendarCheck, UserCheck, ChevronDown, Heart, Shield, RefreshCw, Zap, Droplet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BiomarkerComparisonDialog } from "./BiomarkerComparisonDialog";

// Helper to wrap raw SVG paths into a Lucide-compatible icon
const makeIcon = (paths: React.ReactNode): LucideIcon =>
  (({ className, strokeWidth = 2, color = "currentColor", size = 24, ...props }: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths}
    </svg>
  )) as unknown as LucideIcon;

// Молекула гормона — иконка эндокринной системы (как в "Что мы измеряем")
const HormoneMoleculeIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="5" cy="6" r="1.5" />
    <circle cx="19" cy="6" r="1.5" />
    <circle cx="5" cy="18" r="1.5" />
    <circle cx="19" cy="18" r="1.5" />
    <path d="M6.2 7.1l3.8 3.5" />
    <path d="M17.8 7.1l-3.8 3.5" />
    <path d="M6.2 16.9l3.8-3.5" />
    <path d="M17.8 16.9l-3.8-3.5" />
  </>
);

interface BiomarkerCategory {
  icon: LucideIcon;
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
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1 whitespace-pre-line">{description}</p>
        
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
                <cat.icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
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

// Источник синхронизирован с BiomarkerComparisonDialog (тарифная таблица ReAge).
const ENERGY_BASIC = ["Глюкоза", "HbA1c", "Инсулин", "HOMA-IR", "ЛДГ", "Альбумин", "Магний", "КФК"];
const ENERGY_PLUS_ADD = ["Витамин B12", "Фолиевая кислота (B9)", "Цинк", "Селен"];
const ENERGY_EXPERT_ADD = ["Лактат", "Коэнзим Q10", "MDA", "Общий антиоксидантный статус", "Индекс MDA/OAS"];

const CV_BASIC = ["Общий холестерин", "ЛПВП", "ЛПНП", "Триглицериды", "ЛПОНП", "не-HDL холестерин", "Индекс атерогенности", "Ферритин"];
const CV_PLUS_ADD = ["ApoA1", "ApoB", "ApoB/ApoA1", "Гомоцистеин", "Lp(a)", "Железо", "Медь"];
const CV_EXPERT_ADD = ["hs-Troponin I", "NT-proBNP"];

const INFL_BASIC = ["Эритроциты", "Гемоглобин", "Гематокрит", "MCV", "MCH", "MCHC", "RDW", "Тромбоциты", "Лейкоциты", "Нейтрофилы", "Лимфоциты", "Моноциты", "Эозинофилы", "Базофилы", "СОЭ", "hs-CRP"];
const INFL_PLUS_ADD = ["IgM", "IgG"];
const INFL_EXPERT_ADD = ["IL-6", "TNF-α"];

const ENDO_BASIC = ["ТТГ", "Т4 свободный", "25-ОН витамин D"];
const ENDO_PLUS_ADD = ["Т3 свободный", "Тестостерон общий", "SHBG", "Кортизол", "DHEA-S"];
const ENDO_EXPERT_ADD = ["IGF-1"];

const DETOX_BASIC = ["АЛТ", "АСТ", "ГГТ", "Билирубин", "Щелочная фосфатаза", "Общий белок", "Креатинин", "eGFR", "Мочевина", "Натрий", "Калий", "Хлор", "Кальций", "Общий анализ мочи", "Мочевая кислота", "Альбумин/креатинин мочи"];
const DETOX_PLUS_ADD = ["Трансферрин", "Насыщение трансферрина"];

const HEMO_BASIC = ["Фибриноген"];
const HEMO_PLUS_ADD = ["ПТИ", "МНО", "АЧТВ"];

const standardBiomarkers: BiomarkerCategory[] = [
  { icon: Zap, name: "Энергия и обмен", markers: ENERGY_BASIC },
  { icon: Heart, name: "Сердечно-сосудистая", markers: CV_BASIC },
  { icon: Shield, name: "Воспаление и иммунитет", markers: INFL_BASIC },
  { icon: HormoneMoleculeIcon, name: "Эндокринная система", markers: ENDO_BASIC },
  { icon: RefreshCw, name: "Обмен и детоксикация", markers: DETOX_BASIC },
  { icon: Droplet, name: "Гемостаз", markers: HEMO_BASIC },
];

const plusBiomarkers: BiomarkerCategory[] = [
  { icon: Zap, name: "Энергия и обмен", markers: [...ENERGY_BASIC, ...ENERGY_PLUS_ADD] },
  { icon: Heart, name: "Сердечно-сосудистая", markers: [...CV_BASIC, ...CV_PLUS_ADD] },
  { icon: Shield, name: "Воспаление и иммунитет", markers: [...INFL_BASIC, ...INFL_PLUS_ADD] },
  { icon: HormoneMoleculeIcon, name: "Эндокринная система", markers: [...ENDO_BASIC, ...ENDO_PLUS_ADD] },
  { icon: RefreshCw, name: "Обмен и детоксикация", markers: [...DETOX_BASIC, ...DETOX_PLUS_ADD] },
  { icon: Droplet, name: "Гемостаз", markers: [...HEMO_BASIC, ...HEMO_PLUS_ADD] },
];

const premiumBiomarkers: BiomarkerCategory[] = [
  { icon: Zap, name: "Энергия и обмен", markers: [...ENERGY_BASIC, ...ENERGY_PLUS_ADD, ...ENERGY_EXPERT_ADD] },
  { icon: Heart, name: "Сердечно-сосудистая", markers: [...CV_BASIC, ...CV_PLUS_ADD, ...CV_EXPERT_ADD] },
  { icon: Shield, name: "Воспаление и иммунитет", markers: [...INFL_BASIC, ...INFL_PLUS_ADD, ...INFL_EXPERT_ADD] },
  { icon: HormoneMoleculeIcon, name: "Эндокринная система", markers: [...ENDO_BASIC, ...ENDO_PLUS_ADD, ...ENDO_EXPERT_ADD] },
  { icon: RefreshCw, name: "Обмен и детоксикация", markers: [...DETOX_BASIC, ...DETOX_PLUS_ADD] },
  { icon: Droplet, name: "Гемостаз", markers: [...HEMO_BASIC, ...HEMO_PLUS_ADD] },
];

const totalCount = (cats: BiomarkerCategory[]) => cats.reduce((s, c) => s + c.markers.length, 0);


export function PricingSection() {
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const plans = [
    {
      name: "Базовый",
      price: "75 000₽",
      period: "год",
      description: "Базовый, но умный чек-ап.\n45 показателей, которые показывают, как работает обмен веществ, сердце, печень, почки, и гормональный фон. Подходит для регулярного трекинга здоровья и раннего выявления рисков — до появления симптомов",
      badge: "Старт",
      biomarkers: "45",
      analyses: "3 раза в год",
      consultations: "3",
      biomarkersBySystem: standardBiomarkers,
      glowColor: "linear-gradient(135deg, hsl(175, 70%, 55%), hsl(165, 65%, 50%))",
      delay: 0.1
    },
    {
      name: "Плюс",
      price: "135 000₽",
      period: "год",
      description: "Углублённый уровень чекапа. Добавляет расширенную оценку сердечно-сосудистых рисков, дефицитов и гормонального баланса — для более точного понимания причин усталости, снижения энергии и скрытых рисков",
      badge: "Популярный",
      isPopular: true,
      biomarkers: "60",
      analyses: "3 раза в год",
      consultations: "3",
      biomarkersBySystem: plusBiomarkers,
      glowColor: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
      delay: 0.2
    },
    {
      name: "Экспертный",
      price: "220 000₽",
      period: "год",
      description: "Максимальная глубина чекапа. Дополняет Базовый и Плюс оценкой митохондриальной функции, окислительного стресса и факторов воспаления  — для тех, кто хочет понимать процессы старения на самом глубоком уровне",
      badge: "VIP",
      biomarkers: "85",
      analyses: "4 раза в год",
      consultations: "4",
      biomarkersBySystem: premiumBiomarkers,
      glowColor: "linear-gradient(135deg, hsl(210, 75%, 60%), hsl(220, 70%, 55%))",
      delay: 0.3
    }
  ];


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
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Выберите свой </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              план мониторинга
            </span>
          </h2>
          
          <button
            type="button"
            onClick={() => setComparisonOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-14 md:h-16 px-10 md:px-14 rounded-xl text-lg md:text-xl font-semibold text-white bg-gradient-hero shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Сравнить тарифы
          </button>
        </div>

        <BiomarkerComparisonDialog open={comparisonOpen} onOpenChange={setComparisonOpen} />

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) =>
          <PricingCard key={index} {...plan} />
          )}
        </div>

        {/* Trust badges */}
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