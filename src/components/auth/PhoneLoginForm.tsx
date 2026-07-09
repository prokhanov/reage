import { useEffect, useState } from "react";
import { PhoneIcon, KeyRound, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneInput, isPhoneValid } from "@/components/ui/phone-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Локальное состояние формы — чтобы ввод номера / OTP не перерендеривал Auth.tsx.
 */
export function PhoneLoginForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPhoneError(null);
    if (!isPhoneValid(phone)) {
      setPhoneError("Введите корректный номер телефона");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp-send", { body: { phone } });
      if (error) {
        setPhoneError(error.message || "Не удалось отправить код");
        return;
      }
      if (data?.error) {
        setPhoneError(data.error);
        if (data.resendInSec) setResendIn(data.resendInSec);
        return;
      }
      setOtp("");
      setStep("code");
      setResendIn(data?.resendInSec ?? 60);
      toast({ title: "Код отправлен", description: "Введите 4-значный код из SMS" });
    } catch (e: any) {
      setPhoneError(e?.message || "Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-otp-verify", {
        body: { phone, code: otp },
      });
      if (error) {
        toast({ title: "Ошибка", description: error.message || "Неверный код", variant: "destructive" });
        setOtp("");
        return;
      }
      if (data?.error) {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
        setOtp("");
        return;
      }
      if (!data?.token_hash || !data?.email) {
        toast({ title: "Ошибка", description: "Не удалось войти", variant: "destructive" });
        return;
      }
      const { error: vErr } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      } as any);
      if (vErr) {
        toast({ title: "Ошибка входа", description: vErr.message, variant: "destructive" });
        return;
      }
      toast({ title: "Добро пожаловать!", description: "Вы успешно вошли" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось проверить код", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (step === "phone") {
    return (
      <form onSubmit={sendOtp} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 text-primary" />
            Номер телефона
          </Label>
          <PhoneInput
            id="phone"
            value={phone}
            onChange={(v) => { setPhone(v); if (phoneError) setPhoneError(null); }}
            placeholder="+7 (999) 123-45-67"
            className="w-full"
            inputClassName="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {phoneError ? (
            <p className="text-xs text-destructive pt-1">{phoneError}</p>
          ) : (
            <p className="text-xs text-muted-foreground pt-1">
              Мы отправим SMS с одноразовым кодом для входа
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full h-12 bg-gradient-primary hover:shadow-neon-primary transition-all duration-300 text-base font-medium group"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Отправка...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Получить код
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="space-y-6">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Код из SMS
        </Label>
        <p className="text-sm text-muted-foreground">
          Отправили 4-значный код на{" "}
          <span className="text-foreground font-medium">{phone}</span>
        </p>
        <div className="flex justify-center pt-2">
          <InputOTP maxLength={4} value={otp} onChange={setOtp} autoFocus>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
              <InputOTPSlot index={1} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
              <InputOTPSlot index={2} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
              <InputOTPSlot index={3} className="h-14 w-14 text-2xl border-border/50 bg-background/50" />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-gradient-primary hover:shadow-neon-primary transition-all duration-300 text-base font-medium"
        disabled={loading || otp.length !== 4}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Проверка...
          </span>
        ) : (
          "Войти"
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => { setStep("phone"); setOtp(""); }}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Изменить номер
        </button>
        <button
          type="button"
          disabled={resendIn > 0 || loading}
          onClick={() => sendOtp()}
          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-muted-foreground"
        >
          {resendIn > 0 ? `Отправить снова через ${resendIn}с` : "Отправить код снова"}
        </button>
      </div>
    </form>
  );
}
