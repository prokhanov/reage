import { Rabbit, Sparkles, Loader2, SkipForward, Check, FlaskConical, CalendarCheck, UserCheck, ShieldCheck, ChevronDown, Heart, Shield, RefreshCw, Zap, ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useSubscriptionPlans, type PlanWithPricing } from "@/hooks/useSubscriptionPlans";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { BiomarkerComparisonDialog } from "@/components/landing/BiomarkerComparisonDialog";
import { PromoCodeField, AppliedPromo } from "@/components/subscription/PromoCodeField";

export interface SelectedPlanData {
  planId: string;
  pricingId: string;
  amount: number;
  period: string;
  durationMonths: number;
  skipPayment: boolean;
}

interface RegisterStep5Props {
  onSubmit: (data: SelectedPlanData) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

// --- Biomarker categories (synced with landing PricingSection) ---
const makeIcon = (paths: React.ReactNode): LucideIcon =>
  (({ className, strokeWidth = 2, color = "currentColor", size = 24, ...props }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
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

interface BiomarkerCategory { icon: LucideIcon; name: string; markers: string[]; }

const ENERGY_BASIC = ["Глюкоза", "HbA1c", "Инсулин", "HOMA-IR", "ЛДГ", "Альбумин", "Магний", "КФК"];
const ENERGY_PLUS_ADD = ["Витамин B12", "Фолиевая кислота (B9)", "Цинк", "Селен"];
const ENERGY_EXPERT_ADD = ["Лактат", "Коэнзим Q10", "MDA", "Общий антиоксидантный статус", "Индекс MDA/OAS"];
const CV_BASIC = ["Общий холестерин", "ЛПВП", "ЛПНП", "Триглицериды", "ЛПОНП", "не-HDL холестерин", "Индекс атерогенности", "Ферритин", "Фибриноген"];
const CV_PLUS_ADD = ["ApoA1", "ApoB", "ApoB/ApoA1", "Гомоцистеин", "Lp(a)", "Железо", "Медь", "ПТИ", "МНО", "АЧТВ"];
const CV_EXPERT_ADD = ["hs-Troponin I", "NT-proBNP"];
const INFL_BASIC = ["Эритроциты", "Гемоглобин", "Гематокрит", "MCV", "MCH", "MCHC", "RDW", "Тромбоциты", "Лейкоциты", "Нейтрофилы", "Лимфоциты", "Моноциты", "Эозинофилы", "Базофилы", "СОЭ", "hs-CRP"];
const INFL_PLUS_ADD = ["IgM", "IgG"];
const INFL_EXPERT_ADD = ["IL-6", "TNF-α"];
const ENDO_BASIC = ["ТТГ", "Т4 свободный", "25-ОН витамин D"];
const ENDO_PLUS_ADD = ["Т3 свободный", "Тестостерон общий", "SHBG", "Кортизол", "DHEA-S"];
const ENDO_EXPERT_ADD = ["IGF-1"];
const DETOX_BASIC = ["АЛТ", "АСТ", "ГГТ", "Билирубин", "Щелочная фосфатаза", "Общий белок", "Креатинин", "eGFR", "Мочевина", "Натрий", "Калий", "Хлор", "Кальций", "Общий анализ мочи", "Мочевая кислота", "Альбумин/креатинин мочи"];
const DETOX_PLUS_ADD = ["Трансферрин", "Насыщение трансферрина"];

const standardBiomarkers: BiomarkerCategory[] = [
  { icon: Zap, name: "Энергия и восстановление", markers: ENERGY_BASIC },
  { icon: Heart, name: "Сердечно-сосудистая система", markers: CV_BASIC },
  { icon: Shield, name: "Воспалительная и иммунная система", markers: INFL_BASIC },
  { icon: HormoneMoleculeIcon, name: "Эндокринная и стрессовая система", markers: ENDO_BASIC },
  { icon: RefreshCw, name: "Метаболизм и детоксикация", markers: DETOX_BASIC },
];
const plusBiomarkers: BiomarkerCategory[] = [
  { icon: Zap, name: "Энергия и восстановление", markers: [...ENERGY_BASIC, ...ENERGY_PLUS_ADD] },
  { icon: Heart, name: "Сердечно-сосудистая система", markers: [...CV_BASIC, ...CV_PLUS_ADD] },
  { icon: Shield, name: "Воспалительная и иммунная система", markers: [...INFL_BASIC, ...INFL_PLUS_ADD] },
  { icon: HormoneMoleculeIcon, name: "Эндокринная и стрессовая система", markers: [...ENDO_BASIC, ...ENDO_PLUS_ADD] },
  { icon: RefreshCw, name: "Метаболизм и детоксикация", markers: [...DETOX_BASIC, ...DETOX_PLUS_ADD] },
];
const premiumBiomarkers: BiomarkerCategory[] = [
  { icon: Zap, name: "Энергия и восстановление", markers: [...ENERGY_BASIC, ...ENERGY_PLUS_ADD, ...ENERGY_EXPERT_ADD] },
  { icon: Heart, name: "Сердечно-сосудистая система", markers: [...CV_BASIC, ...CV_PLUS_ADD, ...CV_EXPERT_ADD] },
  { icon: Shield, name: "Воспалительная и иммунная система", markers: [...INFL_BASIC, ...INFL_PLUS_ADD, ...INFL_EXPERT_ADD] },
  { icon: HormoneMoleculeIcon, name: "Эндокринная и стрессовая система", markers: [...ENDO_BASIC, ...ENDO_PLUS_ADD, ...ENDO_EXPERT_ADD] },
  { icon: RefreshCw, name: "Метаболизм и детоксикация", markers: [...DETOX_BASIC, ...DETOX_PLUS_ADD] },
];
const totalCount = (cats: BiomarkerCategory[]) => cats.reduce((s, c) => s + c.markers.length, 0);
const biomarkersByPlanSlug: Record<string, BiomarkerCategory[]> = {
  basic: standardBiomarkers,
  plus: plusBiomarkers,
  expert: premiumBiomarkers,
};
const glowByPlanSlug: Record<string, string> = {
  basic: "linear-gradient(135deg, hsl(175, 70%, 55%), hsl(165, 65%, 50%))",
  plus: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
  expert: "linear-gradient(135deg, hsl(210, 75%, 60%), hsl(220, 70%, 55%))",
};

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

interface CardData {
  id: string;
  pricingId: string;
  amount: number;
  period: string;
  durationMonths: number;
  name: string;
  price: string;
  periodLabel: string;
  description: string;
  badge?: string;
  isPopular: boolean;
  biomarkers: string;
  analyses: string;
  consultations: string;
  biomarkersBySystem: BiomarkerCategory[];
  glowColor: string;
}

function planToCard(plan: PlanWithPricing): CardData | null {
  const annual = plan.pricing.find((p) => p.period === "annual" && p.is_enabled !== false);
  const pricing = annual ?? plan.pricing.find((p) => p.is_enabled !== false) ?? plan.pricing[0];
  if (!pricing) return null;
  const slug = (plan.name || "").toLowerCase();
  const biomarkersBySystem = biomarkersByPlanSlug[slug] ?? standardBiomarkers;
  const biomarkersCount = plan.included_biomarkers && plan.included_biomarkers.length > 0
    ? plan.included_biomarkers.length
    : totalCount(biomarkersBySystem);
  const analyses = extractCount(plan.features, ["анализ"]) ?? "3";
  const consultations = extractCount(plan.features, ["консульт"]) ?? "3";
  const isPopular = plan.badge_color === "primary" || plan.display_order === 2;
  return {
    id: plan.id,
    pricingId: pricing.id,
    amount: pricing.amount,
    period: pricing.period,
    durationMonths: pricing.duration_months,
    name: plan.display_name,
    price: `${Math.round(pricing.amount).toLocaleString("ru-RU")}₽`,
    periodLabel: pricing.period === "annual" ? "год" : pricing.period === "semiannual" ? "полгода" : pricing.period === "quarterly" ? "квартал" : "мес",
    description: plan.description ?? "",
    badge: plan.badge_text ?? undefined,
    isPopular,
    biomarkers: String(biomarkersCount),
    analyses: `${analyses} раза в год`,
    consultations,
    biomarkersBySystem,
    glowColor: glowByPlanSlug[slug] ?? glowByPlanSlug.basic,
  };
}

function BiomarkersMetricRow({ biomarkers, biomarkersBySystem, isPopular }: { biomarkers: string; biomarkersBySystem: BiomarkerCategory[]; isPopular?: boolean; }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border/30 hover:border-primary/40 hover:bg-muted/80 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FlaskConical className="w-4 h-4" />
            <span>Биомаркеров</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn("text-sm font-bold", isPopular ? "text-primary" : "text-foreground")}>{biomarkers}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="center" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-sm font-semibold text-foreground mb-3">Биомаркеры по системам</h4>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {biomarkersBySystem.map((cat, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1.5">
                <cat.icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                <span className="text-xs text-muted-foreground">({cat.markers.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cat.markers.map((m, j) => (
                  <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/50 text-muted-foreground">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MetricRow({ icon, label, value, isPopular }: { icon: React.ReactNode; label: string; value: string; isPopular?: boolean; }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={cn("text-sm font-bold", isPopular ? "text-primary" : "text-foreground")}>{value}</span>
    </div>
  );
}

function PricingPlanCard({ card, isSelected, onSelect }: { card: CardData; isSelected: boolean; onSelect: () => void; }) {
  return (
    <div className="group relative h-full">
      <div
        className={cn(
          "absolute -inset-0.5 rounded-3xl blur-xl transition-opacity duration-300",
          isSelected ? "opacity-70" : "opacity-30"
        )}
        style={{ background: card.glowColor }}
      />
      <div
        onClick={onSelect}
        className={cn(
          "relative h-full rounded-3xl border p-6 transition-all duration-300 flex flex-col bg-gradient-to-b from-card to-card/80 shadow-xl cursor-pointer",
          isSelected
            ? "border-primary ring-2 ring-primary/40 shadow-neon-primary"
            : "border-primary/30 hover:border-primary/60"
        )}
      >
        {card.badge && (
          <div className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap",
            card.isPopular ? "bg-gradient-to-r from-primary to-accent text-white" : "bg-muted text-muted-foreground"
          )}>
            {card.isPopular && <Sparkles className="inline h-3 w-3 mr-1" />}
            {card.badge}
          </div>
        )}

        <div className={cn(
          "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}>
          {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
        </div>

        <div className="text-center mb-5 mt-2">
          <h3 className="text-lg font-bold text-foreground mb-3">{card.name}</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className={cn(
              "text-2xl sm:text-3xl font-bold whitespace-nowrap",
              card.isPopular ? "bg-gradient-hero bg-clip-text text-transparent" : "text-foreground"
            )}>
              {card.price}
            </span>
            <span className="text-sm text-muted-foreground whitespace-nowrap">/{card.periodLabel}</span>
          </div>
        </div>

        <div className="space-y-2.5 mb-4">
          <BiomarkersMetricRow biomarkers={card.biomarkers} biomarkersBySystem={card.biomarkersBySystem} isPopular={card.isPopular} />
          <MetricRow icon={<CalendarCheck className="w-4 h-4" />} label="Анализов" value={card.analyses} isPopular={card.isPopular} />
          <MetricRow icon={<UserCheck className="w-4 h-4" />} label="Консультаций" value={`${card.consultations} в год`} isPopular={card.isPopular} />
        </div>

        {card.description && (
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line flex-1">
            {card.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function RegisterStep5({ onSubmit, onBack, isSubmitting }: RegisterStep5Props) {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const { toast } = useToast();

  const { data: activeSubscription, isLoading: loadingSub } = useQuery({
    queryKey: ['register-active-subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('subscriptions')
        .select('id, status, end_date, plan_id, subscription_plans(display_name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 0,
  });

  const cards = (plans ?? []).map(planToCard).filter((c): c is CardData => c !== null);

  useEffect(() => {
    if (!selectedPlanId && cards.length > 0) {
      const recommended = cards.find((c) => c.isPopular) ?? cards[Math.min(1, cards.length - 1)];
      setSelectedPlanId(recommended.id);
    }
  }, [cards, selectedPlanId]);

  const selectedCard = cards.find((c) => c.id === selectedPlanId) ?? null;

  const handlePay = async () => {
    if (!selectedCard) return;
    setPaying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Требуется вход", description: "Сначала завершите шаг «Аккаунт».", variant: "destructive" });
        setPaying(false);
        return;
      }

      onSubmit({
        planId: selectedCard.id,
        pricingId: selectedCard.pricingId,
        amount: selectedCard.amount,
        period: selectedCard.period,
        durationMonths: selectedCard.durationMonths,
        skipPayment: false,
      });
      window.localStorage.setItem("reage:register:returnToStep", "health");

      const { data, error } = await supabase.functions.invoke("robokassa-create-payment", {
        body: { planId: selectedCard.id, pricingId: selectedCard.pricingId, promoCode: appliedPromo?.code },
      });

      const errMsg = (data as any)?.error;
      if (errMsg) {
        toast({ title: "Не удалось оформить оплату", description: errMsg, variant: "destructive" });
        window.localStorage.removeItem("reage:register:returnToStep");
        setPaying(false);
        return;
      }
      if (error) throw error;
      if (!data?.url) throw new Error("Не получен платёжный URL");
      window.location.href = data.url as string;
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({ title: "Ошибка оплаты", description: err?.message || "Не удалось создать платёж. Попробуйте позже.", variant: "destructive" });
      window.localStorage.removeItem("reage:register:returnToStep");
      setPaying(false);
    }
  };

  const handleSkip = () => {
    onSubmit({ planId: '', pricingId: '', amount: 0, period: '', durationMonths: 0, skipPayment: true });
  };

  if (activeSubscription) {
    const planName = (activeSubscription as any).subscription_plans?.display_name || "выбранный тариф";
    const endDate = activeSubscription.end_date ? new Date(activeSubscription.end_date).toLocaleDateString('ru-RU') : null;
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/15 mb-2">
            <ShieldCheck className="h-7 w-7 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">Вы уже оплатили подписку</h2>
          <p className="text-muted-foreground text-sm">
            Активен тариф «{planName}».{endDate && ` Действует до ${endDate}.`}
          </p>
        </div>

        <Card className="p-6 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-500" />
            <p className="text-sm">
              Шаг оплаты пройден. Продолжите регистрацию — расскажите о себе на следующем шаге.
            </p>
          </div>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12">Назад</Button>
          <Button type="button" onClick={handleSkip} className="flex-1 h-12 bg-gradient-primary shadow-neon-primary">
            Далее
            <Check className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary mb-2">
          <Rabbit className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Выберите подписку
        </h2>
        <p className="text-muted-foreground text-sm">
          Оплата проходит через Робокассу. Карта вводится на защищённой странице банка.
        </p>
      </div>

      <BiomarkerComparisonDialog open={comparisonOpen} onOpenChange={setComparisonOpen} />

      {(isLoading || loadingSub) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 min-h-[480px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="min-w-0 h-full">
              <Skeleton className="h-[460px] w-full rounded-3xl" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          Тарифы временно недоступны. Загляните позже.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 min-h-[480px]">
          {cards.map((card) => (
            <div key={card.id} className="min-w-0 h-full">
              <PricingPlanCard
                card={card}
                isSelected={selectedPlanId === card.id}
                onSelect={() => setSelectedPlanId(card.id)}
              />
            </div>
          ))}
        </div>
      )}


      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => setComparisonOpen(true)}
          className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-base font-semibold text-white bg-gradient-hero shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/60 hover:scale-[1.03] transition-all duration-300"
        >
          Сравнить тарифы
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Промокод */}
      {selectedCard && (
        <div className="max-w-md mx-auto pt-2">
          <PromoCodeField
            applied={appliedPromo}
            onApplied={setAppliedPromo}
            context={{
              planId: selectedCard.id,
              pricingId: selectedCard.pricingId,
              amount: selectedCard.amount,
            }}
          />
        </div>
      )}


      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 min-w-[120px] h-12"
          disabled={isSubmitting || paying}
        >
          Назад
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          className="flex-1 min-w-[140px] h-12 text-muted-foreground hover:text-foreground"
          disabled={isSubmitting || paying}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Оплатить позже
        </Button>
        <Button
          onClick={handlePay}
          disabled={!selectedCard || isSubmitting || paying}
          className="flex-1 min-w-[180px] h-12 bg-gradient-primary shadow-neon-primary"
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Переход к оплате…
            </>
          ) : (
            <>
              {selectedCard ? (
                <span className="inline-flex items-center gap-1.5">
                  Оплатить
                  {appliedPromo && appliedPromo.discount_type !== "free_period" && appliedPromo.final_amount !== selectedCard.amount ? (
                    <>
                      <span className="line-through opacity-60">
                        {selectedCard.amount.toLocaleString("ru-RU")} ₽
                      </span>
                      <span>{appliedPromo.final_amount.toLocaleString("ru-RU")} ₽</span>
                    </>
                  ) : (
                    <span>{selectedCard.amount.toLocaleString("ru-RU")} ₽</span>
                  )}
                  {appliedPromo?.discount_type === "free_period" && (
                    <span className="text-[11px] opacity-80 ml-1">
                      (+{appliedPromo.discount_value} мес. бесплатно)
                    </span>
                  )}
                </span>
              ) : (
                "Оплатить"
              )}
              <Check className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
