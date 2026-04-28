// report-orchestrator: управляет пошаговой генерацией отчёта.
//
// Каждый шаг — отдельный HTTP-вызов целевой edge-функции (analyze-biomarkers
// или finalize-analysis). Между шагами — самовызов orchestrator-а через fetch,
// чтобы каждый шаг получал свежий 400-секундный бюджет воркера.
//
// API:
//  POST { action: "start", analysisId, mode, userId }   — создаёт job и запускает первый шаг
//  POST { action: "tick",  jobId }                       — выполняет один шаг и планирует следующий
//  POST { action: "status", jobId | analysisId }         — возвращает текущий статус
//
// Все служебные межфункциональные вызовы — service role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type StepDef = {
  id: string;          // уникальный идентификатор шага
  label: string;       // человекочитаемое название
  kind: "category" | "prescriptions" | "finalize";
  payload: Record<string, unknown>;
};

type Job = {
  id: string;
  analysis_id: string;
  user_id: string;
  mode: "standard" | "deep";
  status: string;
  steps: StepDef[];
  current_step: string | null;
  steps_total: number;
  steps_done: number;
  attempts: number;
};

const MAX_ATTEMPTS = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const action = body.action ?? "start";

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (action === "start") {
      return await handleStart(supabase, body);
    }
    if (action === "tick") {
      return await handleTick(supabase, body);
    }
    if (action === "status") {
      return await handleStatus(supabase, body);
    }
    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (e: any) {
    console.error("orchestrator error:", e);
    return json({ success: false, error: e?.message ?? String(e) }, 200);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleStart(supabase: any, body: any) {
  const { analysisId, userId } = body;
  const mode: "standard" | "deep" = body.mode === "deep" ? "deep" : "standard";
  if (!analysisId || !userId) return json({ success: false, error: "analysisId и userId обязательны" }, 400);

  // Гасим предыдущие активные джобы по этому анализу (на случай ретраев)
  await supabase.from("report_jobs")
    .update({ status: "failed", error: "superseded", finished_at: new Date().toISOString() })
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running"]);

  // Загружаем актуальный список категорий из БД, отсортированный по display_order
  const { data: cats, error: catsErr } = await supabase
    .from("biomarker_categories")
    .select("name, display_order")
    .order("display_order", { ascending: true });
  if (catsErr) throw catsErr;
  if (!cats || cats.length === 0) throw new Error("В БД нет категорий биомаркеров");

  const steps: StepDef[] = [];
  // Первый шаг "delete" совмещаем с первой категорией: первая категория идёт без skipDelete,
  // остальные — со skipDelete=true (старые данные уже удалены).
  cats.forEach((c: any, idx: number) => {
    steps.push({
      id: `category:${c.name}`,
      label: `Анализ: ${c.name}`,
      kind: "category",
      payload: {
        categoryFilter: [c.name],
        skipDelete: idx > 0,
        skipPrescriptions: true,
        skipFinalize: true,
      },
    });
  });
  steps.push({
    id: "prescriptions",
    label: "Назначения",
    kind: "prescriptions",
    payload: {
      // categoryFilter не задаём — функция загрузит готовые категорийные отчёты из БД
      skipDelete: true,
      skipCategories: true,
      skipPrescriptions: false,
      skipFinalize: true,
    },
  });
  steps.push({
    id: "finalize:summary",
    label: "Общее резюме",
    kind: "finalize",
    payload: { phase: "summary" },
  });
  steps.push({
    id: "finalize:bioage",
    label: "Биологический возраст",
    kind: "finalize",
    payload: { phase: "bioage" },
  });

  const { data: job, error: insErr } = await supabase
    .from("report_jobs")
    .insert({
      analysis_id: analysisId,
      user_id: userId,
      mode,
      status: "running",
      steps,
      steps_total: steps.length,
      steps_done: 0,
      current_step: steps[0].id,
      metadata: { started_via: "orchestrator" },
    })
    .select("*")
    .single();
  if (insErr) throw insErr;

  // Планируем первый tick (fire-and-forget с waitUntil)
  scheduleTick(job.id);

  return json({ success: true, jobId: job.id, steps_total: steps.length });
}

async function handleStatus(supabase: any, body: any) {
  const { jobId, analysisId } = body;
  let q = supabase.from("report_jobs").select("*").order("started_at", { ascending: false }).limit(1);
  if (jobId) q = q.eq("id", jobId);
  else if (analysisId) q = q.eq("analysis_id", analysisId);
  else return json({ success: false, error: "jobId или analysisId обязателен" }, 400);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return json({ success: true, job: data });
}

async function handleTick(supabase: any, body: any) {
  const { jobId } = body;
  if (!jobId) return json({ success: false, error: "jobId обязателен" }, 400);

  const { data: job, error: jobErr } = await supabase
    .from("report_jobs").select("*").eq("id", jobId).single();
  if (jobErr) throw jobErr;
  const j = job as Job;

  if (j.status === "done" || j.status === "failed") {
    return json({ success: true, terminal: true, status: j.status });
  }

  const stepIdx = j.steps_done;
  if (stepIdx >= j.steps.length) {
    await supabase.from("report_jobs").update({
      status: "done", finished_at: new Date().toISOString(), current_step: null,
    }).eq("id", j.id);
    return json({ success: true, status: "done" });
  }

  const step = j.steps[stepIdx];
  console.log(`[job ${j.id}] running step ${stepIdx + 1}/${j.steps.length}: ${step.id} (attempt ${j.attempts + 1})`);

  await supabase.from("report_jobs").update({
    status: "running",
    current_step: step.id,
    attempts: j.attempts,
  }).eq("id", j.id);

  let stepOk = false;
  let stepError: string | null = null;

  try {
    if (step.kind === "category" || step.kind === "prescriptions") {
      // Синхронный вызов analyze-biomarkers (НЕ background — нам нужен результат шага).
      // analyze-biomarkers/standard ветка выполняет работу синхронно.
      const url = `${SUPABASE_URL}/functions/v1/analyze-biomarkers`;
      const payload = {
        analysisId: j.analysis_id,
        mode: j.mode,
        ...step.payload,
      };
      const r = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify(payload),
      }, 380_000); // меньше edge-лимита, оставляем запас
      const text = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      if (!r.ok || !parsed?.success) {
        stepError = `analyze-biomarkers status=${r.status} body=${text.slice(0, 400)}`;
      } else {
        stepOk = true;
      }
    } else if (step.kind === "finalize") {
      // Финализация может идти дольше HTTP-таймаута edge-runtime (idle 150с).
      // Запускаем её в fire-and-forget режиме и поллим БД до появления
      // «Общего резюме» в recommendations и health_index/biological_age в analyses.
      const url = `${SUPABASE_URL}/functions/v1/finalize-analysis`;
      // Триггерим вызов, не ждём ответа (background=true внутри тоже использует waitUntil).
      try {
        // Не await — нам не важен Response; запрос всё равно дойдёт до edge-runtime.
        // Ставим короткий таймаут, чтобы не висеть здесь, если соединение зависнет.
        const triggerCtrl = new AbortController();
        const triggerTimer = setTimeout(() => triggerCtrl.abort(), 15_000);
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({ analysisId: j.analysis_id, mode: j.mode, background: true }),
          signal: triggerCtrl.signal,
        })
          .then(async (resp) => {
            const txt = await resp.text().catch(() => "");
            console.log(`[job ${j.id}] finalize trigger status=${resp.status} body=${txt.slice(0, 200)}`);
          })
          .catch((err) => {
            console.warn(`[job ${j.id}] finalize trigger fetch ended:`, err?.message ?? err);
          })
          .finally(() => clearTimeout(triggerTimer));
      } catch (e: any) {
        console.warn(`[job ${j.id}] finalize trigger threw:`, e?.message ?? e);
      }

      // Поллим до 6 минут (360с) — финализация на deep-режиме обычно завершается за 2-4 минуты
      const FINALIZE_TIMEOUT_MS = 6 * 60 * 1000;
      const POLL_INTERVAL_MS = 5_000;
      const deadline = Date.now() + FINALIZE_TIMEOUT_MS;
      let lastErr = "не дождались резюме и метрик";
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const [recsRes, anRes] = await Promise.all([
          supabase
            .from("recommendations")
            .select("type")
            .eq("analysis_id", j.analysis_id),
          supabase
            .from("analyses")
            .select("health_index, biological_age")
            .eq("id", j.analysis_id)
            .maybeSingle(),
        ]);
        const types = new Set(((recsRes.data ?? []) as any[]).map((r) => r.type));
        const hasSummary = types.has("Общее резюме");
        const hasMetrics =
          anRes.data?.health_index != null && anRes.data?.biological_age != null;
        if (hasSummary && hasMetrics) {
          stepOk = true;
          break;
        }
        lastErr = `ожидание finalize: summary=${hasSummary} metrics=${hasMetrics}`;
      }
      if (!stepOk) stepError = lastErr;
    }
  } catch (e: any) {
    stepError = e?.message ?? String(e);
  }

  if (stepOk) {
    const newDone = stepIdx + 1;
    const isLast = newDone >= j.steps.length;
    await supabase.from("report_jobs").update({
      steps_done: newDone,
      attempts: 0,
      current_step: isLast ? null : j.steps[newDone].id,
      status: isLast ? "done" : "running",
      finished_at: isLast ? new Date().toISOString() : null,
      error: null,
    }).eq("id", j.id);
    if (!isLast) scheduleTick(j.id);
    return json({ success: true, step: step.id, done: newDone, total: j.steps.length });
  }

  // Шаг упал — ретрай или фейл
  const newAttempts = j.attempts + 1;
  if (newAttempts < MAX_ATTEMPTS) {
    console.warn(`[job ${j.id}] step ${step.id} failed, retrying (${newAttempts}/${MAX_ATTEMPTS}): ${stepError}`);
    await supabase.from("report_jobs").update({
      attempts: newAttempts,
      error: stepError,
    }).eq("id", j.id);
    scheduleTick(j.id, 2000); // короткая пауза перед ретраем
    return json({ success: false, retrying: true, error: stepError });
  }

  console.error(`[job ${j.id}] step ${step.id} failed permanently: ${stepError}`);
  await supabase.from("report_jobs").update({
    status: "failed",
    error: stepError,
    finished_at: new Date().toISOString(),
  }).eq("id", j.id);
  return json({ success: false, terminal: true, error: stepError });
}

function scheduleTick(jobId: string, delayMs = 0) {
  const url = `${SUPABASE_URL}/functions/v1/report-orchestrator`;
  const promise = (async () => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({ action: "tick", jobId }),
      });
      const t = await r.text();
      console.log(`[scheduleTick ${jobId}] result status=${r.status} body=${t.slice(0, 200)}`);
    } catch (e) {
      console.error(`[scheduleTick ${jobId}] failed`, e);
    }
  })();
  const er = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void };
  };
  if (er.EdgeRuntime?.waitUntil) er.EdgeRuntime.waitUntil(promise);
  else void promise;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
