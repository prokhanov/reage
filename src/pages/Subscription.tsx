import { useState, useEffect, useMemo } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { PlanCard } from "@/components/subscription/PlanCard";
import { useQuery } from "@tanstack/react-query";
import { ActiveSubscription } from "@/components/subscription/ActiveSubscription";

export default function Subscription() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('annual');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useSubscriptionPlans();

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
        body: { planId, pricingId },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Не получен платёжный URL");

      // Робокасса позовёт ResultURL → бэкенд активирует подписку.
      window.location.href = data.url as string;
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать платёж. Попробуйте позже.",
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

  const getMaxDiscount = () => {
    if (!plans) return 0;
    const allPricing = plans.flatMap(p => p.pricing);
    const maxDiscount = Math.max(...allPricing.map(p => p.discount_percentage));
    return maxDiscount;
  };

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
        
        {getMaxDiscount() > 0 && (
          <p className="text-sm text-muted-foreground animate-in fade-in-50 duration-300">
            💰 Сэкономьте до {getMaxDiscount()}% при годовой оплате
          </p>
        )}
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
            />
          ))}
        </div>
      )}

      {/* Trust Indicators */}
      <div className="text-center space-y-4 pt-8 border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          🔒 Безопасная оплата • 🎯 Без скрытых платежей • ✨ Отмена в любое время
        </p>
      </div>
    </div>
  );
}
