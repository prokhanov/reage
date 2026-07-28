/**
 * useReportPdf — единая точка получения серверного PDF отчёта.
 *
 * Пагинация считается на сервере (Playwright/Chromium), поэтому и врач, и
 * админ, и пациент видят абсолютно одинаковые страницы.
 *
 * Две стратегии выдачи внутри одного хука (persona-based):
 *   • patient — POST fetch-report-pdf → blob → objectURL (без signed URL);
 *   • staff   — POST issue-report-pdf-url → signed URL (TTL 10 минут).
 *
 * Пока идёт рендер новой версии (report_jobs.mode='pdf', queued/running),
 * отдаём предыдущий готовый PDF и поднимаем флаг `updating`.
 * Переключение на свежий файл — по Realtime на report_jobs/report_documents.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";

export type ReportPdfPersona = "patient" | "staff";

export interface ReportPdfState {
  /** objectURL (patient) или signed URL (staff). */
  url: string | null;
  loading: boolean;
  /** Идёт серверный рендер новой версии — показываем предыдущий PDF. */
  updating: boolean;
  /** PDF ещё ни разу не собран. */
  notReady: boolean;
  error: string | null;
  reload: () => void;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useReportPdf(
  analysisId: string | null,
  persona: ReportPdfPersona,
): ReportPdfState {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const objectUrlRef = useRef<string | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await authHeaders();
        const fn = persona === "patient" ? "fetch-report-pdf" : "issue-report-pdf-url";
        const res = await fetch(edgeFunctionUrl(fn), {
          method: "POST",
          headers,
          body: JSON.stringify({ analysisId }),
        });
        if (cancelled) return;

        if (res.status === 425) {
          setNotReady(true);
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          setError(text.slice(0, 300) || `HTTP ${res.status}`);
          return;
        }
        setNotReady(false);

        if (persona === "patient") {
          const blob = await res.blob();
          if (cancelled) return;
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          const objectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = objectUrl;
          setUrl(objectUrl);
        } else {
          const payload = (await res.json()) as { url?: string };
          setUrl(payload.url ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId, persona, nonce]);

  // Освобождаем blob при размонтировании.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  // Статус фонового рендера + автоподхват свежей версии.
  useEffect(() => {
    if (!analysisId) return;

    const checkJob = async () => {
      const { data } = await (supabase as unknown as { from: (t: string) => any })
        .from("report_jobs")
        .select("status")
        .eq("analysis_id", analysisId)
        .eq("mode", "pdf")
        .in("status", ["queued", "running"])
        .limit(1);
      setUpdating(Array.isArray(data) && data.length > 0);
    };
    void checkJob();

    const channel = supabase
      .channel(`report-pdf-${analysisId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_jobs", filter: `analysis_id=eq.${analysisId}` },
        (payload) => {
          const row = payload.new as { mode?: string; status?: string } | null;
          if (row?.mode !== "pdf") return;
          if (row.status === "queued" || row.status === "running") setUpdating(true);
          if (row.status === "done") {
            setUpdating(false);
            reload();
          }
          if (row.status === "failed") setUpdating(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "report_documents", filter: `analysis_id=eq.${analysisId}` },
        () => reload(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [analysisId, reload]);

  return { url, loading, updating, notReady, error, reload };
}
