import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { resetReportDocument } from "@/lib/reportLab/documentStore";


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
  // Полная перегенерация = чистый лист: сохранённый документ отчёта
  // (черновик с правками врача и опубликованный снимок) стирается,
  // чтобы редактор собрал отчёт заново из свежих данных ИИ.
  await resetReportDocument(payload.analysisId);
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
  // Если job не обновлялся дольше этого времени — цепочка тиков умерла
  // (edge-инвокацию оркестратора убил шлюз на длинном шаге). Пинаем tick.
  const STALL_MS = 120_000;
  const deadline = Date.now() + MAX_WAIT_MS;
  let lastReviveAt = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const { data: job, error: jobErr } = await supabase
      .from("report_jobs")
      .select("status, error, steps, steps_done, steps_total, current_step, updated_at")
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

    // Watchdog: job «завис» без обновлений — оживляем цепочку тиков.
    const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : 0;
    if (
      updatedAt &&
      Date.now() - updatedAt > STALL_MS &&
      Date.now() - lastReviveAt > STALL_MS
    ) {
      lastReviveAt = Date.now();
      console.warn("report_jobs stalled — sending revive tick");
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "tick", jobId }),
      }).catch(() => {});
    }
  }
  throw new Error("accepted_background");
}

