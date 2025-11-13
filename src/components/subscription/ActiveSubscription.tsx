import { useState } from "react";
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
    subscription_plans?: {
      display_name: string;
      description: string | null;
      features: any;
    } | null;
  };
}

export function ActiveSubscription({ subscription }: ActiveSubscriptionProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Подписка отменена",
        description: "Ваша подписка успешно отменена. Доступ будет сохранен до окончания оплаченного периода.",
      });

      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowCancelDialog(false);
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
    <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Success Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Ваша подписка активна
        </h1>
        <p className="text-lg text-muted-foreground">
          У вас есть полный доступ ко всем возможностям ReAge
        </p>
      </div>

      {/* Subscription Details Card */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">
                {subscription.subscription_plans?.display_name || 'Подписка'}
              </CardTitle>
              <CardDescription>
                {subscription.subscription_plans?.description}
              </CardDescription>
            </div>
            <Badge variant="default" className="text-sm">
              {subscription.status === 'active' ? 'Активна' : subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Начало</p>
                <p className="font-medium">{formatDate(subscription.start_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Окончание</p>
                <p className="font-medium">{formatDate(subscription.end_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Стоимость</p>
                <p className="font-medium">{formatAmount(subscription.amount)} ₽</p>
              </div>
            </div>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Что входит в ваш тариф</h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
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
              className="sm:w-auto"
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
