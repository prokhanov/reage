// Общие утилиты пайплайна серверного PDF-рендера отчёта.
//
// Хэш считается ТОЛЬКО на сервере (клиент никогда не присылает hash):
//   hash = sha256(canonicalJSON(published_blocks) + RENDERER_VERSION + THEME_VERSION)
//
// RENDERER_VERSION / THEME_VERSION бампаются вручную при изменении
// шаблона отчёта или образа Playwright — это форсирует перерендер всех PDF.

export const RENDERER_VERSION = "1";
export const THEME_VERSION = "1";

export const REPORT_PDF_BUCKET = "report-pdfs";

/** Детерминированная сериализация: ключи объектов сортируются рекурсивно. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`).join(",")}}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Версии можно переопределить (используется в тестах инвалидации:
 * тот же контент + другая версия рендерера/темы → другой хэш).
 */
export async function computeReportPdfHash(
  publishedBlocks: unknown,
  versions: { renderer?: string; theme?: string } = {},
): Promise<string> {
  const r = versions.renderer ?? RENDERER_VERSION;
  const t = versions.theme ?? THEME_VERSION;
  return sha256Hex(`${canonicalJSON(publishedBlocks)}|r${r}|t${t}`);
}

/** Путь в приватном бакете: {user_id}/{analysis_id}/{hash}.pdf */
export function reportPdfPath(userId: string, analysisId: string, hash: string): string {
  return `${userId}/${analysisId}/${hash.slice(0, 16)}.pdf`;
}

export const REPORT_PDF_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-debug-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Аудит доступа к PDF. Роль вычисляется на сервере, от клиента не принимается.
 * Дедупликация: не пишем новую запись, если для пары (viewer, analysis)
 * уже есть запись за последние 30 минут.
 */
export async function logReportAccess(
  admin: {
    from: (t: string) => any;
  },
  params: {
    analysisId: string;
    viewerId: string;
    userId: string;
    role: "patient" | "staff";
    channel: "pdf" | "signed_url";
  },
): Promise<void> {
  try {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("report_access_log")
      .select("id")
      .eq("analysis_id", params.analysisId)
      .eq("viewer_id", params.viewerId)
      .gte("created_at", since)
      .limit(1);
    if (Array.isArray(recent) && recent.length > 0) return;
    await admin.from("report_access_log").insert({
      analysis_id: params.analysisId,
      viewer_id: params.viewerId,
      user_id: params.userId,
      role: params.role,
      channel: params.channel,
    });
  } catch (e) {
    console.error("[report_access_log] failed", e instanceof Error ? e.message : String(e));
  }
}
