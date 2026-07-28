// queue-report-pdf
//
// Ставит задачу серверного рендера PDF после публикации отчёта.
//   1) Проверяет права персонала на анализ (has_admin_permission(..., 'patients')).
//   2) Считает hash опубликованных блоков на СЕРВЕРЕ (клиент hash не присылает).
//   3) Если hash совпал с published_pdf_hash и файл в бакете есть — рендер не запускаем.
//   4) Иначе создаёт job в report_jobs (mode='pdf') и асинхронно дёргает render-report-pdf.
//
// Контент отчёта (LabReport JSON) приходит от редактора и кладётся в metadata
// джоба: сервер не умеет пересобирать LabReport из БД, а headless Chromium
// читает его из снимка превью, который создаёт render-report-pdf.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  REPORT_PDF_BUCKET,
  REPORT_PDF_CORS as corsHeaders,
  computeReportPdfHash,
  reportPdfPath,
} from "../_shared/reportPdf.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: { analysisId?: string; report?: unknown } = {};
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

  const { data: allowed } = await admin.rpc("has_admin_permission", {
    _user_id: viewerId,
    _module: "patients",
  });
  if (allowed !== true) return json({ error: "forbidden" }, 403);

  const { data: doc, error: docErr } = await admin
    .from("report_documents")
    .select("id, user_id, published_blocks, published_pdf_hash, published_pdf_path")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (docErr) return json({ error: "document_read_failed", details: docErr.message }, 500);
  if (!doc) return json({ error: "document_not_found" }, 404);

  const blocks = (doc as any).published_blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return json({ error: "document_not_published" }, 409);
  }

  const hash = await computeReportPdfHash(blocks);
  const path = reportPdfPath((doc as any).user_id, analysisId, hash);

  // Дедупликация: тот же контент + та же версия рендерера/темы → файл уже готов.
  if ((doc as any).published_pdf_hash === hash && (doc as any).published_pdf_path) {
    const folder = path.split("/").slice(0, -1).join("/");
    const { data: files } = await admin.storage.from(REPORT_PDF_BUCKET).list(folder);
    const exists = (files ?? []).some((f: any) => `${folder}/${f.name}` === path);
    if (exists) return json({ status: "reused", hash, path });
  }

  // Уже есть активная задача рендера на этот анализ — не плодим дубли
  // (частичный уникальный индекс report_jobs всё равно не даст).
  const { data: active } = await admin
    .from("report_jobs")
    .select("id, status")
    .eq("analysis_id", analysisId)
    .eq("mode", "pdf")
    .in("status", ["queued", "running"])
    .maybeSingle();
  if (active) return json({ status: "already_queued", jobId: (active as any).id });

  const { data: job, error: jobErr } = await admin
    .from("report_jobs")
    .insert({
      analysis_id: analysisId,
      user_id: (doc as any).user_id,
      mode: "pdf",
      status: "queued",
      steps_total: 1,
      steps_done: 0,
      current_step: "render_pdf",
      metadata: { hash, path, report: body.report ?? null, requested_by: viewerId },
    })
    .select("id")
    .single();
  if (jobErr) return json({ error: "job_insert_failed", details: jobErr.message }, 500);

  // Fire-and-forget: рендер идёт дольше лимита этого запроса, статус
  // отслеживается через report_jobs (Realtime на клиенте).
  const renderUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/render-report-pdf`;
  fetch(renderUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ jobId: (job as any).id }),
  }).catch((e) => console.error("[queue-report-pdf] render invoke failed", String(e)));

  return json({ status: "queued", jobId: (job as any).id, hash, path });
});
