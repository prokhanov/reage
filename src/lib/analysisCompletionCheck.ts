import { supabase } from "@/integrations/supabase/client";

type CompletionOptions = {
  /**
   * Для перегенерации старого отчёта не считаем старые рекомендации успехом.
   * Передавайте время старта текущей генерации.
   */
  startedAt?: Date | string | number;
};

/**
 * Проверяет, успешно ли завершилась генерация отчёта по анализу,
 * даже если invoke() оборвался по таймауту (deep-режим может идти 3+ мин,
 * edge-runtime закрывает соединение раньше, чем приходит финальный Response).
 *
 * Признак полного успеха: в recommendations есть запись «Назначения»
 * (это последний шаг pipeline) и у анализа проставлен health_index.
 */
export async function isAnalysisReportComplete(
  analysisId: string,
  options: CompletionOptions = {},
): Promise<boolean> {
  try {
    const startedAtIso = options.startedAt ? new Date(options.startedAt).toISOString() : null;
    let recsQuery = supabase
      .from("recommendations")
      .select("type, created_at")
      .eq("analysis_id", analysisId);

    if (startedAtIso) {
      recsQuery = recsQuery.gte("created_at", startedAtIso);
    }

    const [{ data: recs }, { data: analysis }, { data: values }] = await Promise.all([
      recsQuery,
      supabase
        .from("analyses")
        .select("health_index, biological_age")
        .eq("id", analysisId)
        .maybeSingle(),
      supabase
        .from("analysis_values")
        .select("biomarkers(category)")
        .eq("analysis_id", analysisId),
    ]);

    const recommendationTypes = new Set((recs || []).map((r) => r.type).filter(Boolean));
    const expectedCategories = new Set(
      ((values || []) as any[])
        .map((v) => v.biomarkers?.category)
        .filter(Boolean),
    );

    const hasPatientData = recommendationTypes.has("Данные пациента");
    const hasSummary = recommendationTypes.has("Общее резюме");
    const hasAllCategories =
      expectedCategories.size > 0 &&
      [...expectedCategories].every((category) => recommendationTypes.has(category));

    // «Назначения» могут отсутствовать, если ИИ не нашёл lifestyle/follow-up действий.
    // Поэтому финальным признаком считаем свежие текстовые разделы + рассчитанные метрики.
    const hasMetrics = analysis?.health_index != null && analysis?.biological_age != null;
    return hasPatientData && hasSummary && hasAllCategories && hasMetrics;
  } catch {
    return false;
  }
}

/**
 * Опрашивает БД до waitMs миллисекунд, ожидая, что фоновое задание дойдёт
 * до конца. Используется, когда invoke() уже отвалился, но фоновая работа
 * ещё может завершаться.
 */
export async function waitForAnalysisCompletion(
  analysisId: string,
  waitMs = 30000,
  intervalMs = 3000,
  options: CompletionOptions = {},
): Promise<boolean> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (await isAnalysisReportComplete(analysisId, options)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
