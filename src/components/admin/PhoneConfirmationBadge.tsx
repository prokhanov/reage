import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Phone, ShieldCheck, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PhoneInput, getNormalizedPhone, isPhoneValid } from "@/components/ui/phone-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhoneConfirmationBadgeProps {
  phone: string | null;
  isVerified: boolean;
  onUpdated?: (phone: string) => void;
}

function formatDisplay(digits: string | null | undefined): string {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("7") && d.length === 11) {
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  }
  return `+${d}`;
}

export function PhoneConfirmationBadge({ phone, isVerified, onUpdated }: PhoneConfirmationBadgeProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stage, setStage] = useState<"edit" | "code">("edit");
  const [input, setInput] = useState<string>(phone ? `+${phone}` : "");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!dialogOpen) {
      setStage("edit");
      setOtp("");
      setInput(phone ? `+${phone}` : "");
    }
  }, [dialogOpen, phone]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const normalized = getNormalizedPhone(input);
  const valid = isPhoneValid(input);

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
      onUpdated?.(normalized);
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  if (isVerified && phone) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          </TooltipTrigger>
          <TooltipContent>Телефон подтверждён</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <Badge
        variant="outline"
        className="text-xs cursor-pointer border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
        onClick={(e) => {
          e.stopPropagation();
          setDialogOpen(true);
        }}
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Телефон не подтверждён
      </Badge>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {stage === "edit" ? (
                <Phone className="h-6 w-6 text-primary" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-primary" />
              )}
            </div>
            <DialogTitle className="text-center">
              {stage === "edit" ? "Подтверждение телефона" : "Введите код из SMS"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {stage === "edit"
                ? "Укажите номер телефона — мы отправим 4-значный код по SMS."
                : (
                  <>
                    Код отправлен на{" "}
                    <span className="font-medium text-foreground">{formatDisplay(normalized)}</span>
                  </>
                )}
            </DialogDescription>
          </DialogHeader>

          {stage === "edit" ? (
            <div className="space-y-4 py-2">
              <PhoneInput value={input} onChange={setInput} />
              <p className="text-xs text-muted-foreground">
                Начните с «+» и кода страны. Страна определится автоматически.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
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
                    <InputOTPSlot index={0} className="h-14 w-14 text-2xl" />
                    <InputOTPSlot index={1} className="h-14 w-14 text-2xl" />
                    <InputOTPSlot index={2} className="h-14 w-14 text-2xl" />
                    <InputOTPSlot index={3} className="h-14 w-14 text-2xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {verifying && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Проверка кода...
                </p>
              )}
              <div className="text-center">
                <button
                  type="button"
                  disabled={resendIn > 0 || sending}
                  onClick={handleSend}
                  className="text-sm text-primary disabled:text-muted-foreground hover:underline underline-offset-2"
                >
                  {resendIn > 0 ? `Отправить снова через ${resendIn}с` : "Отправить код снова"}
                </button>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between gap-2">
            {stage === "edit" ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSend} disabled={!valid || sending}>
                  {sending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Phone className="w-4 h-4 mr-2" />
                  )}
                  Отправить код
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  setStage("edit");
                  setOtp("");
                }}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Изменить номер
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
