import { Sparkles, ArrowRight, FlaskConical, CalendarCheck, UserCheck, ChevronDown, Heart, Shield, RefreshCw, Zap, Droplet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BiomarkerComparisonDialog } from "./BiomarkerComparisonDialog";
import { useSubscriptionPlans, type PlanWithPricing } from "@/hooks/useSubscriptionPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegisterGuard } from "@/components/RegisterGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// Иконка по названию категории (по ключевому слову). Если ничего не подошло — Droplet.
function iconForCategory(name: string): LucideIcon {
  const l = name.toLowerCase();
  if (l.includes("энерг")) return Zap;
  if (l.includes("сердеч") || l.includes("сосуд")) return Heart;
  if (l.includes("воспал") || l.includes("иммун")) return Shield;
  if (l.includes("эндокрин") || l.includes("гормон") || l.includes("стресс")) return HormoneMoleculeIcon;
  if (l.includes("метаб") || l.includes("детокс")) return RefreshCw;
  return Droplet;
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
  onSelect: () => void;
}

function PricingCard({ name, price, period, description, biomarkers, analyses, consultations, biomarkersBySystem, glowColor, isPopular, badge, delay, onSelect }: PricingCardProps) {
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

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-foreground mb-4">{name}</h3>

          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold whitespace-nowrap ${isPopular ? "bg-gradient-hero bg-clip-text text-transparent" : "text-foreground"}`}>
              {price}
            </span>
            <span className="text-muted-foreground whitespace-nowrap">/{period}</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <BiomarkersMetricRow biomarkers={biomarkers} biomarkersBySystem={biomarkersBySystem} isPopular={isPopular} />
          <MetricRow icon={<CalendarCheck className="w-4 h-4" />} label="Анализов" value={analyses} isPopular={isPopular} />
          <MetricRow icon={<UserCheck className="w-4 h-4" />} label="Консультаций" value={consultations} isPopular={isPopular} />
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1 whitespace-pre-line">{description}</p>

        <Button
          className={`w-full ${isPopular ? "shadow-neon-primary" : ""}`}
          variant={isPopular ? "default" : "outline"}
          size="lg"
          onClick={onSelect}>
          Выбрать план
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>);
}

function BiomarkersMetricRow({ biomarkers, biomarkersBySystem, isPopular }: {biomarkers: string;biomarkersBySystem: BiomarkerCategory[];isPopular?: boolean;}) {
  const hasData = biomarkersBySystem.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border/30 hover:border-primary/40 hover:bg-muted/80 transition-colors cursor-pointer text-left" disabled={!hasData}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FlaskConical className="w-4 h-4" />
            <span>Биомаркеров</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${isPopular ? "text-primary" : "text-foreground"}`}>{biomarkers}</span>
            {hasData && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </button>
      </PopoverTrigger>
      {hasData && (
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
      )}
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

const glowByPlanSlug: Record<string, string> = {
  basic: "linear-gradient(135deg, hsl(175, 70%, 55%), hsl(165, 65%, 50%))",
  plus: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
  expert: "linear-gradient(135deg, hsl(210, 75%, 60%), hsl(220, 70%, 55%))",
};
const defaultGlow = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))";

// Парсим количество из строк features вида «3 анализа в год», «4 консультации в год».
function extractCount(features: string[], keywords: string[]): string | null {
  for (const f of features) {
    const lower = f.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      const m = f.match(/\d+/);
      if (m) return m[0];
    }
  }
  return null;
}

interface BiomarkerRow {
  id: string;
  name: string;
  category: string;
  display_order: number;
}

function planToCard(
  plan: PlanWithPricing,
  index: number,
  allBiomarkers: BiomarkerRow[],
  categoryOrder: Map<string, number>
) {
  // Берём годовую цену — это базовая публичная цена.
  const annual = plan.pricing.find((p) => p.period === "annual" && p.is_enabled !== false);
  const pricing = annual ?? plan.pricing.find((p) => p.is_enabled !== false) ?? plan.pricing[0];
  const amount = pricing?.amount ?? 0;
  const priceStr = `${Math.round(amount).toLocaleString("ru-RU")}₽`;
  const periodStr = pricing?.period === "annual" ? "год"
    : pricing?.period === "semiannual" ? "полгода"
    : pricing?.period === "quarterly" ? "квартал"
    : pricing?.period === "monthly" ? "мес"
    : "год";

  const slug = (plan.name || "").toLowerCase();

  // Только реальные данные из БД — никакого хардкода.
  const includedIds = new Set(plan.included_biomarkers ?? []);
  const planBiomarkers = allBiomarkers.filter((b) => includedIds.has(b.id));
  const biomarkersCount = planBiomarkers.length;

  // Группируем по категориям.
  const byCategory = new Map<string, BiomarkerRow[]>();
  planBiomarkers.forEach((b) => {
    const arr = byCategory.get(b.category) ?? [];
    arr.push(b);
    byCategory.set(b.category, arr);
  });
  const biomarkersBySystem: BiomarkerCategory[] = Array.from(byCategory.entries())
    .map(([name, rows]) => ({
      icon: iconForCategory(name),
      name,
      markers: rows
        .sort((a, b) => a.display_order - b.display_order)
        .map((r) => r.name),
    }))
    .sort(
      (a, b) =>
        (categoryOrder.get(a.name) ?? 999) - (categoryOrder.get(b.name) ?? 999)
    );

  // Сначала пытаемся взять значения из comparison_highlights (управляется в админке),
  // затем — из текстовых features, затем — fallback.
  const findHighlight = (keywords: string[]) =>
    (plan.comparison_highlights ?? []).find((h) =>
      keywords.some((k) => h.label.toLowerCase().includes(k))
    )?.value;

  const analyses =
    findHighlight(["анализ", "сдач", "чекап"]) ??
    extractCount(plan.features, ["анализ"]) ??
    "—";
  const consultations =
    findHighlight(["консульт"]) ??
    extractCount(plan.features, ["консульт"]) ??
    "—";

  const isPopular = plan.badge_color === "primary" || plan.display_order === 2;

  return {
    id: plan.id,
    name: plan.display_name,
    price: priceStr,
    period: periodStr,
    description: plan.description ?? "",
    badge: plan.badge_text ?? undefined,
    isPopular,
    biomarkers: String(biomarkersCount),
    analyses,
    consultations,
    biomarkersBySystem,
    glowColor: glowByPlanSlug[slug] ?? defaultGlow,
    delay: 0.1 + index * 0.1,
  };
}

export function PricingSection() {
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const navigate = useNavigate();
  const { requestRegister } = useRegisterGuard();
  const { data: plans, isLoading } = useSubscriptionPlans();

  // Тянем все биомаркеры и категории из БД, чтобы строить popover «Биомаркеры по системам».
  const { data: biomarkersData } = useQuery({
    queryKey: ["pricing-biomarkers"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [bRes, cRes] = await Promise.all([
        supabase.from("biomarkers").select("id, name, category, display_order").order("display_order"),
        supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
      ]);
      if (bRes.error) throw bRes.error;
      if (cRes.error) throw cRes.error;
      const categoryOrder = new Map<string, number>();
      (cRes.data ?? []).forEach((c) => categoryOrder.set(c.name, c.display_order));
      return {
        biomarkers: (bRes.data ?? []) as BiomarkerRow[],
        categoryOrder,
      };
    },
  });

  const cards = useMemo(() => {
    const all = biomarkersData?.biomarkers ?? [];
    const order = biomarkersData?.categoryOrder ?? new Map<string, number>();
    return (plans ?? []).map((p, i) => planToCard(p, i, all, order));
  }, [plans, biomarkersData]);


  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />

      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />

      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in whitespace-pre-line" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">У каждого есть история болезни </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">Мы создаём историю здоровья</span>
          </h2>

        </div>

        <BiomarkerComparisonDialog open={comparisonOpen} onOpenChange={setComparisonOpen} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[520px] rounded-3xl" />
            ))
          ) : cards.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12">
              Тарифы временно недоступны. Загляните позже.
            </div>
          ) : (
            cards.map((card) => (
              <PricingCard
                key={card.id}
                {...card}
                onSelect={requestRegister}
              />
            ))
          )}
        </div>

        <div className="text-center mt-10 md:mt-12">
          <button
            type="button"
            onClick={() => setComparisonOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-14 md:h-16 px-10 md:px-14 rounded-xl text-lg md:text-xl font-semibold text-white bg-gradient-hero shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/60 hover:scale-110 hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background transition-all duration-300 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Сравнить тарифы
          </button>
        </div>
      </div>
    </section>);

}
