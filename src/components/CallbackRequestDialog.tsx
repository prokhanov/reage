import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { PassportFields, isPassportValid } from "./PassportFields";

interface CallbackRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingBookingId?: string | null;
}

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
  if (!digits) return "";
  const d = digits.padEnd(11, "_").split("");
  return `+7 (${d.slice(1, 4).join("")}) ${d.slice(4, 7).join("")}-${d
    .slice(7, 9)
    .join("")}-${d.slice(9, 11).join("")}`.replace(/_/g, "_");
};

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").replace(/^8/, "7");
  return digits.length === 11 ? `+${digits}` : "";
};

export function CallbackRequestDialog({
  open,
  onOpenChange,
  onSuccess,
  existingBookingId,
}: CallbackRequestDialogProps) {
  const [phone, setPhone] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { getUserId } = useViewAsUser();

  useEffect(() => {
    if (!open) return;
    (async () => {
      const userId = await getUserId();
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("phone, passport_series, passport_number")
        .eq("id", userId)
        .maybeSingle();
      if (data?.phone) setPhone(formatPhone(data.phone));
      setPassportSeries((data as any)?.passport_series || "");
      setPassportNumber((data as any)?.passport_number || "");
    })();
  }, [open, getUserId]);

  const handleSubmit = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      toast({
        title: "Введите телефон",
        description: "Укажите корректный номер для связи",
        variant: "destructive",
      });
      return;
    }
    if (!isPassportValid(passportSeries, passportNumber)) {
      toast({
        title: "Заполните паспортные данные",
        description: "Серия — 4 цифры, номер — 6 цифр",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не удалось определить пользователя");

      await supabase
        .from("profiles")
        .update({
          phone: normalized,
          passport_series: passportSeries,
          passport_number: passportNumber,
        } as any)
        .eq("id", userId);

      if (existingBookingId) {
        const { error } = await supabase
          .from("analysis_bookings")
          .update({
            status: "waiting_call",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingBookingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("analysis_bookings").insert({
          user_id: userId,
          status: "waiting_call",
          booking_date: new Date().toISOString().slice(0, 10),
          booking_time: "00:00",
          address: "",
        });
        if (error) throw error;
      }

      toast({
        title: "Заявка принята",
        description: "Менеджер свяжется с вами в ближайшее время",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Ошибка",
        description: e?.message ?? "Не удалось отправить заявку",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Мы вам перезвоним
          </DialogTitle>
          <DialogDescription>
            Менеджер свяжется с вами для согласования удобной даты, времени и адреса визита медсестры.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="callback-phone-input">Ваш телефон</Label>
            <Input
              id="callback-phone-input"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
            />
          </div>
          <PassportFields
            series={passportSeries}
            number={passportNumber}
            onSeriesChange={setPassportSeries}
            onNumberChange={setPassportNumber}
            showIcon={false}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isPassportValid(passportSeries, passportNumber)}
          >
            {loading ? "Отправка..." : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
