import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Tag, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface AppliedPromo {
  code: string;
  promo_code_id: string;
  discount_type: "percent" | "fixed" | "free_period";
  discount_value: number;
  discount_amount: number; // 0 для free_period
  final_amount: number;
  original_amount: number;
}

interface Props {
  /** Если передан — будет live-валидация и расчёт скидки. */
  context?: { planId: string; pricingId: string; amount: number } | null;
  applied: AppliedPromo | null;
  onApplied: (promo: AppliedPromo | null) => void;
  className?: string;
}

export function PromoCodeField({ context, applied, onApplied, className }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Если контекст поменялся (выбран другой тариф) — сбросить применённый промокод
  useEffect(() => {
    if (applied && context && applied.original_amount !== context.amount) {
      onApplied(null);
      toast({
        title: "Промокод сброшен",
        description: "Применённый промокод снят после смены тарифа. Примените заново.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.planId, context?.pricingId, context?.amount]);

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
        });
        toast({ title: "Промокод применён", description: `Скидка: ${formatDiscount(result)}` });
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
    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-500/40 bg-green-500/5 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Check className="h-4 w-4 text-green-500 shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-sm font-medium truncate">{applied.code}</div>
              {applied.original_amount > 0 && (
                <div className="text-xs text-muted-foreground">
                  {applied.discount_type === "free_period"
                    ? `+${applied.discount_value} мес. бесплатно`
                    : `Скидка ${applied.discount_amount.toLocaleString("ru-RU")} ₽ → к оплате ${applied.final_amount.toLocaleString("ru-RU")} ₽`}
                </div>
              )}
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

function formatDiscount(r: any): string {
  if (r.discount_type === "percent") return `${r.discount_value}%`;
  if (r.discount_type === "fixed") return `${Number(r.discount_amount).toLocaleString("ru-RU")} ₽`;
  if (r.discount_type === "free_period") return `+${r.discount_value} мес.`;
  return "—";
}
