import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { ReportV2Editor } from "@/components/reportV2/ReportV2Editor";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * /internal/report-v2 — полностраничный просмотр отчёта v2 в отдельной вкладке.
 *
 * Доступ:
 *   1) требуется активная сессия (ProtectedRoute);
 *   2) явная проверка на клиенте: userId в URL должен совпадать с auth.uid()
 *      ЛИБО пользователь должен иметь admin_permission на модуль `patients`
 *      (superadmin/admin/doctor с включённой галкой). Всем остальным — 403.
 *   3) на уровне БД доступ к данным всё равно ограничен RLS.
 *
 * Путь /internal/ уже в whitelist nginx (`^~ /internal/`), обновлять
 * `deploy/nginx/default.conf` не нужно.
 */
function AccessGate({ analysisId, userId, mode }: { analysisId: string; userId: string; mode: "view" | "edit" }) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setState("denied");
          return;
        }
        // Владелец отчёта — сразу пропускаем.
        if (user.id === userId) {
          if (!cancelled) setState("allowed");
          return;
        }
        // Иначе — только staff с доступом к модулю `patients`.
        const { data: allowed } = await supabase.rpc("has_admin_permission", {
          _user_id: user.id,
          _module: "patients",
        });
        if (!cancelled) setState(allowed === true ? "allowed" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Проверка доступа…
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-medium mb-2">403</div>
          <div className="text-muted-foreground">Нет доступа к этому отчёту</div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background p-0 md:p-6">
      <ReportV2Editor analysisId={analysisId} userId={userId} mode={mode} compact />
    </div>
  );
}

export default function ReportV2Standalone() {
  const [params] = useSearchParams();
  const analysisId = params.get("analysisId");
  const userId = params.get("userId");
  const mode = (params.get("mode") === "edit" ? "edit" : "view") as "view" | "edit";

  if (!analysisId || !userId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ProtectedRoute>
      <AccessGate analysisId={analysisId} userId={userId} mode={mode} />
    </ProtectedRoute>
  );
}
