import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePricing } from "@/hooks/usePricing";
import { SubscriptionPricing } from "@/hooks/useSubscriptionPlans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditPricingDialogProps {
  pricing: SubscriptionPricing | null;
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const periodOptions = [
  { value: "monthly", label: "Месяц", months: 1 },
  { value: "quarterly", label: "Квартал", months: 3 },
  { value: "semiannual", label: "Полгода", months: 6 },
  { value: "annual", label: "Год", months: 12 },
];

export function EditPricingDialog({ pricing, planId, open, onOpenChange }: EditPricingDialogProps) {
  const [period, setPeriod] = useState("monthly");
  const [periodDisplay, setPeriodDisplay] = useState("Месяц");
  const [durationMonths, setDurationMonths] = useState(1);
  const [amount, setAmount] = useState("");

  const { createPricing, updatePricing } = usePricing();
  const isEditing = !!pricing;

  useEffect(() => {
    if (pricing) {
      setPeriod(pricing.period);
      setPeriodDisplay(pricing.period_display);
      setDurationMonths(pricing.duration_months);
      setAmount(pricing.amount.toString());
    } else {
      setPeriod("monthly");
      setPeriodDisplay("Месяц");
      setDurationMonths(1);
      setAmount("");
    }
  }, [pricing]);

  const handlePeriodChange = (value: string) => {
    const option = periodOptions.find((o) => o.value === value);
    if (option) {
      setPeriod(value);
      setPeriodDisplay(option.label);
      setDurationMonths(option.months);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      plan_id: planId,
      period,
      period_display: periodDisplay,
      duration_months: durationMonths,
      amount: Number(amount),
    };

    if (isEditing) {
      await updatePricing.mutateAsync({
        ...data,
        id: pricing.id,
        is_enabled: pricing.is_enabled,
      });
    } else {
      await createPricing.mutateAsync(data);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редактировать цену" : "Добавить цену"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="period">Период</Label>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationMonths">Длительность (мес.)</Label>
              <Input
                id="durationMonths"
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Цена (₽)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="120000"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createPricing.isPending || updatePricing.isPending}
            >
              {(createPricing.isPending || updatePricing.isPending) && <ButtonSpinner className="mr-2" />}
              {createPricing.isPending || updatePricing.isPending
                ? "Сохранение..."
                : isEditing
                ? "Сохранить"
                : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
