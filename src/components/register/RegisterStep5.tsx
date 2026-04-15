import { Sparkles, Loader2, SkipForward, Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { useSubscriptionPlans, calculateMonthlyEquivalent, calculateSavings } from "@/hooks/useSubscriptionPlans";
import { cn } from "@/lib/utils";

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
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  // Auto-select recommended (second) plan
  useEffect(() => {
    if (plans && plans.length > 1 && !selectedPlanId) {
      setSelectedPlanId(plans[1].id);
    } else if (plans && plans.length === 1 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  // Since pricing is yearly only, get the annual pricing for each plan
  const getAnnualPricing = (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    if (!plan) return null;
    return plan.pricing.find(p => p.period === 'annual') || plan.pricing[0];
  };

  const selectedPricing = selectedPlanId ? getAnnualPricing(selectedPlanId) : null;

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const isCardValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardName.trim().length > 0 &&
    expiryDate.length === 5 &&
    cvv.length === 3;

  const handlePay = () => {
    if (!selectedPlanId || !selectedPricing) return;
    onSubmit({
      planId: selectedPlanId,
      pricingId: selectedPricing.id,
      amount: selectedPricing.amount,
      period: selectedPricing.period,
      durationMonths: selectedPricing.duration_months,
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
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary mb-2">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Выберите подписку
        </h2>
        <p className="text-muted-foreground text-sm">
          Выберите подходящий тариф для доступа ко всем возможностям ReAge
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Plans Selection */}
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
                {/* Selected indicator */}
                <div className={cn(
                  "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                </div>

                {/* Badge */}
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

                <h3 className="text-lg font-bold mb-1">{plan.display_name}</h3>
                <p className="text-xs text-muted-foreground mb-3 min-h-[32px]">{plan.description}</p>

                <div className="mb-3">
                  <div className="text-2xl font-bold">
                    {pricing.amount.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-xs text-muted-foreground">
                    / год • {monthlyEquivalent.toLocaleString('ru-RU')} ₽/мес
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Form */}
      {selectedPlanId && selectedPricing && (
        <div className="space-y-4 border-t border-border/50 pt-5">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Данные карты
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              К оплате: {selectedPricing.amount.toLocaleString('ru-RU')} ₽
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Номер карты</Label>
              <Input
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                className="h-11 font-mono"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Имя на карте</Label>
              <Input
                placeholder="IVAN IVANOV"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Срок действия</Label>
              <Input
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                maxLength={5}
                className="h-11 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CVV</Label>
              <Input
                type="password"
                placeholder="000"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                maxLength={3}
                className="h-11 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
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
        <Button
          onClick={handlePay}
          disabled={!isCardValid || !selectedPlanId || isSubmitting}
          className="flex-1 h-12 bg-gradient-primary shadow-neon-primary"
        >
          {isSubmitting ? "Обработка..." : "Оплатить"}
          <Check className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
