import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, CreditCard, Package, ArrowRight, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      if (error) throw error;

      // Log history
      await supabase.from('subscription_history').insert({
        subscription_id: subscription.id,
        user_id: user?.id || '',
        action: 'cancelled',
        changed_by: user?.id,
        old_data: { status: 'active' },
        new_data: { status: 'cancelled' },
        note: 'Отменено пользователем',
      });

      toast({
        title: "Подписка отменена",
        description: "Ваша подписка успешно отменена. Доступ будет сохранен до окончания оплаченного периода.",
      });

      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowCancelDialog(false);
      
      // Явное обновление UI - переход на страницу выбора тарифа
      navigate('/subscription', { replace: true });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отменить подписку. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };
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
              <CardTitle className="text-lg md:text-2xl mb-1 md:mb-2 break-words">
                {subscription.subscription_plans?.display_name || 'Подписка'}
              </CardTitle>
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
                <p className="text-xs md:text-sm text-muted-foreground">Стоимость</p>
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

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => window.location.href = '/dashboard'}
            >
              Перейти к анализам
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="sm:w-auto text-destructive hover:text-destructive"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Отменить подписку
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить подписку?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отменить подписку? Доступ к функциям будет сохранен до окончания оплаченного периода ({formatDate(subscription.end_date)}), после чего подписка прекратит действие.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Не отменять</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Отмена..." : "Да, отменить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trust Indicators */}
      <div className="text-center space-y-2 pt-8">
        <p className="text-sm text-muted-foreground">
          При необходимости вы можете связаться с поддержкой для изменения тарифа
        </p>
      </div>
    </div>
  );
}
