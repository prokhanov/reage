import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useViewAsUser } from "@/hooks/useViewAsUser";

/**
 * Мягкий баннер на дашборде: напоминает заполнить анкету, если
 * подписка активна, но онбординг не пройден.
 * Не показывается в режиме "просмотр как пациент" (админ).
 */
export function OnboardingReminderCard() {
  const { getUserId, isViewingAsPatient } = useViewAsUser();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isViewingAsPatient) {
        setShow(false);
        return;
      }
      try {
        const userId = await getUserId();
        if (!userId) return;
        const [{ data: sub }, { data: profile }] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("status")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", userId)
            .maybeSingle(),
        ]);
        if (!mounted) return;
        const hasActive = !!sub;
        const done = !!(profile as any)?.onboarding_completed;
        setShow(hasActive && !done);
      } catch (e) {
        console.error("Onboarding reminder check failed", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getUserId, isViewingAsPatient]);

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:items-center sm:justify-between sm:flex-row flex-col">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-foreground leading-snug">
              Заполните короткую анкету о здоровье
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
              2 минуты — и рекомендации будут учитывать пол, возраст, вес и
              историю заболеваний.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="bg-gradient-primary shadow-neon-primary shrink-0 w-full sm:w-auto h-10 rounded-xl"
        >
          <Link to="/onboarding/personal">Заполнить →</Link>
        </Button>
      </div>
    </div>
  );
}
