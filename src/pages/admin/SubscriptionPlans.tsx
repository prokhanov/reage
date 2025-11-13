import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionPlans() {
  const [activeTab, setActiveTab] = useState("plans");

  return (
    <DashboardLayout>
      <div className="container max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Управление тарифами</h1>
            <p className="text-muted-foreground">
              Настройка планов подписки и цен
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать тариф
          </Button>
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
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Здесь будет список тарифов с возможностью редактирования
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Управление ценами</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Здесь будет настройка цен для разных периодов оплаты
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
