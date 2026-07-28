// issue-report-pdf-url — signed URL на готовый PDF для персонала (админ/врач).
//
// Клиент НЕ должен вызывать supabase.storage.createSignedUrl() напрямую:
// только через эту функцию, чтобы каждый доступ попадал в report_access_log.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  REPORT_PDF_BUCKET,
  REPORT_PDF_CORS as corsHeaders,
  logReportAccess,
} from "../_shared/reportPdf.ts";

const SIGNED_URL_TTL_SEC = 10 * 60;

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

  const { data: allowed } = await admin.rpc("has_admin_permission", {
    _user_id: viewerId,
    _module: "patients",
  });
  if (allowed !== true) return json({ error: "forbidden" }, 403);

  const { data: doc } = await admin
    .from("report_documents")
    .select("user_id, published_pdf_path, published_pdf_rendered_at")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (!doc) return json({ error: "document_not_found" }, 404);

  const path = (doc as any).published_pdf_path as string | null;
  if (!path) return json({ error: "pdf_not_ready" }, 425);

  const { data: signed, error: signErr } = await admin.storage
    .from(REPORT_PDF_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (signErr || !signed?.signedUrl) {
    return json({ error: "sign_failed", details: signErr?.message }, 500);
  }

  await logReportAccess(admin as any, {
    analysisId,
    viewerId,
    userId: (doc as any).user_id,
    role: "staff",
    channel: "signed_url",
  });

  return json({
    url: signed.signedUrl,
    expiresIn: SIGNED_URL_TTL_SEC,
    renderedAt: (doc as any).published_pdf_rendered_at ?? null,
  });
});
