import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { PassportDataDialog } from "./PassportDataDialog";
import { isPassportValid } from "./PassportFields";

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
          .select("passport_series, passport_number")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      const hasActive = sub?.status === "active";
      const filled = isPassportValid(
        (profile as any)?.passport_series,
        (profile as any)?.passport_number
      );
      setShow(hasActive && !filled);
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
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3 flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-foreground">
                Для записи на первый анализ нам понадобятся ваши паспортные данные
              </h3>
              <p className="text-sm text-muted-foreground">
                Серия и номер нужны лаборатории для оформления забора. Сохраняются один раз.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-gradient-primary shadow-neon-primary shrink-0"
          >
            Заполнить →
          </Button>
        </div>
      </div>
      <PassportDataDialog open={open} onOpenChange={setOpen} onSaved={check} />
    </>
  );
}
