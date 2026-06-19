import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { PromoAppliesTo, PromoDiscountType, usePromoMutations } from "@/hooks/usePromoCodes";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { Download } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneratePromoBatchDialog({ open, onOpenChange }: Props) {
  const { generateBatch } = usePromoMutations();
  const { data: plans } = useSubscriptionPlans({ includeInactivePlans: true, includeDisabledPricing: true });

  const [batchName, setBatchName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [prefix, setPrefix] = useState("PROMO");
  const [count, setCount] = useState("100");
  const [suffixLength, setSuffixLength] = useState("6");
  const [discountType, setDiscountType] = useState<PromoDiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [appliesTo, setAppliesTo] = useState<PromoAppliesTo>("all_plans");
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState("1");
  const [onePerUser, setOnePerUser] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [generated, setGenerated] = useState<{ code: string }[] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await generateBatch.mutateAsync({
      prefix,
      count: Number(count) || 1,
      suffix_length: Number(suffixLength) || 6,
      batch_name: batchName || undefined,
      batch_description: batchDescription || undefined,
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      applies_to: appliesTo,
      plan_links: selectedPlans.map((id) => ({ plan_id: id })),
      max_uses: maxUses ? Number(maxUses) : null,
      one_per_user: onePerUser,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: isActive,
    });
    setGenerated(result.codes);
  };

  const handleDownloadCsv = () => {
    if (!generated) return;
    const rows = ["code", ...generated.map((c) => c.code)].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-codes-${batchName || prefix || "batch"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setGenerated(null);
      setBatchName("");
      setBatchDescription("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Массовая генерация промокодов</DialogTitle>
          <DialogDescription>
            Создаёт партию промокодов с одинаковыми параметрами
          </DialogDescription>
        </DialogHeader>

        {generated ? (
          <div className="space-y-4">
            <div className="rounded-md border p-4 bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">
                Сгенерировано кодов: <span className="font-medium text-foreground">{generated.length}</span>
              </div>
              <div className="max-h-64 overflow-y-auto font-mono text-xs space-y-1">
                {generated.slice(0, 200).map((c) => (
                  <div key={c.code}>{c.code}</div>
                ))}
                {generated.length > 200 && (
                  <div className="text-muted-foreground">… ещё {generated.length - 200}. Скачайте CSV для полного списка.</div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Закрыть</Button>
              <Button onClick={handleDownloadCsv}>
                <Download className="h-4 w-4 mr-2" />
                Скачать CSV
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название партии</Label>
                <Input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Новогодняя кампания 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Префикс</Label>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="FRIEND"
                />
              </div>
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input
                  type="number"
                  min="1"
                  max="5000"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Длина суффикса</Label>
                <Input
                  type="number"
                  min="4"
                  max="12"
                  value={suffixLength}
                  onChange={(e) => setSuffixLength(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип скидки</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as PromoDiscountType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Процент (%)</SelectItem>
                    <SelectItem value="fixed">Фикс. сумма (₽)</SelectItem>
                    <SelectItem value="free_period">Бесплатные месяцы</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Значение</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Область действия</Label>
              <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as PromoAppliesTo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_plans">Все тарифы</SelectItem>
                  <SelectItem value="specific">Конкретные тарифы</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {appliesTo === "specific" && (
              <div className="space-y-2 rounded-md border p-3">
                <Label>Выберите тарифы</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(plans ?? []).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedPlans.includes(p.id)}
                        onChange={(e) => {
                          setSelectedPlans((prev) =>
                            e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                          );
                        }}
                      />
                      {p.display_name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Лимит на код</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="∞"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3">
                <Label>Один раз на пользователя</Label>
                <Switch checked={onePerUser} onCheckedChange={setOnePerUser} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Действует с</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Действует до</Label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Активны сразу</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={generateBatch.isPending}>
                {generateBatch.isPending && <ButtonSpinner className="mr-2" />}
                Сгенерировать
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
