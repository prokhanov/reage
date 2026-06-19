import { Rabbit, Sparkles, Loader2, SkipForward, Check, FlaskConical, CalendarCheck, UserCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useSubscriptionPlans, calculateMonthlyEquivalent } from "@/hooks/useSubscriptionPlans";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

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

export function RegisterStep5({ onSubmit, onBack, isSubmitting }: RegisterStep5Props) {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();

  // Проверяем наличие активной подписки
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

  // Auto-select recommended (second) plan
  useEffect(() => {
    if (plans && plans.length > 1 && !selectedPlanId) {
      setSelectedPlanId(plans[1].id);
    } else if (plans && plans.length === 1 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const getAnnualPricing = (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    if (!plan) return null;
    return plan.pricing.find(p => p.period === 'annual') || plan.pricing[0];
  };

  const selectedPricing = selectedPlanId ? getAnnualPricing(selectedPlanId) : null;

  const handlePay = async () => {
    if (!selectedPlanId || !selectedPricing) return;
    setPaying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Требуется вход",
          description: "Сначала завершите шаг «Аккаунт».",
          variant: "destructive",
        });
        setPaying(false);
        return;
      }

      // Сохраняем выбор и помечаем, что после оплаты надо вернуться в регистрацию
      onSubmit({
        planId: selectedPlanId,
        pricingId: selectedPricing.id,
        amount: selectedPricing.amount,
        period: selectedPricing.period,
        durationMonths: selectedPricing.duration_months,
        skipPayment: false,
      });
      window.localStorage.setItem("reage:register:returnToStep", "profile");

      const { data, error } = await supabase.functions.invoke("robokassa-create-payment", {
        body: { planId: selectedPlanId, pricingId: selectedPricing.id },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Не получен платёжный URL");

      window.location.href = data.url as string;
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: "Ошибка оплаты",
        description: err?.message || "Не удалось создать платёж. Попробуйте позже.",
        variant: "destructive",
      });
      window.localStorage.removeItem("reage:register:returnToStep");
      setPaying(false);
    }
  };

  const handleSkip = () => {
    onSubmit({
      planId: '',
      pricingId: '',
      amount: 0,
      period: '',
      durationMonths: 0,
      skipPayment: true,
    });
  };

  // Если подписка уже активна — read-only
  if (activeSubscription) {
    const planName = (activeSubscription as any).subscription_plans?.display_name || "выбранный тариф";
    const endDate = activeSubscription.end_date
      ? new Date(activeSubscription.end_date).toLocaleDateString('ru-RU')
      : null;
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
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12"
          >
            Назад
          </Button>
          <Button
            type="button"
            onClick={handleSkip}
            className="flex-1 h-12 bg-gradient-primary shadow-neon-primary"
          >
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

      {(isLoading || loadingSub) && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && plans && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((plan, index) => {
            const pricing = plan.pricing.find(p => p.period === 'annual') || plan.pricing[0];
            if (!pricing) return null;
            const isSelected = selectedPlanId === plan.id;
            const isRecommended = index === 1;
            const monthlyEquivalent = calculateMonthlyEquivalent(pricing.amount, pricing.duration_months);

            return (
              <Card
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "relative cursor-pointer transition-all duration-300 p-4 flex flex-col",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 shadow-neon-primary"
                    : "border-border/50 hover:border-primary/50",
                  isRecommended && !isSelected && "border-primary/30"
                )}
              >
                <div className={cn(
                  "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                </div>

                {plan.badge_text && (
                  <div className="mb-2">
                    <Badge
                      className={cn(
                        "text-[10px] px-2 py-0.5",
                        plan.badge_color === 'primary' && "bg-primary text-primary-foreground",
                        plan.badge_color === 'accent' && "bg-accent text-accent-foreground"
                      )}
                    >
                      {isRecommended && <Sparkles className="h-2.5 w-2.5 mr-1 inline" />}
                      {plan.badge_text}
                    </Badge>
                  </div>
                )}

                <h3 className="text-lg font-bold mb-3">{plan.display_name}</h3>

                <div className="space-y-1.5 mb-3">
                  {(() => {
                    const name = plan.name?.toLowerCase() || '';
                    const biomarkers = name.includes('expert') || name.includes('premium') ? '85' : name.includes('plus') ? '60' : '45';
                    const analyses = name.includes('expert') || name.includes('premium') ? '4 раза в год' : '3 раза в год';
                    const consultations = name.includes('expert') || name.includes('premium') ? '4 в год' : '3 в год';
                    return (
                      <>
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50 border border-border/30">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FlaskConical className="w-3.5 h-3.5" />
                            <span>Биомаркеров</span>
                          </div>
                          <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>{biomarkers}</span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50 border border-border/30">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>Анализов</span>
                          </div>
                          <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>{analyses}</span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/50 border border-border/30">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Консультаций</span>
                          </div>
                          <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>{consultations}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mb-3">
                  <div className="text-2xl font-bold">
                    {pricing.amount.toLocaleString('ru-RU')} ₽ <span className="text-sm font-normal text-muted-foreground">/ год</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Buttons */}
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
          disabled={!selectedPlanId || isSubmitting || paying}
          className="flex-1 min-w-[180px] h-12 bg-gradient-primary shadow-neon-primary"
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Переход к оплате…
            </>
          ) : (
            <>
              Оплатить {selectedPricing ? `${selectedPricing.amount.toLocaleString('ru-RU')} ₽` : ""}
              <Check className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
