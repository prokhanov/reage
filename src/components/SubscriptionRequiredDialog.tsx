import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addYears } from "date-fns";

interface SubscriptionRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const benefits = [
  "Неограниченный доступ ко всем анализам",
  "Персонализированные рекомендации от AI",
  "Визиты медсестры на дом",
  "Приоритетная поддержка",
  "Отслеживание биомаркеров в реальном времени",
  "Детальные тренды и аналитика",
  "Консультации специалистов",
  "Индивидуальные планы здоровья"
];

export function SubscriptionRequiredDialog({
  open,
  onOpenChange,
  onSuccess
}: SubscriptionRequiredDialogProps) {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateSubscription = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date();
      const endDate = addYears(startDate, 1);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'annual',
          amount: 120000,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_method: 'test'
        });

      if (error) throw error;

      toast({
        title: "Подписка активирована!",
        description: "Ваша годовая подписка успешно оформлена. Теперь вы можете записаться на анализы.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Для записи на анализы требуется подписка
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <p className="text-muted-foreground">
              Оформите подписку ReAge для доступа к персональной медицине нового поколения
            </p>
          </div>

          <Card className="border-primary/20 shadow-neon-primary">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Годовая подписка</h3>
                <div className="text-3xl font-bold text-primary">
                  120 000 ₽
                  <span className="text-lg text-muted-foreground font-normal"> / год</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full h-12 text-base bg-gradient-primary shadow-neon-primary"
                onClick={handleCreateSubscription}
                disabled={creating}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {creating ? "Оформляем..." : "Оформить подписку"}
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Безопасная оплата. Отмена в любое время.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
