import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReportDocument } from "@/lib/reportLab/renderer";
import type { ProkhanovReport } from "@/lib/reportLab/types";
import prokhanovReportRaw from "@/data/prokhanovReport.json";

const REPORT = prokhanovReportRaw as unknown as ProkhanovReport;

type VerifyState = "checking" | "allowed" | "denied";

/**
 * /internal/report-preview — «голая» страница отчёта, без сайдбара и хедера,
 * которую открывает Playwright (Fly-рендерер) для генерации PDF.
 *
 * Защита:
 *   - ?token=<HMAC> — единственный способ попасть на страницу извне.
 *     Токен минтит edge-функция `mint-preview-token` только для суперадмина
 *     с TTL 15 минут.
 *   - Если токена нет, страница показывает 404-подобный экран. Пациент,
 *     случайно перешедший по URL, не увидит контент.
 *
 * На production рендерер обращается по HTTPS с валидным токеном, отчёт
 * рендерится, ставится `window.__reportReady = true`, Playwright делает
 * `page.pdf()`.
 */
export default function ReportPreview() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<VerifyState>("checking");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke(
          "mint-preview-token",
          { body: { action: "verify", token } },
        );
        if (cancelled) return;
        if (error) {
          setState("denied");
          return;
        }
        const payload = data as { valid?: boolean } | null;
        setState(payload?.valid ? "allowed" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const document = useMemo(
    () => <ReportDocument report={REPORT} signalReady />,
    [],
  );

  if (state === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbfaf7",
          color: "#7a7f8f",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        Проверка доступа…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1b2d",
          color: "#f6f0e0",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "72px", fontWeight: 500 }}>404</div>
          <div style={{ opacity: 0.7 }}>Страница не найдена</div>
        </div>
      </div>
    );
  }

  return document;
}
