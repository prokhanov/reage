import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PagedReportPreview } from "@/lib/reportLab/renderer";
import type { LabReport } from "@/lib/reportLab/types";
import prokhanovReportRaw from "@/data/prokhanovReport.json";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";

const FALLBACK_REPORT = prokhanovReportRaw as unknown as LabReport;

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
  const [report, setReport] = useState<LabReport>(FALLBACK_REPORT);

  // Форсируем светлую тему для рендера PDF — иначе тёмный фон приложения
  // просачивается в поля страницы и колонтитулы (тёмные полосы вокруг листа).
  useEffect(() => {
    const html = window.document.documentElement;
    const body = window.document.body;
    const prevHtmlClass = html.className;
    const prevBodyBg = body.style.background;
    const prevHtmlBg = html.style.background;
    const prevScheme = html.style.colorScheme;
    html.classList.remove("dark");
    html.classList.add("light");
    body.classList.add("hide-jivo");
    html.style.background = "#ffffff";
    html.style.colorScheme = "light";
    body.style.background = "#ffffff";
    return () => {
      html.className = prevHtmlClass;
      html.style.background = prevHtmlBg;
      html.style.colorScheme = prevScheme;
      body.style.background = prevBodyBg;
      body.classList.remove("hide-jivo");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    reportLog("preview_mount", { hasToken: Boolean(token), href: window.location.href });
    if (!token) {
      reportError("token_missing");
      setState("denied");
      return;
    }

    // Пытаемся забрать снимок JSON, положенный render-report-pdf. Если снимка
    // нет (например, чистое превью через mint-preview-token) — падаем на
    // встроенный prokhanovReport.json, как раньше.
    (async () => {
      try {
        const res = await fetch(edgeFunctionUrl("fetch-report-snapshot"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) {
          const payload = (await res.json()) as { report?: LabReport };
          if (payload?.report) {
            setReport(payload.report);
            reportLog("snapshot_loaded");
          } else {
            reportLog("snapshot_empty_payload");
          }
        } else if (res.status === 404) {
          reportLog("snapshot_not_found_fallback_to_bundled");
        } else {
          reportError("snapshot_fetch_failed", { status: res.status });
        }
      } catch (e) {
        reportError("snapshot_fetch_threw", {
          message: e instanceof Error ? e.message : String(e),
        });
      } finally {
        if (!cancelled) setState("allowed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

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
      <PagedReportPreview report={report} signalReady chrome="plain" />
    </div>
  );
}
