import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getUtm } from "@/lib/utm";
import { reachGoal } from "@/lib/yandexMetrika";

/** Оставляет только цифры и приводит к 11 знакам, начинающимся с 7. */
function normalizeRuPhoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d[0] === "8") d = "7" + d.slice(1);
  else if (d[0] !== "7") d = "7" + d;
  return d.slice(0, 11);
}

/** Форматирует ввод как +7 (910) 123-45-67 по мере набора. */
function formatRuPhoneInput(raw: string): string {
  const d = normalizeRuPhoneDigits(raw);
  if (!d) return "";
  let out = "+7";
  if (d.length > 1) out += ` (${d.slice(1, 4)}`;
  if (d.length >= 4) out += ")";
  if (d.length > 4) out += ` ${d.slice(4, 7)}`;
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  if (d.length > 9) out += `-${d.slice(9, 11)}`;
  return out;
}

export function MainCallbackCta({ id }: { id?: string }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const phoneDigits = normalizeRuPhoneDigits(phone);
  const canSubmit = consent && phoneDigits.length === 11 && status !== "loading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      if (phoneDigits.length !== 11) {
        setPhoneError("Введите номер полностью — например, +7 (910) 123-45-67");
      }
      return;
    }

    setPhoneError(null);
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("send-feedback", {
        body: {
          type: "callback",
          phone: `+${phoneDigits}`,
          utm: getUtm(),
        },
      });

      if (error || !data?.success) {
        console.error("Callback submit error", { error, data });
        setStatus("error");
        return;
      }

      reachGoal("callback_landing");
      setStatus("success");
    } catch (err) {
      console.error("Callback submit exception", err);
      setStatus("error");
    }
  };

  return (
    <section id={id} className="relative py-6 md:py-10">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <div className="rounded-2xl bg-primary/10 p-5 sm:p-6 md:p-8">
          {status === "success" ? (
            <div className="rounded-2xl bg-primary/10 p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="text-base leading-relaxed text-foreground">
                  Заявка принята — перезвоним в течение 10 минут в рабочее время и
                  поможем выбрать чек-ап или программу.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
              <div>
                <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
                  Не знаете, с чего начать?
                </h2>
                <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
                  Перезвоним и за 10 минут подберём чек-ап или программу.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <p className="text-lg font-semibold text-foreground">Оставьте телефон</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Перезвоним и согласуем удобное время
                </p>
                <Label htmlFor="main-callback-phone" className="sr-only">
                  Ваш телефон
                </Label>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                  <Input
                    id="main-callback-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(formatRuPhoneInput(e.target.value));
                      setPhoneError(null);
                    }}
                    placeholder="+7 (___) ___-__-__"
                    maxLength={18}
                    disabled={status === "loading"}
                    className="h-12 min-w-0 flex-1 border-border bg-card text-base sm:h-14"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmit}
                    className="h-12 shrink-0 whitespace-nowrap px-7 text-base font-semibold sm:h-14 sm:px-7 sm:text-lg sm:min-w-[180px]"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Отправка…
                      </>
                    ) : (
                      "Перезвоните"
                    )}
                  </Button>
                </div>
                {phoneError && <p className="mt-2 text-sm text-destructive">{phoneError}</p>}
                {status === "error" && (
                  <p className="mt-2 text-sm text-destructive">
                    Не удалось отправить заявку. Попробуйте ещё раз позже.
                  </p>
                )}

                <label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    className="mt-0.5"
                    disabled={status === "loading"}
                  />
                  <span>
                    Согласен на{" "}
                    <a
                      href="/legal/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground"
                    >
                      обработку персональных данных
                    </a>
                  </span>
                </label>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
