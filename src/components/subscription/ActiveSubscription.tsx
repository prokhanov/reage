import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, CreditCard, Package } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ActiveSubscriptionProps {
  subscription: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    amount: number;
    plan_type: string;
    period_display?: string | null;
    subscription_plans?: {
      display_name: string;
      description: string | null;
      features: any;
      badge_text?: string | null;
      badge_color?: string | null;
      comparison_highlights?: any;
    } | null;
  };
}

export function ActiveSubscription({ subscription }: ActiveSubscriptionProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy", { locale: ru });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      monthly: 'Месяц',
      quarterly: 'Квартал',
      semiannual: 'Полгода',
      annual: 'Год'
    };
    return labels[period] || period;
  };

  const features = Array.isArray(subscription.subscription_plans?.features)
    ? subscription.subscription_plans.features
    : [];

  const highlights = Array.isArray(subscription.subscription_plans?.comparison_highlights)
    ? (subscription.subscription_plans!.comparison_highlights as Array<{ label: string; value: string }>)
    : [];

  const planBadgeText = subscription.subscription_plans?.badge_text;
  const planBadgeColor = subscription.subscription_plans?.badge_color;
  const periodLabel = subscription.period_display || getPeriodLabel(subscription.plan_type);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 md:py-12">
      {/* Success Header */}
      <div className="text-center space-y-3 md:space-y-4 mb-6 md:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-primary mb-2 md:mb-4">
          <CheckCircle2 className="h-7 w-7 md:h-10 md:w-10 text-white" />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold leading-tight">
          Ваша подписка активна
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground px-2">
          У вас есть полный доступ ко всем возможностям ReAge
        </p>
      </div>

      {/* Subscription Details Card */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1 md:mb-2">
                <CardTitle className="text-lg md:text-2xl break-words">
                  {subscription.subscription_plans?.display_name || 'Подписка'}
                </CardTitle>
                {planBadgeText && (
                  <Badge
                    className={
                      planBadgeColor === 'accent'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-primary text-primary-foreground'
                    }
                  >
                    {planBadgeText}
                  </Badge>
                )}
              </div>
              {subscription.subscription_plans?.description && (
                <CardDescription className="text-sm">
                  {subscription.subscription_plans.description}
                </CardDescription>
              )}
            </div>
            <Badge variant="default" className="text-xs md:text-sm shrink-0">
              {subscription.status === 'active' ? 'Активна' : subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 md:space-y-6 p-4 md:p-6 pt-0 md:pt-0">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Начало</p>
                <p className="font-medium text-sm md:text-base truncate">{formatDate(subscription.start_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Окончание</p>
                <p className="font-medium text-sm md:text-base truncate">{formatDate(subscription.end_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 md:p-4 rounded-lg bg-muted/50">
              <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground">Стоимость · {periodLabel}</p>
                <p className="font-medium text-sm md:text-base">{formatAmount(subscription.amount)} ₽</p>
              </div>
            </div>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <h3 className="font-semibold text-sm md:text-base">Что входит в ваш тариф</h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlights from admin */}
          {highlights.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm md:text-base mb-3 md:mb-4">
                Что выделяет ваш тариф
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                {highlights.map((h, i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div className="text-xs md:text-sm text-muted-foreground">{h.label}</div>
                    <div className="font-medium text-sm md:text-base mt-0.5 break-words">{h.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Trust Indicators */}
      <div className="text-center space-y-2 pt-8">
        <p className="text-sm text-muted-foreground">
          При необходимости вы можете связаться с поддержкой для изменения тарифа
        </p>
      </div>
    </div>
  );
}
