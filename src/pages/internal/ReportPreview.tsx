import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PagedReportPreview } from "@/lib/reportLab/renderer";
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
    html.style.background = "#ffffff";
    html.style.colorScheme = "light";
    body.style.background = "#ffffff";
    return () => {
      html.className = prevHtmlClass;
      html.style.background = prevHtmlBg;
      html.style.colorScheme = prevScheme;
      body.style.background = prevBodyBg;
    };
  }, []);

  useEffect(() => {
    reportLog("preview_mount", { hasToken: Boolean(token), href: window.location.href });
    // Проверку HMAC-токена выполняет Fly-рендерер до `page.goto()`. Раньше
    // здесь был вызов edge-функции `mint-preview-token` (action=verify) —
    // он добавлял ~15 сек к каждой генерации PDF из-за холодного старта
    // функции. Теперь просто требуем наличие токена: если открыли URL
    // руками без него — 404, иначе рендерим сразу.
    if (!token) {
      reportError("token_missing");
      setState("denied");
      return;
    }
    setState("allowed");
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
      <PagedReportPreview report={REPORT} signalReady chrome="plain" />
    </div>
  );
}
