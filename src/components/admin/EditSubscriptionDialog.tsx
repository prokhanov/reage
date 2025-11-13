import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { addMonths, format } from "date-fns";

interface EditSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  subscription: any;
  patientId: string;
}

export function EditSubscriptionDialog({
  open,
  onClose,
  subscription,
  patientId,
}: EditSubscriptionDialogProps) {
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedPricingId, setSelectedPricingId] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: plans, isLoading: loadingPlans } = useSubscriptionPlans();

  useEffect(() => {
    if (subscription) {
      setSelectedPlanId(subscription.plan_id || "");
      setSelectedPricingId(subscription.pricing_id || "");
      setStatus(subscription.status || "active");
      setStartDate(subscription.start_date ? format(new Date(subscription.start_date), "yyyy-MM-dd") : "");
      setEndDate(subscription.end_date ? format(new Date(subscription.end_date), "yyyy-MM-dd") : "");
      setAmount(subscription.amount?.toString() || "");
    }
  }, [subscription]);

  // Get available pricing for selected plan
  const selectedPlan = plans?.find(p => p.id === selectedPlanId);
  const availablePricing = selectedPlan?.pricing || [];

  // Auto-calculate end date when pricing changes
  useEffect(() => {
    if (selectedPricingId && startDate) {
      const pricing = availablePricing.find(p => p.id === selectedPricingId);
      if (pricing) {
        const start = new Date(startDate);
        const end = addMonths(start, pricing.duration_months);
        setEndDate(format(end, "yyyy-MM-dd"));
        setAmount(pricing.amount.toString());
      }
    }
  }, [selectedPricingId, startDate, availablePricing]);

  const handleSave = async () => {
    if (!selectedPlanId || !selectedPricingId || !startDate || !endDate) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const pricing = availablePricing.find(p => p.id === selectedPricingId);
      
      if (subscription?.id) {
        // Update existing subscription
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_id: selectedPlanId,
            pricing_id: selectedPricingId,
            plan_type: pricing?.period || "annual",
            status,
            start_date: startDate,
            end_date: endDate,
            amount: parseFloat(amount),
          })
          .eq("id", subscription.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            user_id: patientId,
            plan_id: selectedPlanId,
            pricing_id: selectedPricingId,
            plan_type: pricing?.period || "annual",
            status,
            start_date: startDate,
            end_date: endDate,
            amount: parseFloat(amount),
            payment_method: "card",
          });

        if (error) throw error;
      }

      toast({
        title: "Успешно сохранено",
        description: "Подписка пациента обновлена",
      });

      queryClient.invalidateQueries({ queryKey: ["patient-info", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      onClose();
    } catch (error: any) {
      console.error("Error saving subscription:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить подписку",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {subscription?.id ? "Редактировать подписку" : "Создать подписку"}
          </DialogTitle>
          <DialogDescription>
            Измените параметры подписки пациента
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan">Тарифный план</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={loadingPlans}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите план" />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlanId && (
            <div className="space-y-2">
              <Label htmlFor="pricing">Период оплаты</Label>
              <Select value={selectedPricingId} onValueChange={setSelectedPricingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите период" />
                </SelectTrigger>
                <SelectContent>
                  {availablePricing.map((pricing) => (
                    <SelectItem key={pricing.id} value={pricing.id}>
                      {pricing.period_display} - {pricing.amount} ₽
                      {pricing.discount_percentage > 0 && ` (скидка ${pricing.discount_percentage}%)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Статус</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активна</SelectItem>
                <SelectItem value="pending">Ожидает оплаты</SelectItem>
                <SelectItem value="cancelled">Отменена</SelectItem>
                <SelectItem value="expired">Истекла</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Дата начала</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Дата окончания</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="120000"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingPlans}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
