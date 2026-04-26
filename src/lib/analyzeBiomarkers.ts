import { supabase } from "@/integrations/supabase/client";

type AnalyzeBiomarkersPayload = {
  analysisId: string;
  mode: "standard" | "deep";
};

export async function invokeAnalyzeBiomarkers(payload: AnalyzeBiomarkersPayload) {
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