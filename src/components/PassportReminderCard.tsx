import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { PassportDataDialog } from "./PassportDataDialog";
import { isPassportDataComplete } from "./PassportFields";

export function PassportReminderCard() {
  const { getUserId } = useViewAsUser();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  const check = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        setShow(false);
        return;
      }
      const [{ data: sub }, { data: profile }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("first_name, last_name, middle_name, passport_series, passport_number")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      const hasActive = sub?.status === "active";
      const complete = isPassportDataComplete({
        firstName: (profile as any)?.first_name,
        lastName: (profile as any)?.last_name,
        middleName: (profile as any)?.middle_name,
        series: (profile as any)?.passport_series,
        number: (profile as any)?.passport_number,
      });
      setShow(hasActive && !complete);
    } catch (e) {
      console.error("Passport reminder check failed", e);
      setShow(false);
    }
  };

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;

  return (
    <>
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:items-center sm:justify-between sm:flex-row flex-col">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-foreground leading-snug">
                Нужны паспортные данные
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                Серия и номер нужны лаборатории для оформления забора. Сохраняются один раз.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-gradient-primary shadow-neon-primary shrink-0 w-full sm:w-auto h-10 rounded-xl"
          >
            Заполнить →
          </Button>
        </div>
      </div>
      <PassportDataDialog open={open} onOpenChange={setOpen} onSaved={check} />
    </>
  );
}
