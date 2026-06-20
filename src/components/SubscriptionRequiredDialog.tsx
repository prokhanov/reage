import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { PlanCard } from "@/components/subscription/PlanCard";
import { BiomarkerComparisonDialog } from "@/components/landing/BiomarkerComparisonDialog";
import { PromoCodeField, AppliedPromo } from "@/components/subscription/PromoCodeField";

interface SubscriptionRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SubscriptionRequiredDialog({
  open,
  onOpenChange,
  onSuccess
}: SubscriptionRequiredDialogProps) {
  const [creating, setCreating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('annual');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const { toast } = useToast();
  const { data: plans, isLoading } = useSubscriptionPlans();

  const handleSelectPlan = async (planId: string, pricingId: string) => {
    setSelectedPlanId(planId);
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
        body: { planId, pricingId, promoCode: appliedPromo?.code },
      });

      const errMsg = (data as any)?.error;
      if (errMsg) {
        toast({ title: "Не удалось оформить оплату", description: errMsg, variant: "destructive" });
        setCreating(false);
        return;
      }
      if (error) throw error;
      if (!data?.url) throw new Error("Не получен платёжный URL");

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

  const availablePeriods = useMemo(() => 
    allPeriods.filter(period => 
      plans?.some(plan => plan.pricing.some(p => p.period === period.value))
    ),
    [plans]
  );

  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.find(p => p.value === selectedPeriod)) {
      setSelectedPeriod(availablePeriods[0].value);
    }
  }, [availablePeriods, selectedPeriod]);

  // Инициализируем selectedPlanId (рекомендованный — второй тариф)
  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      const rec = plans.find((_, i) => i === 1) ?? plans[0];
      setSelectedPlanId(rec.id);
    }
  }, [plans, selectedPlanId]);

  const showPeriodSelector = availablePeriods.length > 1;

  const promoContext = useMemo(() => {
    if (!selectedPlanId || !plans) return null;
    const plan = plans.find(p => p.id === selectedPlanId);
    const pricing = plan?.pricing.find(p => p.period === selectedPeriod);
    return plan && pricing
      ? { planId: plan.id, pricingId: pricing.id, amount: pricing.amount }
      : null;
  }, [selectedPlanId, selectedPeriod, plans]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby="subscription-description">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl md:text-3xl">
            Для записи на анализы требуется подписка
          </DialogTitle>
        </DialogHeader>
        <p id="subscription-description" className="sr-only">
          Диалог оформления подписки для доступа к записи на анализы
        </p>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Оформите подписку ReAge для доступа к персональной медицине нового поколения
            </p>
          </div>

          {/* Period Selector — показываем только если доступно > 1 периода */}
          {showPeriodSelector && (
            <div className="flex flex-col items-center gap-3">
              <ToggleGroup 
                type="single" 
                value={selectedPeriod}
                onValueChange={(value) => value && setSelectedPeriod(value)}
                className="inline-flex rounded-lg border border-border/50 p-1 bg-background/50 backdrop-blur-sm"
              >
                {availablePeriods.map(period => (
                  <ToggleGroupItem 
                    key={period.value}
                    value={period.value} 
                    className="rounded-md px-4 md:px-6 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {period.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Plans Grid */}
          {!isLoading && plans && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-4">
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
          <div className="max-w-md mx-auto w-full">
            <PromoCodeField
              applied={appliedPromo}
              onApplied={setAppliedPromo}
              context={promoContext}
            />
          </div>

          {/* Сравнение тарифов — кнопка как на главной */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setComparisonOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-semibold text-white bg-gradient-hero shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/60 hover:scale-105 hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background transition-all duration-300"
            >
              Сравнить тарифы
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            🔒 Безопасная оплата
          </p>
        </div>
      </DialogContent>

      <BiomarkerComparisonDialog open={comparisonOpen} onOpenChange={setComparisonOpen} />
    </Dialog>
  );
}
