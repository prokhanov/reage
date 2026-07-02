import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReportDocument } from "@/lib/reportLab/renderer";
import type { ProkhanovReport } from "@/lib/reportLab/types";
import prokhanovReportRaw from "@/data/prokhanovReport.json";

const REPORT = prokhanovReportRaw as unknown as ProkhanovReport;

type VerifyState = "checking" | "allowed" | "denied";

// Логирование, которое видно и в devtools, и в Playwright (через page.on("console"))
// + сохраняется на window, чтобы Fly-рендерер мог выгрузить его при ошибке.
function reportLog(step: string, extra?: Record<string, unknown>) {
  const w = window as unknown as {
    __reportLog?: Array<{ t: number; step: string; extra?: unknown }>;
    __reportState?: string;
  };
  if (!w.__reportLog) w.__reportLog = [];
  w.__reportLog.push({ t: Date.now(), step, extra });
  w.__reportState = step;
  // eslint-disable-next-line no-console
  console.log(`[report-preview] ${step}`, extra ?? "");
}

function reportError(step: string, extra?: Record<string, unknown>) {
  const w = window as unknown as { __reportError?: { step: string; extra?: unknown } };
  w.__reportError = { step, extra };
  reportLog(step, extra);
}

/**
 * /internal/report-preview — «голая» страница отчёта для Playwright.
 * Токен минтит edge-функция `mint-preview-token` для суперадмина, TTL 15 минут.
 */
export default function ReportPreview() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<VerifyState>("checking");

  useEffect(() => {
    reportLog("preview_mount", { hasToken: Boolean(token), href: window.location.href });
    let cancelled = false;
    async function run() {
      if (!token) {
        if (!cancelled) {
          reportError("token_missing");
          setState("denied");
        }
        return;
      }
      try {
        reportLog("verify_token_start");
        const { data, error } = await supabase.functions.invoke(
          "mint-preview-token",
          { body: { action: "verify", token } },
        );
        if (cancelled) return;
        if (error) {
          reportError("verify_token_error", { message: error.message });
          setState("denied");
          return;
        }
        const payload = data as { valid?: boolean } | null;
        reportLog("verify_token_done", { valid: payload?.valid });
        setState(payload?.valid ? "allowed" : "denied");
        if (!payload?.valid) reportError("token_invalid");
      } catch (e) {
        if (!cancelled) {
          reportError("verify_token_throw", {
            message: e instanceof Error ? e.message : String(e),
          });
          setState("denied");
        }
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
        data-report-state="checking"
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
        data-report-state="denied"
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

  return (
    <div data-report-state="allowed" id="report-root">
      {document}
    </div>
  );
}
