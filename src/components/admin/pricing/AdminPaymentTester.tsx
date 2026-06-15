import { useState } from "react";
import { AlertTriangle, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { usePaymentGatewayTestMode } from "@/hooks/usePaymentGatewayTestMode";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const periodLabels: Record<string, string> = {
  monthly: "Месяц",
  quarterly: "Квартал",
  semiannual: "Полгода",
  annual: "Год",
};

export function AdminPaymentTester() {
  const { toast } = useToast();
  const { data: plans, isLoading } = useSubscriptionPlans({
    includeInactivePlans: true,
    includeDisabledPricing: true,
  });
  const { data: isTestMode } = usePaymentGatewayTestMode();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handlePay = async (planId: string, pricingId: string) => {
    const key = `${planId}:${pricingId}`;
    setLoadingKey(key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Требуется вход", variant: "destructive" });
        setLoadingKey(null);
        return;
      }
      const { data, error } = await supabase.functions.invoke("robokassa-create-payment", {
        body: { planId, pricingId },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Не получен платёжный URL");
      window.location.href = data.url as string;
    } catch (e) {
      console.error(e);
      toast({
        title: "Ошибка создания платежа",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      setLoadingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  const rows = (plans || []).flatMap((plan) =>
    plan.pricing.map((p) => ({ plan, pricing: p }))
  );

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Нет доступных цен для тестирования.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тариф</TableHead>
                <TableHead>Период</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Скидка</TableHead>
                <TableHead>Статусы</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ plan, pricing }) => {
                const key = `${plan.id}:${pricing.id}`;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{plan.display_name}</TableCell>
                    <TableCell>{periodLabels[pricing.period] || pricing.period}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(pricing.amount).toLocaleString("ru-RU")} ₽
                    </TableCell>
                    <TableCell>
                      {pricing.discount_percentage > 0 ? `−${pricing.discount_percentage}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {!plan.is_active && <Badge variant="outline">тариф выкл.</Badge>}
                        {!pricing.is_enabled && <Badge variant="outline">цена выкл.</Badge>}
                        {plan.is_active && pricing.is_enabled && (
                          <Badge variant="secondary">активна</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={loadingKey !== null}
                        onClick={() => handlePay(plan.id, pricing.id)}
                      >
                        {loadingKey === key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Оплатить как клиент
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
