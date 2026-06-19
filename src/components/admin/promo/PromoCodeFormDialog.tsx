import { useEffect, useState } from "react";
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
import {
  PromoCode,
  PromoAppliesTo,
  PromoDiscountType,
  usePromoMutations,
} from "@/hooks/usePromoCodes";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { usePromoSettings } from "@/hooks/usePromoSettings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoCode?: PromoCode | null;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCode(prefix: string, len = 8): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[arr[i] % ALPHABET.length];
  return prefix ? `${prefix.toUpperCase()}-${s}` : s;
}

export function PromoCodeFormDialog({ open, onOpenChange, promoCode }: Props) {
  const isEdit = !!promoCode;
  const { createPromoCode, updatePromoCode } = usePromoMutations();
  const { data: plans } = useSubscriptionPlans({ includeInactivePlans: true, includeDisabledPricing: true });
  const { data: settings } = usePromoSettings();
  const defaultPrefix = settings?.default_prefix ?? "PROMO";

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<PromoDiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [appliesTo, setAppliesTo] = useState<PromoAppliesTo>("all_plans");
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState<string>("");
  const [onePerUser, setOnePerUser] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && promoCode) {
      setCode(promoCode.code);
      setDiscountType(promoCode.discount_type);
      setDiscountValue(String(promoCode.discount_value));
      setAppliesTo(promoCode.applies_to);
      setMaxUses(promoCode.max_uses != null ? String(promoCode.max_uses) : "");
      setOnePerUser(promoCode.one_per_user);
      setStartsAt(promoCode.starts_at ? promoCode.starts_at.slice(0, 16) : "");
      setExpiresAt(promoCode.expires_at ? promoCode.expires_at.slice(0, 16) : "");
      setIsActive(promoCode.is_active);
      setNotes(promoCode.notes ?? "");
    } else if (open) {
      setCode(genCode(defaultPrefix));
      setDiscountType("percent");
      setDiscountValue("10");
      setAppliesTo("all_plans");
      setSelectedPlans([]);
      setMaxUses("");
      setOnePerUser(true);
      setStartsAt("");
      setExpiresAt("");
      setIsActive(true);
      setNotes("");
    }
  }, [open, promoCode, defaultPrefix]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      applies_to: appliesTo,
      max_uses: maxUses ? Number(maxUses) : null,
      one_per_user: onePerUser,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: isActive,
      notes: notes || null,
      plan_links: selectedPlans.map((id) => ({ plan_id: id })),
    };
    if (isEdit && promoCode) {
      await updatePromoCode.mutateAsync({ id: promoCode.id, ...payload });
    } else {
      await createPromoCode.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const pending = createPromoCode.isPending || updatePromoCode.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать промокод" : "Создать промокод"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Изменение параметров существующего промокода" : "Создание одиночного промокода"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Код</Label>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PROMO-XXXX"
                required
                className="font-mono"
              />
              {!isEdit && (
                <Button type="button" variant="outline" onClick={() => setCode(genCode(defaultPrefix))}>
                  Сгенерировать
                </Button>
              )}
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
              <div className="space-y-2 max-h-48 overflow-y-auto">
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
              <Label>Лимит использований</Label>
              <Input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="∞"
              />
            </div>
            <div className="space-y-2">
              <Label>Один раз на пользователя</Label>
              <div className="flex items-center h-10">
                <Switch checked={onePerUser} onCheckedChange={setOnePerUser} />
              </div>
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
            <Label>Активен</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label>Заметки (внутренние)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <ButtonSpinner className="mr-2" />}
              {isEdit ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
