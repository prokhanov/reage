import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { SubscriptionSkeleton } from "@/components/skeletons/SubscriptionSkeleton";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Check, Calendar, CreditCard, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Subscription {
  id: string;
  plan_type: string;
  amount: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  payment_method: string | null;
  created_at: string;
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

export default function Subscription() {
  const { getUserId } = useViewAsUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, [getUserId]);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Only set subscription if status is 'active' or 'pending'
      if (data && (data.status === 'active' || data.status === 'pending')) {
        setSubscription(data);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SubscriptionSkeleton />;
  }

  // No subscription - show benefits and payment offer
  if (!subscription) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-6 relative overflow-hidden">
        <ParticleBackground />
        
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-secondary-glow/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-primary-glow/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-accent-glow/10 rounded-full blur-3xl animate-float-delayed" style={{ animationDelay: "3s" }} />
        
        <div className="container mx-auto max-w-4xl relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-4">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Подписка ReAge
          </h1>
          <p className="text-muted-foreground text-lg">
            Полный доступ к персональной медицине нового поколения
          </p>
        </div>

        <Card className="border-primary/20 shadow-neon-primary mb-6">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl">Годовая подписка</CardTitle>
            <CardDescription className="text-xl mt-2">
              <span className="text-4xl font-bold text-primary">120 000 ₽</span>
              <span className="text-muted-foreground"> / год</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            <Button 
              className="w-full h-14 text-lg bg-gradient-primary shadow-neon-primary"
              size="lg"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Оформить подписку
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Безопасная оплата. Отмена в любое время.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Гибкость</h3>
              <p className="text-sm text-muted-foreground">
                Отмените или измените план в любое время
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">AI-технологии</h3>
              <p className="text-sm text-muted-foreground">
                Передовые алгоритмы анализа здоровья
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <CreditCard className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Прозрачность</h3>
              <p className="text-sm text-muted-foreground">
                Никаких скрытых платежей и комиссий
              </p>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    );
  }

  // Has subscription - show subscription info
  const isActive = subscription.status === 'active';
  const isPending = subscription.status === 'pending';

  return (
    <div className="container mx-auto p-6 max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Моя подписка</h1>
        <p className="text-muted-foreground">
          Управление вашей подпиской ReAge
        </p>
      </div>

      <Card className="border-primary/20 shadow-neon-primary mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                Годовая подписка
                <Badge variant={isActive ? "default" : "secondary"} className="text-sm">
                  {isActive ? 'Активна' : 'Ожидает оплаты'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                {subscription.amount.toLocaleString('ru-RU')} ₽ / год
              </CardDescription>
            </div>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {subscription.start_date && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Дата начала
                </div>
                <p className="text-lg font-medium">
                  {format(new Date(subscription.start_date), 'd MMMM yyyy', { locale: ru })}
                </p>
              </div>
            )}

            {subscription.end_date && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Дата окончания
                </div>
                <p className="text-lg font-medium">
                  {format(new Date(subscription.end_date), 'd MMMM yyyy', { locale: ru })}
                </p>
              </div>
            )}

            {subscription.payment_method && (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CreditCard className="h-4 w-4" />
                  Способ оплаты
                </div>
                <p className="text-lg font-medium capitalize">
                  {subscription.payment_method}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Sparkles className="h-4 w-4" />
                Тип плана
              </div>
              <p className="text-lg font-medium capitalize">
                {subscription.plan_type === 'annual' ? 'Годовая' : subscription.plan_type}
              </p>
            </div>
          </div>

          {isPending && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-500">
                <strong>Ожидается оплата:</strong> Ваша подписка будет активирована после подтверждения оплаты.
              </p>
            </div>
          )}

          {isActive && (
            <div className="space-y-3">
              <h3 className="font-semibold">Ваши преимущества:</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {benefits.slice(0, 6).map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {isPending && (
              <Button 
                className="flex-1 bg-gradient-primary shadow-neon-primary"
                size="lg"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Оплатить сейчас
              </Button>
            )}
            {isActive && (
              <Button 
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Управление подпиской
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isActive && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Автоматическое продление</CardTitle>
            <CardDescription>
              Ваша подписка будет автоматически продлена в конце периода
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Вы можете отменить автоматическое продление в любое время. 
              После отмены подписка останется активной до окончания оплаченного периода.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
