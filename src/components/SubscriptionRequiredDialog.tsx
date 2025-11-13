import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addMonths } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { PlanCard } from "@/components/subscription/PlanCard";

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
  const { toast } = useToast();
  const { data: plans, isLoading } = useSubscriptionPlans();

  const handleSelectPlan = async (planId: string, pricingId: string) => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const pricing = plans
        ?.flatMap(p => p.pricing)
        .find(p => p.id === pricingId);

      if (!pricing) throw new Error('Pricing not found');

      const startDate = new Date();
      const endDate = addMonths(startDate, pricing.duration_months);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          pricing_id: pricingId,
          plan_type: pricing.period,
          amount: pricing.amount,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_method: 'card'
        });

      if (error) throw error;

      toast({
        title: "Подписка активирована!",
        description: "Теперь вы можете записаться на анализы и использовать все возможности платформы.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось оформить подписку. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const periods = [
    { value: 'quarterly', label: 'Квартал' },
    { value: 'semiannual', label: 'Полгода' },
    { value: 'annual', label: 'Год' }
  ];

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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
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
              {periods.map(period => (
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

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Plans Grid */}
          {!isLoading && plans && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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

          <p className="text-center text-xs text-muted-foreground">
            🔒 Безопасная оплата • Отмена в любое время
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
