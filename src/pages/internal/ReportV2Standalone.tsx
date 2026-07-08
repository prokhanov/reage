import { useSearchParams, Navigate } from "react-router-dom";
import { ReportV2Editor } from "@/components/reportV2/ReportV2Editor";
import { ProtectedRoute } from "@/components/ProtectedRoute";

/**
 * /internal/report-v2 — полностраничный просмотр отчёта v2 в отдельной вкладке.
 * Использует ту же авторизацию Supabase, что и остальное приложение;
 * доступ к данным ограничен RLS (пациент видит только своё, staff — по своим правилам).
 *
 * Путь /internal/ уже в whitelist nginx (deploy/nginx/default.conf → `^~ /internal/`),
 * дополнительные правила добавлять не нужно.
 */
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
      <div className="min-h-screen bg-background p-4 md:p-6">
        <ReportV2Editor analysisId={analysisId} userId={userId} mode={mode} compact />
      </div>
    </ProtectedRoute>
  );
}
