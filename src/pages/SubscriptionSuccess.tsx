import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * /subscription/success — страница возврата с Робокассы после успешной оплаты.
 * Не активирует подписку сама; ждёт, пока ResultURL обработается на сервере
 * и подписка станет active. Опрос с экспоненциальным бэкоффом.
 */
export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const invId = searchParams.get("InvId");
  const [status, setStatus] = useState<"waiting" | "active" | "timeout">("waiting");

  useEffect(() => {
    let cancelled = false;
    const delays = [1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000]; // ~55 сек
    let attempt = 0;

    const check = async () => {
      if (cancelled) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Если пользователь не залогинен — просто покажем «ожидание подтверждения»
        return;
      }
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setStatus("active");
        return;
      }
      if (attempt >= delays.length) {
        setStatus("timeout");
        return;
      }
      const d = delays[attempt++];
      setTimeout(check, d);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
      {status === "waiting" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Подтверждаем оплату…</h1>
          <p className="text-muted-foreground">
            Платёж получен. Активируем подписку — это занимает несколько секунд.
            {invId && <span className="block mt-2 text-xs">Номер счёта: {invId}</span>}
          </p>
        </>
      )}
      {status === "active" && (
        <>
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Подписка активирована</h1>
          <p className="text-muted-foreground mb-8">
            Спасибо! Добро пожаловать в ReAge.
          </p>
          <Button asChild>
            <Link to="/dashboard">Перейти в Контрольную панель</Link>
          </Button>
        </>
      )}
      {status === "timeout" && (
        <>
          <Clock className="h-14 w-14 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Платёж в обработке</h1>
          <p className="text-muted-foreground mb-8">
            Оплата принята, но банк ещё не прислал подтверждение. Обычно это занимает до нескольких минут.
            Подписка активируется автоматически — можно обновить страницу позже.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>Обновить</Button>
            <Button asChild>
              <Link to="/dashboard">В Контрольную панель</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
