import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PhoneInput, getNormalizedPhone, isPhoneValid, formatPhone } from "@/components/ui/phone-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { CheckCircle2, ShieldCheck, Loader2, Pencil } from "lucide-react";

interface PhoneChangeFieldProps {
  currentPhone: string | null;
  isVerified: boolean;
  onUpdated: (phone: string) => void;
}

type Stage = "view" | "edit" | "code";

function formatDisplay(digits: string | null | undefined): string {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("7") && d.length === 11) {
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  }
  return `+${d}`;
}

export function PhoneChangeField({ currentPhone, isVerified, onUpdated }: PhoneChangeFieldProps) {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("view");
  const initialPhone = (() => {
    const d = (currentPhone || "").replace(/\D/g, "");
    return d ? formatPhone(d) : "";
  })();
  const [phone, setPhone] = useState<string>(initialPhone);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    const d = (currentPhone || "").replace(/\D/g, "");
    setPhone(d ? formatPhone(d) : "");
  }, [currentPhone]);

  const normalized = useMemo(() => getNormalizedPhone(phone), [phone]);
  const valid = isPhoneValid(phone);
  const changed = normalized !== (currentPhone || "");

  const handleSend = async () => {
    if (!valid) {
      toast({ title: "Некорректный номер", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-change-send", {
        body: { phone: normalized },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        toast({ title: "Не удалось отправить код", description: data.error, variant: "destructive" });
        if (typeof data.resendInSec === "number") setResendIn(data.resendInSec);
        return;
      }
      setStage("code");
      setOtp("");
      setResendIn(data?.resendInSec ?? 60);
      toast({ title: "Код отправлен", description: `SMS на ${formatDisplay(normalized)}` });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (codeValue: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-change-verify", {
        body: { phone: normalized, code: codeValue },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        toast({ title: "Неверный код", description: data.error, variant: "destructive" });
        setOtp("");
        return;
      }
      toast({ title: "Номер подтверждён ✅" });
      onUpdated(normalized);
      setStage("view");
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  // ----- View mode -----
  if (stage === "view") {
    return (
      <div className="space-y-2">
        <Label>Телефон</Label>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {currentPhone ? (
              <>
                <span className="font-medium truncate">{formatDisplay(currentPhone)}</span>
                {isVerified ? (
                  <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3" />
                    Подтверждён
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Не подтверждён
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Номер не указан</span>
            )}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setStage("edit")} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            {currentPhone ? "Изменить" : "Добавить"}
          </Button>
        </div>
      </div>
    );
  }

  // ----- Edit / Code mode -----
  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <Label>Телефон</Label>
        <button
          type="button"
          onClick={() => {
            setStage("view");
            setOtp("");
            setPhone(currentPhone ? `+${currentPhone}` : "");
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Отмена
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <PhoneInput value={phone} onChange={setPhone} className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        {stage === "edit" && (
          <Button
            type="button"
            size="sm"
            className="h-12 px-3 shrink-0 gap-1.5"
            disabled={!valid || !changed || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span className="hidden sm:inline">Подтвердить</span>
          </Button>
        )}
      </div>

      {stage === "code" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Код отправлен на <span className="font-medium text-foreground">{formatDisplay(normalized)}</span>
          </p>
          <div className="flex justify-center">
            <InputOTP
              maxLength={4}
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (v.length === 4 && !verifying) handleVerify(v);
              }}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-xl" />
                <InputOTPSlot index={1} className="h-12 w-12 text-xl" />
                <InputOTPSlot index={2} className="h-12 w-12 text-xl" />
                <InputOTPSlot index={3} className="h-12 w-12 text-xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setStage("edit");
                setOtp("");
              }}
            >
              Изменить номер
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || sending}
              onClick={handleSend}
              className="text-primary disabled:text-muted-foreground hover:underline underline-offset-2"
            >
              {resendIn > 0 ? `Отправить снова через ${resendIn}с` : "Отправить код снова"}
            </button>
          </div>
          {verifying && (
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Проверка кода...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
