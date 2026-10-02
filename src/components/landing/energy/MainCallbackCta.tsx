import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { getUtm } from "@/lib/utm";
import { reachGoal } from "@/lib/yandexMetrika";

export function MainCallbackCta({ id }: { id?: string }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const phoneDigits = phone.replace(/\D/g, "");
  const canSubmit = consent && phoneDigits.length >= 11 && status !== "loading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("send-feedback", {
        body: {
          type: "callback",
          phone: phone.trim(),
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
        <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 sm:p-10 md:p-12">
          {status === "success" ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center md:flex-row md:justify-center md:gap-5 md:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl leading-tight text-foreground md:text-3xl">
                  Заявка принята
                </h2>
                <p className="mt-2 max-w-xl text-base text-muted-foreground">
                  Перезвоним в течение 10 минут в рабочее время и поможем выбрать
                  чек-ап или программу.
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
                <Label htmlFor="main-callback-phone" className="text-base font-semibold text-foreground">
                  Телефон
                </Label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <PhoneInput
                    id="main-callback-phone"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+7 (999) 123-45-67"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmit}
                    className="h-[52px] shrink-0 px-8 text-base sm:min-w-[180px]"
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

                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    className="mt-0.5"
                    disabled={status === "loading"}
                  />
                  <span>Согласен на обработку персональных данных</span>
                </label>

                {status === "error" && (
                  <p className="mt-3 text-sm text-destructive">
                    Не удалось отправить заявку. Попробуйте ещё раз позже.
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
