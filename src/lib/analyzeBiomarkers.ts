import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";

type AnalyzeBiomarkersPayload = {
  analysisId: string;
  mode: "standard" | "deep";
};

/**
 * Запуск генерации отчёта.
 *
 * Всегда идёт через report-orchestrator (job в таблице report_jobs)
 * с поллингом до завершения. Это:
 *  - обходит 400-сек лимит edge runtime, выполняя каждый шаг
 *    (категория / назначения / финализация) отдельным HTTP-вызовом;
 *  - гарантирует, что отчёт всегда содержит все секции (5 категорий +
 *    «Данные пациента» + «Назначения» + «Общее резюме»). Прямой вызов
 *    analyze-biomarkers удалял старые рекомендации и не успевал
 *    восстановить Summary/Назначения за один edge-invoke.
 *
 * `mode` (`standard`/`deep`) передаётся в orchestrator и далее в
 * analyze-biomarkers/finalize-analysis.
 */
export async function invokeAnalyzeBiomarkers(payload: AnalyzeBiomarkersPayload) {
  return await runOrchestratedPipeline(payload);
}

async function runOrchestratedPipeline(payload: AnalyzeBiomarkersPayload) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Сессия пользователя не найдена");

  const baseUrl = edgeFunctionUrl("report-orchestrator");
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  // 1. Старт задачи.
  // Прокси/шлюз периодически отдаёт 502/503/504 на холодном старте функции —
  // один такой сбой не должен ронять всю генерацию, поэтому ретраим старт.
  let startResp: Response | null = null;
  let startData: any = null;
  let lastErr = "";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      startResp = await fetch(baseUrl, {
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
      startData = null;
      try { startData = startText ? JSON.parse(startText) : null; } catch { /* ignore */ }
      if (startResp.ok && startData?.success) break;

      // Ошибка бизнес-логики (400 с текстом) — ретраить бессмысленно.
      if (startData?.error) {
        lastErr = startData.error;
        if (startResp.status < 500) throw new Error(lastErr);
      } else {
        lastErr = `Не удалось запустить генерацию (${startResp.status})`;
      }
    } catch (e: any) {
      if (e?.message && startData?.error && e.message === startData.error) throw e;
      lastErr = e?.message || "Сеть недоступна";
    }
    if (attempt < 4) await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  if (!startData?.success) {
    throw new Error(lastErr || "Не удалось запустить генерацию");
  }
  const jobId = startData.jobId as string;


  // 2. Поллинг через report_jobs (RLS: пользователь видит свои задачи)
  const POLL_INTERVAL_MS = 3000;
  const MAX_WAIT_MS = 25 * 60 * 1000; // 25 минут — даём deep с ретраями
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
        accepted: true,
        categories_processed: categoriesProcessed,
        finalize_triggered: true,
        prescriptions_status: "success",
        job_id: jobId,
        error: null as string | null,
      };
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Генерация отчёта завершилась ошибкой");
    }
  }
  throw new Error("accepted_background");
}
