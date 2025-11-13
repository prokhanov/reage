import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatePlanDialog } from "@/components/admin/CreatePlanDialog";
import { PlansList } from "@/components/admin/PlansList";
import { PricingTable } from "@/components/admin/PricingTable";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionPlans() {
  const [activeTab, setActiveTab] = useState("plans");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const { data: plans, isLoading } = useSubscriptionPlans(true);

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  return (
    <div className="container max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Управление тарифами</h1>
          <p className="text-muted-foreground">
            Настройка планов подписки и цен
          </p>
        </div>
        <CreatePlanDialog />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="plans">Тарифы</TabsTrigger>
          <TabsTrigger value="pricing">Цены и периоды</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Управление тарифами</CardTitle>
              <CardDescription>
                Перетаскивайте карточки для изменения порядка отображения
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : plans && plans.length > 0 ? (
                <PlansList plans={plans} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Нет тарифов. Создайте первый тариф.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Управление ценами</CardTitle>
              <CardDescription>
                Настройка цен для разных периодов оплаты
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : plans && plans.length > 0 ? (
                <>
                  <div className="mb-6">
                    <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Выберите тариф" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPlan ? (
                    <PricingTable plan={selectedPlan} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Выберите тариф для настройки цен
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Сначала создайте тарифы
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
