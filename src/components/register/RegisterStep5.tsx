import { Sparkles, Loader2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { PlanCard } from "@/components/subscription/PlanCard";

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

const allPeriods = [
  { value: 'monthly', label: 'Месяц' },
  { value: 'quarterly', label: 'Квартал' },
  { value: 'semiannual', label: 'Полгода' },
  { value: 'annual', label: 'Год' }
];

export function RegisterStep5({ onSubmit, onBack, isSubmitting }: RegisterStep5Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('annual');
  const { data: plans, isLoading } = useSubscriptionPlans();

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

  const handleSelectPlan = (planId: string, pricingId: string) => {
    const pricing = plans
      ?.flatMap(p => p.pricing)
      .find(p => p.id === pricingId);

    if (!pricing) return;

    onSubmit({
      planId,
      pricingId,
      amount: pricing.amount,
      period: pricing.period,
      durationMonths: pricing.duration_months,
      skipPayment: false
    });
  };

  const handleSkip = () => {
    onSubmit({
      planId: '',
      pricingId: '',
      amount: 0,
      period: '',
      durationMonths: 0,
      skipPayment: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-2">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Выберите подписку
        </h2>
        <p className="text-muted-foreground">
          Оформите подписку ReAge для доступа к персональной медицине нового поколения
        </p>
      </div>

      {/* Period Selector */}
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Plans Grid */}
      {!isLoading && plans && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selectedPeriod={selectedPeriod}
              isRecommended={index === 1}
              onSelect={handleSelectPlan}
              isLoading={isSubmitting}
            />
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
          disabled={isSubmitting}
        >
          Назад
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          className="flex-1 h-12 text-muted-foreground hover:text-foreground"
          disabled={isSubmitting}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Оплатить позже
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        🔒 Безопасная оплата • Отмена в любое время
      </p>
    </div>
  );
}
