// fetch-report-pdf — выдача готового PDF пациенту.
//
// Пациент никогда не получает signed URL: файл стримится телом ответа через
// service_role из приватного бакета report-pdfs.
//
// ОГРАНИЧЕНИЕ: Range/206 не поддерживается — файл отдаётся целиком.
// Рассчитано на отчёты 1–3 МБ; при превышении ~10 МБ пишем warning в лог,
// и тогда стоит вернуться к поддержке Range.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  REPORT_PDF_BUCKET,
  REPORT_PDF_CORS as corsHeaders,
  logReportAccess,
} from "../_shared/reportPdf.ts";

const SIZE_WARN_BYTES = 10 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: { analysisId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  const analysisId = (body.analysisId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(analysisId)) return json({ error: "invalid_analysis_id" }, 400);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "unauthorized" }, 401);
  const viewerId = userRes.user.id;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: doc } = await admin
    .from("report_documents")
    .select("user_id, status, published_at, published_pdf_path")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (!doc) return json({ error: "document_not_found" }, 404);

  // Пациент видит только свой и только опубликованный отчёт.
  if ((doc as any).user_id !== viewerId) return json({ error: "forbidden" }, 403);
  if (!(doc as any).published_at) return json({ error: "not_published" }, 409);

  const path = (doc as any).published_pdf_path as string | null;
  if (!path) return json({ error: "pdf_not_ready" }, 425);

  const { data: file, error: dlErr } = await admin.storage.from(REPORT_PDF_BUCKET).download(path);
  if (dlErr || !file) return json({ error: "pdf_download_failed", details: dlErr?.message }, 404);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > SIZE_WARN_BYTES) {
    console.warn(`[fetch-report-pdf] large pdf ${bytes.byteLength} bytes for ${analysisId}`);
  }

  await logReportAccess(admin as any, {
    analysisId,
    viewerId,
    userId: (doc as any).user_id,
    role: "patient",
    channel: "pdf",
  });

  return new Response(bytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${analysisId.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
