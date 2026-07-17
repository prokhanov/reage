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

interface NoAnswerCallbackDialogProps {
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

export function NoAnswerCallbackDialog({
  open,
  onOpenChange,
  onSuccess,
  existingBookingId,
}: NoAnswerCallbackDialogProps) {
  const [phone, setPhone] = useState("");
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
        .select("phone")
        .eq("id", userId)
        .maybeSingle();
      if (data?.phone) setPhone(formatPhone(data.phone));
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
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-callback", {
        body: {
          phone: normalized,
          booking_id: existingBookingId ?? null,
        },
      });
      if (error) throw error;
      if (data && (data as any).success === false) {
        throw new Error((data as any).error || "Не удалось отправить запрос");
      }
      toast({
        title: "Запрос отправлен",
        description: "Менеджер свяжется с вами в ближайшее время",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Ошибка",
        description: e?.message ?? "Не удалось отправить запрос",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-5 sm:p-6 gap-4">
        <DialogHeader className="text-left space-y-1.5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-primary" />
            Запросить обратный звонок
          </DialogTitle>
          <DialogDescription className="text-sm">
            Проверьте номер телефона — менеджер перезвонит вам в ближайшее время.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="no-answer-phone">Ваш телефон</Label>
          <Input
            id="no-answer-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="+7 (___) ___-__-__"
            className="h-12 text-base"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl w-full sm:w-auto"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 rounded-xl bg-gradient-primary shadow-neon-primary w-full sm:w-auto"
          >
            {loading ? "Отправка..." : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
