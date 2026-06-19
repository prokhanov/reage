import { useState, useEffect, useMemo } from "react";
import { Sparkles, Loader2, AlertTriangle, ShieldCheck, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { PlanCard } from "@/components/subscription/PlanCard";
import { useQuery } from "@tanstack/react-query";
import { ActiveSubscription } from "@/components/subscription/ActiveSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePaymentGatewayTestMode } from "@/hooks/usePaymentGatewayTestMode";
import { PromoCodeField, AppliedPromo } from "@/components/subscription/PromoCodeField";

export default function Subscription() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('annual');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const { toast } = useToast();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { data: isTestMode } = usePaymentGatewayTestMode();

  // Check for active subscription
  const { data: activeSubscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            display_name,
            description,
            features
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  const handleSelectPlan = async (planId: string, pricingId: string) => {
    setSelectedPlanId(planId);

    const plan = plans?.find(p => p.id === planId);
    const pricing = plan?.pricing.find(p => p.id === pricingId);
    let currentPromo = appliedPromo;
    if (currentPromo && pricing && currentPromo.original_amount > 0 && currentPromo.original_amount !== pricing.amount) {
      setAppliedPromo(null);
      currentPromo = null;
      toast({
        title: "Промокод сброшен",
        description: "Применённый промокод снят после смены тарифа. Примените заново.",
      });
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Требуется вход",
          description: "Войдите в аккаунт, чтобы оформить подписку.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("robokassa-create-payment", {
        body: { planId, pricingId, promoCode: currentPromo?.code },
      });

      // Сообщение об ошибке (например, невалидный промокод) приходит в data.error
      const errMsg = (data as any)?.error;
      if (errMsg) {
        toast({ title: "Не удалось оформить оплату", description: errMsg, variant: "destructive" });
        setCreating(false);
        return;
      }
      if (error) throw error;
      if (!data?.url) throw new Error("Не получен платёжный URL");

      // Робокасса позовёт ResultURL → бэкенд активирует подписку.
      window.location.href = data.url as string;
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "Ошибка",
        description: error?.message ?? "Не удалось создать платёж. Попробуйте позже.",
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  const allPeriods = [
    { value: 'monthly', label: 'Месяц' },
    { value: 'quarterly', label: 'Квартал' },
    { value: 'semiannual', label: 'Полгода' },
    { value: 'annual', label: 'Год' }
  ];

  // Фильтруем периоды - показываем только те, для которых есть активные цены
  const availablePeriods = useMemo(() => 
    allPeriods.filter(period => 
      plans?.some(plan => plan.pricing.some(p => p.period === period.value))
    ),
    [plans]
  );

  // Если выбранный период недоступен, переключаем на первый доступный
  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.find(p => p.value === selectedPeriod)) {
      setSelectedPeriod(availablePeriods[0].value);
    }
  }, [availablePeriods, selectedPeriod]);

  // Инициализируем selectedPlanId
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      const rec = plans.find((_, i) => i === 1) ?? plans[0];
      setSelectedPlanId(rec.id);
    }
  }, [plans, selectedPlanId]);


  // Show loading state
  if (loadingSubscription || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show active subscription if exists
  if (activeSubscription) {
    return <ActiveSubscription subscription={activeSubscription} />;
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12">
      {isTestMode && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Тестовый режим оплаты</AlertTitle>
          <AlertDescription>
            Платёжный шлюз сейчас работает в тестовом режиме. Реальные деньги не спишутся,
            и подписка не будет активирована после оплаты.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Section */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-primary mb-4">
          <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-white" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Выберите свой тариф
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Персонализированная медицина нового поколения для вашего здоровья и долголетия
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <ToggleGroup 
          type="single" 
          value={selectedPeriod}
          onValueChange={(value) => value && setSelectedPeriod(value)}
          className="inline-flex flex-wrap justify-center rounded-lg border border-border/50 p-1 bg-background/50 backdrop-blur-sm"
        >
          {availablePeriods.map(period => (
            <ToggleGroupItem 
              key={period.value}
              value={period.value} 
              className="rounded-md px-4 md:px-6 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all"
            >
              {period.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Plans Grid */}
      {!isLoading && plans && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selectedPeriod={selectedPeriod}
              isRecommended={index === 1}
              onSelect={handleSelectPlan}
              isLoading={creating}
              appliedPromo={appliedPromo}
            />
          ))}
        </div>
      )}

      {/* Промокод */}
      <div className="max-w-md mx-auto mb-10">
        <PromoCodeField
          applied={appliedPromo}
          onApplied={setAppliedPromo}
          context={
            selectedPlanId && plans
              ? (() => {
                  const plan = plans.find(p => p.id === selectedPlanId);
                  const pricing = plan?.pricing.find(p => p.period === selectedPeriod);
                  return plan && pricing
                    ? { planId: plan.id, pricingId: pricing.id, amount: pricing.amount }
                    : null;
                })()
              : null
          }
        />
      </div>

      {/* Trust Indicators */}
      <div className="text-center space-y-4 pt-8 border-t border-border/50">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Безопасная оплата</span>
          <span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Без скрытых платежей</span>
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Отмена в любое время</span>
        </div>
      </div>
    </div>
  );
}
