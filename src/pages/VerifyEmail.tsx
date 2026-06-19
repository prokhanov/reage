import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "success"; email?: string }
  | { kind: "error"; reason: "expired" | "already_used" | "not_found" | "invalid" | "network"; email?: string };

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState({ kind: "error", reason: "invalid" });
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("confirm-email-token", {
          body: { token },
        });
        if (error) {
          // Try to read response body
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
        console.error(e);
        setState({ kind: "error", reason: "network" });
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
        {state.kind === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Подтверждаем email…</h1>
          </>
        )}

        {state.kind === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <div>
              <h1 className="text-2xl font-semibold mb-2">Email подтверждён</h1>
              <p className="text-muted-foreground text-sm">
                {state.email
                  ? <>Адрес <strong>{state.email}</strong> успешно подтверждён.</>
                  : "Спасибо! Ваш адрес успешно подтверждён."}
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/dashboard">В контрольную панель</Link>
            </Button>
          </>
        )}

        {state.kind === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h1 className="text-2xl font-semibold mb-2">
                {state.reason === "already_used"
                  ? "Ссылка уже использована"
                  : state.reason === "expired"
                  ? "Срок действия ссылки истёк"
                  : state.reason === "not_found"
                  ? "Ссылка не найдена"
                  : state.reason === "invalid"
                  ? "Некорректная ссылка"
                  : "Не удалось подтвердить email"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {state.reason === "already_used"
                  ? "Этот email уже подтверждён — можно пользоваться сервисом."
                  : "Войдите в личный кабинет и запросите новое письмо подтверждения."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">В контрольную панель</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth">Войти</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
