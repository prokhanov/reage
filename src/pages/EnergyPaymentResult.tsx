import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCheckupBySlug } from "@/data/checkups";
import { goalPaid, goalPaymentFailed } from "@/lib/checkupGoals";
import { clearCheckupCart } from "@/components/landing/energy/EnergyOrderContext";

/** Старые адреса чекапов, которые ещё могут лежать в оплаченных заказах. */
const BUNDLE_ALIASES: Record<string, string> = {
  "base-40": "base",
  "cardio-risk-40": "cardio-risk",
};

function resolveCheckup(bundle?: string | null) {
  if (!bundle) return undefined;
  return getCheckupBySlug(BUNDLE_ALIASES[bundle] ?? bundle);
}

function resolveCheckups(order?: OrderInfo | null) {
  const list = order?.bundles?.length ? order.bundles : order?.bundle ? [order.bundle] : [];
  return list.map(resolveCheckup).filter(Boolean) as NonNullable<ReturnType<typeof resolveCheckup>>[];
}

type OrderInfo = {
  status: string;
  isTest: boolean;
  outSum: number;
  clinicTitle: string | null;
  clinicAddress: string | null;
  email: string;
  bundle?: string | null;
  bundles?: string[] | null;
};

/**
 * /energy/success и /energy/fail — страницы возврата с Робокассы для гостевого
 * заказа чекапа ReAge Energy. Статус берётся через edge function (заказ гостевой,
 * прямого доступа к таблице у анонима нет).
 */
export default function EnergyPaymentResult({ mode }: { mode: "success" | "fail" }) {
  const [params] = useSearchParams();
  const invId = params.get("InvId");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [state, setState] = useState<"loading" | "paid" | "pending" | "error">(
    mode === "fail" ? "error" : "loading",
  );

  useEffect(() => {
    if (mode !== "success" || !invId) return;
    let cancelled = false;
    const delays = [1200, 2000, 3000, 4000, 5000, 6000, 8000, 10000];
    let attempt = 0;

    const check = async () => {
      if (cancelled) return;
      const { data } = await supabase.functions.invoke("energy-order-status", {
        body: { invId: Number(invId) },
      });
      if (cancelled) return;
      const info = data as OrderInfo | { error?: string } | null;
      if (info && "status" in info) {
        setOrder(info);
        if (info.status === "paid") {
          setState("paid");
          goalPaid(invId, info.bundle, info.bundles);
          clearCheckupCart();
          return;
        }
      }
      if (attempt < delays.length) {
        const wait = delays[attempt++];
        setTimeout(check, wait);
      } else {
        setState("pending");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [invId, mode]);

  useEffect(() => {
    if (mode === "fail") goalPaymentFailed(invId);
  }, [invId, mode]);

  // В режиме ошибки тоже узнаём направление заказа, чтобы вернуть на нужный чекап.
  useEffect(() => {
    if (mode !== "fail" || !invId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.functions.invoke("energy-order-status", {
        body: { invId: Number(invId) },
      });
      if (cancelled) return;
      const info = data as OrderInfo | { error?: string } | null;
      if (info && "status" in info) setOrder(info);
    })();
    return () => {
      cancelled = true;
    };
  }, [invId, mode]);

  const checkups = resolveCheckups(order);
  const checkup = checkups[0];
  const checkupPath = checkup ? checkup.href : "/checkup/energy";
  const checkupLabel =
    checkups.length > 1
      ? "К страницам чекапов"
      : checkup
        ? `На страницу ${checkup.name}`
        : "На страницу чекапа";

  if (mode === "fail") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <XCircle className="mx-auto mb-6 h-14 w-14 text-destructive" />
        <h1 className="mb-3 text-2xl font-bold md:text-3xl">Оплата не прошла</h1>
        <p className="mb-8 text-muted-foreground">
          Платёж отменён или отклонён банком, деньги не списаны. Заказ не оформлен —
          попробуйте ещё раз.
        </p>
        <Button asChild>
          <Link to={checkupPath}>Вернуться к чекапу</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto mb-6 h-12 w-12 animate-spin text-primary" />
          <h1 className="mb-3 text-2xl font-bold md:text-3xl">Подтверждаем оплату…</h1>
          <p className="text-muted-foreground">Это занимает несколько секунд.</p>
        </>
      )}

      {state === "paid" && (
        <>
          <CheckCircle2 className="mx-auto mb-6 h-14 w-14 text-primary" />
          <h1 className="mb-3 text-2xl font-bold md:text-3xl">Заказ оплачен</h1>
          {checkups.length > 0 && (
            <ul className="mx-auto mb-4 max-w-md space-y-1 text-base text-foreground">
              {checkups.map((c) => (
                <li key={c.slug}>{c.name}</li>
              ))}
            </ul>
          )}
          <p className="mb-6 text-muted-foreground">
            Направление и инструкции придут на {order?.email ?? "указанную почту"}. Сдать
            анализы можно в любой рабочий день, без записи.
          </p>
          {order?.clinicTitle && (
            <div className="mx-auto mb-8 max-w-md rounded-xl border border-border bg-card p-4 text-left">
              <div className="text-base font-semibold text-foreground">{order.clinicTitle}</div>
              {order.clinicAddress && (
                <div className="mt-1 text-sm text-muted-foreground">{order.clinicAddress}</div>
              )}
            </div>
          )}
          {order?.isTest && (
            <p className="mb-6 text-sm text-muted-foreground">
              Платёж проведён в тестовом режиме шлюза.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/prep">Как подготовиться</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={checkupPath}>{checkupLabel}</Link>
            </Button>
          </div>
        </>
      )}

      {(state === "pending" || state === "error") && (
        <>
          <Clock className="mx-auto mb-6 h-14 w-14 text-muted-foreground" />
          <h1 className="mb-3 text-2xl font-bold md:text-3xl">Платёж в обработке</h1>
          <p className="mb-8 text-muted-foreground">
            Банк ещё не подтвердил оплату. Как только платёж пройдёт, инструкции придут на
            указанную почту. Номер заказа: {invId ?? "—"}.
          </p>
          <Button asChild variant="outline">
            <Link to={checkupPath}>Вернуться к чекапу</Link>
          </Button>
        </>
      )}
    </div>
  );
}
