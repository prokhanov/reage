import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "form"; email?: string }
  | { kind: "saving"; email?: string }
  | { kind: "success" }
  | {
      kind: "error";
      reason: "expired" | "already_used" | "not_found" | "invalid" | "network" | "update_failed";
    };

/**
 * Обрабатывает root-link сброса пароля вида:
 *   https://reage.life/?password_reset_token=<uuid>
 *
 * Аналог VerifyEmailTokenHandler: не используем supabase.auth.resetPasswordForEmail,
 * чтобы не зависеть от прокси api.reage.life/auth/v1/verify (он ломает gzip-редирект).
 */
export function PasswordResetTokenHandler() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const t = url.searchParams.get("password_reset_token");
    if (!t) return;

    url.searchParams.delete("password_reset_token");
    const cleanUrl =
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash;
    window.history.replaceState(null, "", cleanUrl);

    setToken(t);
    setOpen(true);
    setState({ kind: "loading" });

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("confirm-password-reset-token", {
          body: { mode: "verify", token: t },
        });
        if (error) {
          setState({ kind: "error", reason: "network" });
          return;
        }
        if (data?.ok) {
          setState({ kind: "form", email: data?.email });
        } else {
          const reason = data?.error;
          if (
            reason === "expired" ||
            reason === "already_used" ||
            reason === "not_found" ||
            reason === "invalid"
          ) {
            setState({ kind: "error", reason });
          } else {
            setState({ kind: "error", reason: "network" });
          }
        }
      } catch (e) {
        console.error("password_reset_token handler failed", e);
        setState({ kind: "error", reason: "network" });
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!token) return;
    if (pwd.length < 6) {
      setLocalError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (pwd !== pwd2) {
      setLocalError("Пароли не совпадают");
      return;
    }
    setState((s) => ({ kind: "saving", email: (s as any)?.email }));
    try {
      const { data, error } = await supabase.functions.invoke("confirm-password-reset-token", {
        body: { mode: "apply", token, password: pwd },
      });
      if (error || !data?.ok) {
        const reason = data?.error;
        if (reason === "expired" || reason === "already_used" || reason === "not_found") {
          setState({ kind: "error", reason });
        } else if (reason === "invalid_password") {
          setLocalError("Пароль не подходит (6–72 символа)");
          setState((s) => ({ kind: "form", email: (s as any)?.email }));
        } else {
          setState({ kind: "error", reason: "update_failed" });
        }
        return;
      }
      setState({ kind: "success" });
    } catch (e) {
      console.error("password reset apply failed", e);
      setState({ kind: "error", reason: "network" });
    }
  };

  if (state.kind === "idle") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md text-center space-y-6">
        {state.kind === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Проверяем ссылку…</h2>
          </>
        )}

        {(state.kind === "form" || state.kind === "saving") && (
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold">Новый пароль</h2>
              {state.email && (
                <p className="text-sm text-muted-foreground">
                  для <strong>{state.email}</strong>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pwd">Новый пароль</Label>
              <PasswordInput
                id="new-pwd"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoFocus
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pwd-2">Повторите пароль</Label>
              <PasswordInput
                id="new-pwd-2"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            {localError && (
              <p className="text-sm text-destructive">{localError}</p>
            )}
            <Button type="submit" className="w-full" disabled={state.kind === "saving"}>
              {state.kind === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохраняем…
                </>
              ) : (
                "Сохранить пароль"
              )}
            </Button>
          </form>
        )}

        {state.kind === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <div>
              <h2 className="text-2xl font-semibold mb-2">Пароль обновлён</h2>
              <p className="text-muted-foreground text-sm">
                Войдите в личный кабинет с новым паролем.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/auth">Войти</Link>
            </Button>
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
                  : state.reason === "update_failed"
                  ? "Не удалось обновить пароль"
                  : "Не удалось проверить ссылку"}
              </h2>
              <p className="text-muted-foreground text-sm">
                Запросите новое письмо для сброса пароля на странице входа.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/auth">Запросить новую ссылку</Link>
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
