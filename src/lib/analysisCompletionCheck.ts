import { supabase } from "@/integrations/supabase/client";

/**
 * Проверяет, успешно ли завершилась генерация отчёта по анализу,
 * даже если invoke() оборвался по таймауту (deep-режим может идти 3+ мин,
 * edge-runtime закрывает соединение раньше, чем приходит финальный Response).
 *
 * Признак полного успеха: в recommendations есть запись «Назначения»
 * (это последний шаг pipeline) и у анализа проставлен health_index.
 */
export async function isAnalysisReportComplete(analysisId: string): Promise<boolean> {
  try {
    const [{ data: recs }, { data: analysis }] = await Promise.all([
      supabase
        .from("recommendations")
        .select("type")
        .eq("analysis_id", analysisId)
        .eq("type", "Назначения")
        .limit(1),
      supabase
        .from("analyses")
        .select("health_index, biological_age")
        .eq("id", analysisId)
        .maybeSingle(),
    ]);

    const hasPrescriptions = (recs?.length || 0) > 0;
    const hasMetrics = analysis?.health_index != null;
    return hasPrescriptions && hasMetrics;
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
): Promise<boolean> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (await isAnalysisReportComplete(analysisId)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
