import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlanWithPricing, SubscriptionPricing, calculateSavings, calculateMonthlyEquivalent } from "@/hooks/useSubscriptionPlans";
import { AppliedPromo, promoAppliesToPricing } from "./PromoCodeField";

interface PlanCardProps {
  plan: PlanWithPricing;
  selectedPeriod: string;
  isRecommended?: boolean;
  onSelect: (planId: string, pricingId: string) => void;
  isLoading?: boolean;
  appliedPromo?: AppliedPromo | null;
}

export function PlanCard({ plan, selectedPeriod, isRecommended, onSelect, isLoading, appliedPromo }: PlanCardProps) {
  const pricing = plan.pricing.find(p => p.period === selectedPeriod);
  
  if (!pricing) return null;

  const monthlyPricing = plan.pricing.find(p => p.period === 'monthly');
  const savings = monthlyPricing 
    ? calculateSavings(monthlyPricing.amount, pricing.amount, pricing.duration_months)
    : 0;
  
  const monthlyEquivalent = calculateMonthlyEquivalent(pricing.amount, pricing.duration_months);

  // Динамический расчёт скидки для КАЖДОГО тарифа (если промокод применим)
  const promoApplies = promoAppliesToPricing(appliedPromo ?? null, plan.id, pricing.id);
  let finalAmount = pricing.amount;
  let showStrike = false;
  if (promoApplies && appliedPromo) {
    if (appliedPromo.discount_type === "percent") {
      const d = Math.round((pricing.amount * Math.min(appliedPromo.discount_value, 100)) / 100);
      finalAmount = Math.max(pricing.amount - d, 0);
      showStrike = finalAmount !== pricing.amount;
    } else if (appliedPromo.discount_type === "fixed") {
      const d = Math.min(appliedPromo.discount_value, pricing.amount);
      finalAmount = Math.max(pricing.amount - d, 0);
      showStrike = finalAmount !== pricing.amount;
    }
    // free_period — цена та же, бонус месяцами
  }
  const isPromoApplied = promoApplies;

  return (
    <Card 
      className={cn(
        "relative transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        isRecommended && "border-primary shadow-neon-primary scale-105 md:scale-110"
      )}
    >
      {plan.badge_text && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge 
            className={cn(
              "text-xs px-3 py-1 shadow-md",
              plan.badge_color === 'primary' && "bg-primary text-primary-foreground",
              plan.badge_color === 'accent' && "bg-accent text-accent-foreground"
            )}
          >
            {isRecommended && <Sparkles className="h-3 w-3 mr-1 inline" />}
            {plan.badge_text}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <h3 className="text-2xl font-bold mb-2">{plan.display_name}</h3>
        <p className="text-sm text-muted-foreground min-h-[40px]">
          {plan.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center space-y-1">
          <div className={cn(
            "text-4xl font-bold animate-in fade-in-50 duration-300",
            showStrike ? "text-primary" : "text-foreground"
          )}>
            {showStrike && (
              <span className="line-through opacity-50 text-2xl mr-2 text-muted-foreground">
                {pricing.amount.toLocaleString('ru-RU')} ₽
              </span>
            )}
            <span>
              {finalAmount.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            / {pricing.period_display.toLowerCase()}
          </div>
          
          {pricing.duration_months > 1 && (
            <div className="text-xs text-muted-foreground pt-1">
              или {monthlyEquivalent.toLocaleString('ru-RU')} ₽/месяц
            </div>
          )}

          {isPromoApplied && appliedPromo?.discount_type === "free_period" && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400 pt-2 animate-in fade-in-50 duration-300">
              +{appliedPromo.discount_value} мес. бесплатно
            </div>
          )}

          {!isPromoApplied && savings > 0 && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400 pt-2 animate-in fade-in-50 duration-300">
              Экономия {savings.toLocaleString('ru-RU')} ₽
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-foreground leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-6">
        <Button
          className={cn(
            "w-full h-12 text-base transition-all duration-300",
            isRecommended ? "bg-gradient-primary shadow-neon-primary hover:shadow-neon-primary-lg" : ""
          )}
          variant={isRecommended ? "default" : "outline"}
          onClick={() => onSelect(plan.id, pricing.id)}
          disabled={isLoading}
        >
          {isLoading ? "Оформляем..." : "Оформить подписку"}
        </Button>
      </CardFooter>
    </Card>
  );
}
