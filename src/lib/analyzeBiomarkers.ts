import { supabase } from "@/integrations/supabase/client";

type AnalyzeBiomarkersPayload = {
  analysisId: string;
  mode: "standard" | "deep";
};

/**
 * Запуск генерации отчёта.
 *
 * - `standard`: один синхронный вызов analyze-biomarkers (как и раньше).
 * - `deep`: запуск pipeline через report-orchestrator (job в таблице report_jobs)
 *   с поллингом до завершения. Обходит 400-сек лимит edge runtime, выполняя
 *   каждый шаг (категория / назначения / финализация) отдельным HTTP-вызовом.
 */
export async function invokeAnalyzeBiomarkers(payload: AnalyzeBiomarkersPayload) {
  if (payload.mode === "deep") {
    return await runOrchestratedPipeline(payload);
  }
  return await runDirectAnalyze(payload);
}

async function runDirectAnalyze(payload: AnalyzeBiomarkersPayload) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-biomarkers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { success: false, error: text || `Пустой ответ функции (${response.status})` };
  }

  if (!response.ok && response.status !== 202) {
    throw new Error(data?.error || data?.message || `Ошибка генерации отчёта (${response.status})`);
  }

  return data;
}

async function runOrchestratedPipeline(payload: AnalyzeBiomarkersPayload) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Сессия пользователя не найдена");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-orchestrator`;
  const headers = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  // 1. Старт задачи
  const startResp = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "start",
      analysisId: payload.analysisId,
      userId,
      mode: payload.mode,
    }),
  });
  const startText = await startResp.text();
  let startData: any = null;
  try { startData = startText ? JSON.parse(startText) : null; } catch { /* ignore */ }
  if (!startResp.ok || !startData?.success) {
    throw new Error(startData?.error || `Не удалось запустить генерацию (${startResp.status})`);
  }
  const jobId = startData.jobId as string;

  // 2. Поллинг через report_jobs (RLS: пользователь видит свои задачи)
  const POLL_INTERVAL_MS = 3000;
  const MAX_WAIT_MS = 20 * 60 * 1000; // 20 минут — даём deep с ретраями
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const { data: job, error: jobErr } = await supabase
      .from("report_jobs")
      .select("status, error, steps, steps_done, steps_total, current_step")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr) {
      // не валим pipeline на временной ошибке поллинга
      console.warn("report_jobs poll error:", jobErr.message);
      continue;
    }
    if (!job) continue;
    if (job.status === "done") {
      // Возвращаем формат, совместимый со старым ответом analyze-biomarkers,
      // чтобы не менять логику AnalysisDetail.
      const categoriesProcessed: Record<string, any> = {};
      const stepsArr = (job.steps as any[]) || [];
      for (const s of stepsArr) {
        if (s?.kind === "category") {
          const catName = String(s.id || "").replace(/^category:/, "");
          if (catName) categoriesProcessed[catName] = { success: true };
        }
      }
      return {
        success: true,
        categories_processed: categoriesProcessed,
        finalize_triggered: true,
        prescriptions_status: "success",
        job_id: jobId,
      };
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Генерация отчёта завершилась ошибкой");
    }
  }
  throw new Error("Превышено время ожидания генерации отчёта (20 минут).");
}
