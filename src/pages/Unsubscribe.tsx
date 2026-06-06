import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, MailMinus } from "lucide-react";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/drip-unsubscribe`;

type State =
  | { kind: "loading" }
  | { kind: "ready"; email: string; scope: string; seriesName: string | null }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Ссылка недействительна — отсутствует токен." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, preview: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState({ kind: "error", message: data?.error || "Не удалось проверить ссылку." });
          return;
        }
        setState({
          kind: "ready",
          email: data.email,
          scope: data.scope,
          seriesName: data.series_name,
        });
      } catch (e: any) {
        setState({ kind: "error", message: e?.message || "Ошибка сети." });
      }
    })();
  }, [token]);

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: data?.error || "Не удалось отписаться." });
        return;
      }
      setState({ kind: "done", email: data.email });
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
                Вы собираетесь отписать <strong className="text-foreground">{state.email}</strong> от{" "}
                {state.scope === "all_marketing"
                  ? "всех маркетинговых рассылок"
                  : state.seriesName
                  ? <>серии писем «<strong className="text-foreground">{state.seriesName}</strong>»</>
                  : "этой серии писем"}
                . Системные уведомления (вход, оплата, готовность отчёта) продолжат приходить.
              </p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Подтвердить отписку
              </Button>
            </>
          )}

          {state.kind === "done" && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                Готово. Адрес <strong>{state.email}</strong> отписан. Если передумаете — напишите нам, и мы вернём вас в рассылку.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
