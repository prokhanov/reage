import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Tag, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface AppliedPromo {
  code: string;
  promo_code_id: string;
  discount_type: "percent" | "fixed" | "free_period";
  discount_value: number;
  discount_amount: number; // 0 для free_period (или для предварительного применения без контекста)
  final_amount: number;
  original_amount: number;
  applies_to?: "all" | "specific";
  allowed_plans?: Array<{ plan_id: string; pricing_id: string | null }>;
}

interface Props {
  /** Если передан — будет live-валидация и расчёт скидки. */
  context?: { planId: string; pricingId: string; amount: number } | null;
  applied: AppliedPromo | null;
  onApplied: (promo: AppliedPromo | null) => void;
  className?: string;
}

export function formatPromoBenefit(p: Pick<AppliedPromo, "discount_type" | "discount_value">): string {
  if (p.discount_type === "percent") return `−${p.discount_value}%`;
  if (p.discount_type === "fixed") return `−${Number(p.discount_value).toLocaleString("ru-RU")} ₽`;
  if (p.discount_type === "free_period") return `+${p.discount_value} мес. бесплатно`;
  return "—";
}

/** Применим ли промокод к данному тарифу/цене */
export function promoAppliesToPricing(
  promo: AppliedPromo | null | undefined,
  planId: string,
  pricingId: string,
): boolean {
  if (!promo) return false;
  if (!promo.applies_to || promo.applies_to === "all") return true;
  if (!promo.allowed_plans?.length) return false;
  return promo.allowed_plans.some(
    (a) => a.plan_id === planId && (a.pricing_id == null || a.pricing_id === pricingId),
  );
}

export function PromoCodeField({ context, applied, onApplied, className }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      if (context) {
        // Серверная валидация против выбранного тарифа
        const { data, error } = await supabase.rpc("apply_promo_code", {
          p_code: trimmed,
          p_plan_id: context.planId,
          p_pricing_id: context.pricingId,
          p_amount: context.amount,
        });
        if (error) throw error;
        const result = data as any;
        if (!result?.success) {
          toast({
            title: "Промокод не применён",
            description: result?.error ?? "Не удалось применить промокод",
            variant: "destructive",
          });
          return;
        }
        onApplied({
          code: result.code,
          promo_code_id: result.promo_code_id,
          discount_type: result.discount_type,
          discount_value: Number(result.discount_value),
          discount_amount: Number(result.discount_amount ?? 0),
          final_amount: Number(result.final_amount),
          original_amount: Number(result.original_amount),
          applies_to: result.applies_to ?? "all",
          allowed_plans: Array.isArray(result.allowed_plans) ? result.allowed_plans : [],
        });
        toast({ title: "Промокод применён", description: `Скидка: ${formatPromoBenefit(result)}` });
      } else {
        // Контекста нет — только сохраняем код. Финальная валидация на бэкенде при оплате.
        onApplied({
          code: trimmed.toUpperCase(),
          promo_code_id: "",
          discount_type: "percent",
          discount_value: 0,
          discount_amount: 0,
          final_amount: 0,
          original_amount: 0,
        });
        toast({
          title: "Промокод сохранён",
          description: "Скидка будет применена при оплате выбранного тарифа.",
        });
      }
      setCode("");
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onApplied(null);
    setCode("");
  };

  if (applied) {
    const benefit = formatPromoBenefit(applied);
    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-500/40 bg-green-500/5 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Check className="h-4 w-4 text-green-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-medium truncate">{applied.code}</span>
                <span className="inline-flex items-center rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                  {benefit}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {applied.applies_to === "specific"
                  ? "Действует на выбранные тарифы"
                  : "Действует на все тарифы"}
              </div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={cn("w-full text-center", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Tag className="h-4 w-4" />
          У меня есть промокод
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          placeholder="Введите промокод"
          className="font-mono"
          disabled={loading}
        />
        <Button type="button" onClick={handleApply} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setCode("");
          }}
          disabled={loading}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}
