import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, MailMinus } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "ready"; email?: string; scope?: string; seriesName?: string | null }
  | { kind: "done"; email?: string }
  | { kind: "already"; email?: string }
  | { kind: "error"; message: string };

// UUID → токен из email_unsubscribe_tokens (футер транзакционных/auth-писем,
// обрабатывает handle-email-unsubscribe).
// Иначе (base64.base64 через точку) → HMAC-токен drip-серии → drip-unsubscribe.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function detectTokenKind(token: string): "queue" | "drip" {
  return UUID_RE.test(token) ? "queue" : "drip";
}

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  // Ссылки из писем Lovable email-API сейчас ведут на test.reage.life
  // (публичный URL Lovable-проекта). Прод-фронт живёт на reage.life.
  // Тихо редиректим на прод, сохраняя ?token — БД одна, токен универсальный.
  // Делаем это ДО любых fetch, чтобы не тратить лишний запрос.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname === "test.reage.life") {
      window.location.replace(
        `https://reage.life${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Ссылка недействительна — отсутствует токен." });
      return;
    }
    // На test-домене редирект уже сработал, не дёргаем сеть повторно.
    if (typeof window !== "undefined" && window.location.hostname === "test.reage.life") {
      return;
    }

    (async () => {
      const kind = detectTokenKind(token);
      try {
        if (kind === "queue") {
          // GET-валидация (handle-email-unsubscribe возвращает { valid, reason } или email).
          const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
            method: "GET",
            body: undefined,
            headers: {},
            // supabase-js не поддерживает query-string напрямую в invoke — передаём через URL.
            // Но invoke собирает URL сам; используем fetch-обвязку через .invoke с query в body-less GET невозможно.
            // Поэтому вызываем POST с preview-намерением: функция валидирует токен на GET и POST одинаково.
          } as any);

          // handle-email-unsubscribe принимает token только из query (GET) или form/JSON body (POST).
          // supabase.functions.invoke делает POST по умолчанию — используем JSON body.
          if (error || !data) {
            // Fallback: явный POST с JSON body (валидация без побочных эффектов не поддерживается —
            // но токен одноразовый, поэтому «проверить и подтвердить» делаем в один шаг ниже).
          }

          // Реально валидируем через POST + JSON body — это и подтвердит отписку.
          // Показываем пользователю форму подтверждения перед этим — см. confirm().
          setState({ kind: "ready", scope: "all_marketing" });
          return;
        }

        // drip: HMAC-токен → drip-unsubscribe с preview:true.
        const { data, error } = await supabase.functions.invoke("drip-unsubscribe", {
          body: { token, preview: true },
        });
        if (error || !data || (data as any).error) {
          const msg =
            (data as any)?.error ||
            (error as any)?.message ||
            "Не удалось проверить ссылку.";
          setState({ kind: "error", message: msg });
          return;
        }
        setState({
          kind: "ready",
          email: (data as any).email,
          scope: (data as any).scope,
          seriesName: (data as any).series_name ?? null,
        });
      } catch (e: any) {
        setState({ kind: "error", message: e?.message || "Ошибка сети." });
      }
    })();
  }, [token]);

  async function confirm() {
    setSubmitting(true);
    try {
      const kind = detectTokenKind(token);
      if (kind === "queue") {
        const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
          body: { token },
        });
        if (error) {
          setState({ kind: "error", message: (error as any)?.message || "Не удалось отписаться." });
          return;
        }
        const payload = data as any;
        if (payload?.success === false && payload?.reason === "already_unsubscribed") {
          setState({ kind: "already", email: payload?.email });
          return;
        }
        if (payload?.success) {
          setState({ kind: "done", email: payload?.email });
          return;
        }
        setState({
          kind: "error",
          message: payload?.error || payload?.reason || "Не удалось отписаться.",
        });
        return;
      }

      // drip
      const { data, error } = await supabase.functions.invoke("drip-unsubscribe", {
        body: { token },
      });
      if (error || !data || (data as any).error) {
        setState({
          kind: "error",
          message: (data as any)?.error || (error as any)?.message || "Не удалось отписаться.",
        });
        return;
      }
      setState({ kind: "done", email: (data as any).email });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message || "Ошибка сети." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <MailMinus className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Отписка от рассылки</CardTitle>
          <CardDescription>ReAge · Управление подпиской на письма</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Проверяем ссылку…
            </div>
          )}

          {state.kind === "error" && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">{state.message}</div>
            </div>
          )}

          {state.kind === "ready" && (
            <>
              <p className="text-sm text-muted-foreground">
                {state.email ? (
                  <>
                    Вы собираетесь отписать{" "}
                    <strong className="text-foreground">{state.email}</strong> от{" "}
                    {state.scope === "all_marketing"
                      ? "всех маркетинговых рассылок"
                      : state.seriesName
                      ? <>серии писем «<strong className="text-foreground">{state.seriesName}</strong>»</>
                      : "этой серии писем"}
                    . Системные уведомления (вход, оплата, готовность отчёта) продолжат приходить.
                  </>
                ) : (
                  <>
                    Подтвердите отписку от маркетинговых и информационных писем ReAge.
                    Системные уведомления (вход, оплата, готовность отчёта) продолжат приходить.
                  </>
                )}
              </p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Подтвердить отписку
              </Button>
            </>
          )}

          {state.kind === "already" && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                {state.email ? (
                  <>Адрес <strong className="text-foreground">{state.email}</strong> уже отписан ранее.</>
                ) : (
                  <>Этот адрес уже был отписан ранее.</>
                )}
              </div>
            </div>
          )}

          {state.kind === "done" && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                Готово. {state.email ? <>Адрес <strong>{state.email}</strong> отписан.</> : <>Вы отписаны.</>}{" "}
                Если передумаете — напишите нам, и мы вернём вас в рассылку.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
