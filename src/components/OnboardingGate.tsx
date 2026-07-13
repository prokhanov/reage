import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAsUser } from "@/hooks/useViewAsUser";

/**
 * Жёсткий гейт онбординга.
 *
 * Пациент с `profiles.onboarding_completed = false` не может попасть в защищённые
 * разделы, пока не пройдёт анкету или явно не нажмёт «Заполнить позже»
 * (на последнем шаге). Работает независимо от способа получения подписки —
 * платная, подаренная админом или по промокоду со 100% скидкой: анкета
 * обязательна для построения корректного отчёта.
 *
 * Не срабатывает:
 *  - для не-пациентов (админы/врачи),
 *  - в режиме «просмотр как пациент» админом,
 *  - на разрешённых путях: /onboarding/*, /subscription*, /admin/*, /profile.
 */


const ALLOWED_PREFIXES = [
  "/onboarding",
  "/subscription",
  "/admin",
  "/profile",
];

const isAllowedPath = (path: string) =>
  ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

export function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { isViewMode } = useViewAsUser();

  const [checked, setChecked] = useState(false);
  const [mustOnboard, setMustOnboard] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Пока роль не подгружена — ждём, чтобы не мигать
    if (roleLoading) {
      setChecked(false);
      return;
    }

    // Не пациент, view-as-режим или разрешённый путь — гейт молчит
    if (!role?.isPatient || isViewMode || isAllowedPath(location.pathname)) {
      setChecked(true);
      setMustOnboard(false);
      return;
    }

    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id;
        if (!uid) {
          if (!cancelled) {
            setChecked(true);
            setMustOnboard(false);
          }
          return;
        }

        const [{ data: sub }, { data: profile }] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", uid)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", uid)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const hasActive = !!sub;
        const done = !!(profile as any)?.onboarding_completed;
        setMustOnboard(hasActive && !done);
        setChecked(true);
      } catch (e) {
        console.error("OnboardingGate check failed", e);
        if (!cancelled) {
          setChecked(true);
          setMustOnboard(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role?.isPatient, roleLoading, isViewMode, location.pathname]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (mustOnboard) {
    return <Navigate to="/onboarding/personal" replace />;
  }

  return <>{children}</>;
}
