import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; email?: string }
  | {
      kind: "error";
      reason: "expired" | "already_used" | "not_found" | "invalid" | "network";
      email?: string;
    };

/**
 * Обрабатывает root-link подтверждения email вида:
 *   https://reage.life/?verify_email_token=<uuid>
 *
 * Используется как страховка от 404 на deep-link `/verify-email`
 * (на случай, если nginx whitelist не передеплоен).
 */
export function VerifyEmailTokenHandler() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("verify_email_token");
    if (!token) return;

    // Сразу убираем токен из адресной строки, чтобы пользователь не зашерил его.
    url.searchParams.delete("verify_email_token");
    const cleanUrl =
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash;
    window.history.replaceState(null, "", cleanUrl);

    setOpen(true);
    setState({ kind: "loading" });

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("confirm-email-token", {
          body: { token },
        });
        if (error) {
          const ctx: any = (error as any).context;
          let payload: any = null;
          try {
            payload = ctx?.json ? await ctx.json() : null;
          } catch {}
          const reason = payload?.error;
          if (reason === "expired" || reason === "already_used" || reason === "not_found") {
            setState({ kind: "error", reason, email: payload?.email });
          } else {
            setState({ kind: "error", reason: "network" });
          }
          return;
        }
        if (data?.success) {
          setState({ kind: "success", email: data.email });
        } else {
          const reason = data?.error;
          if (reason === "expired" || reason === "already_used" || reason === "not_found") {
            setState({ kind: "error", reason, email: data?.email });
          } else {
            setState({ kind: "error", reason: "network" });
          }
        }
      } catch (e) {
        console.error("verify_email_token handler failed", e);
        setState({ kind: "error", reason: "network" });
      }
    })();
  }, []);

  if (state.kind === "idle") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md text-center space-y-6">
        {state.kind === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Подтверждаем email…</h2>
          </>
        )}

        {state.kind === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <div>
              <h2 className="text-2xl font-semibold mb-2">Email подтверждён</h2>
              <p className="text-muted-foreground text-sm">
                {state.email ? (
                  <>
                    Адрес <strong>{state.email}</strong> успешно подтверждён.
                  </>
                ) : (
                  "Спасибо! Ваш адрес успешно подтверждён."
                )}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">В контрольную панель</Link>
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                Закрыть
              </Button>
            </div>
          </>
        )}

        {state.kind === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                {state.reason === "already_used"
                  ? "Ссылка уже использована"
                  : state.reason === "expired"
                  ? "Срок действия ссылки истёк"
                  : state.reason === "not_found"
                  ? "Ссылка не найдена"
                  : state.reason === "invalid"
                  ? "Некорректная ссылка"
                  : "Не удалось подтвердить email"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {state.reason === "already_used"
                  ? "Этот email уже подтверждён — можно пользоваться сервисом."
                  : "Войдите в личный кабинет и запросите новое письмо подтверждения."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/auth">Войти</Link>
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                Закрыть
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
