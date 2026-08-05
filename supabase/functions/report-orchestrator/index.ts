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
  updated_at: string;
};

// Единый бюджет ретраев для всех шагов (category / prescriptions / finalize).
// Любой шаг может упереться в 504 IDLE_TIMEOUT — даём 3 попытки на каждый.
const MAX_ATTEMPTS = 3;
// Если у running-джобы updated_at старше этого порога — считаем «протухла» и можно стартовать новую.
// Deep-шаг категории может честно занимать до edge idle timeout (150с) + ретраи,
// поэтому 90 секунд были слишком агрессивными: повторный старт мог пометить живую
// генерацию как failed и сбить прогресс в интерфейсе.
const STALE_RUNNING_THRESHOLD_MS = 10 * 60_000;

function isIdleTimeoutError(err: string | null | undefined): boolean {
  if (!err) return false;
  const s = err.toLowerCase();
  return s.includes("idle timeout") || s.includes("status=504") || s.includes("aborted") || s.includes("timeout");
}

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
    if (action === "cancel") {
      return await handleCancel(supabase, body);
    }
    if (action === "regenerate_category") {
      return await handleRegenerateCategory(supabase, body);
    }
    if (action === "regenerate_summary") {
      return await handleRegenerateSummary(supabase, body);
    }
    if (action === "regenerate_prescriptions") {
      return await handleRegeneratePrescriptions(supabase, body);
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

  // Гейт: без заполненной медицинской анкеты не запускаем отчёт —
  // хронические, лекарства и операции критичны для интерпретации.
  // ВАЖНО: проверяем анкету владельца анализа, а не того, кто запускает
  // генерацию. Иначе админ/врач, генерирующий отчёт для пациента, получает
  // ложную ошибку, если у самого админа анкета не заполнена.
  const { data: analysisRow } = await supabase
    .from("analyses")
    .select("user_id")
    .eq("id", analysisId)
    .maybeSingle();
  const ownerId = analysisRow?.user_id || userId;
  const { data: profile } = await supabase
    .from("profiles")
    .select("medical_anketa_filled")
    .eq("id", ownerId)
    .maybeSingle();
  if (!profile?.medical_anketa_filled) {
    return json({
      success: false,
      error: "Медицинская анкета не заполнена. Заполните раздел «Здоровье» в анкете, чтобы отчёт был корректным.",
      code: "MEDICAL_ANKETA_REQUIRED",
    }, 400);
  }



  // Идемпотентность: если уже есть свежий running-job для этого анализа —
  // подцепляемся к нему вместо создания нового. Каскад «superseded» при
  // повторных кликах ломал генерацию (см. инциденты 30.05.2026).
  const { data: existing } = await supabase
    .from("report_jobs")
    .select("id, status, updated_at, steps_total")
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const updatedAt = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
    const ageMs = Date.now() - updatedAt;
    if (ageMs < STALE_RUNNING_THRESHOLD_MS) {
      console.log(`[start] attach to existing running job ${existing.id} (age ${Math.round(ageMs / 1000)}s)`);
      // Перетыкаем tick на всякий случай — если предыдущий планировщик умер, восстановит ход.
      scheduleTick(existing.id);
      return json({
        success: true,
        jobId: existing.id,
        steps_total: existing.steps_total,
        attached: true,
      });
    }
    // Иначе — старый job завис, помечаем failed и стартуем новый.
    console.warn(`[start] existing job ${existing.id} is stale (age ${Math.round(ageMs / 1000)}s), marking failed`);
    await supabase.from("report_jobs")
      .update({ status: "failed", error: "stalled", finished_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  // Полная перегенерация = чистый лист. Делаем это на backend-стороне,
  // а не только во фронте: иначе при старом кэше, другом входе или RLS-сбое
  // `report_documents.blocks` остаётся старым и редактор открывает прежний
  // сохранённый документ поверх свежих recommendations/prescriptions.
  await resetReportDocumentForFullRegeneration(supabase, analysisId);

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

async function resetReportDocumentForFullRegeneration(supabase: any, analysisId: string) {
  const { error } = await supabase
    .from("report_documents")
    .update({
      blocks: [],
      published_blocks: null,
      published_at: null,
      published_by: null,
      published_pdf_path: null,
      published_pdf_hash: null,
      published_pdf_rendered_at: null,
      status: "draft",
      edited_at: null,
      edited_by: null,
    })
    .eq("analysis_id", analysisId);
  if (error) throw new Error(`Не удалось очистить сохранённый документ отчёта: ${error.message}`);
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

async function handleCancel(supabase: any, body: any) {
  const { jobId, analysisId } = body;
  if (!jobId && !analysisId) {
    return json({ success: false, error: "jobId или analysisId обязателен" }, 400);
  }

  let q = supabase
    .from("report_jobs")
    .select("id, status")
    .in("status", ["queued", "running"])
    .order("updated_at", { ascending: false })
    .limit(1);
  if (jobId) q = q.eq("id", jobId);
  else q = q.eq("analysis_id", analysisId);

  const { data: job, error } = await q.maybeSingle();
  if (error) throw error;
  if (!job) {
    return json({ success: true, canceled: false, message: "Активной генерации не найдено" });
  }

  await supabase
    .from("report_jobs")
    .update({
      status: "failed",
      error: "canceled_by_user",
      finished_at: new Date().toISOString(),
      current_step: null,
    })
    .eq("id", job.id);

  console.log(`[job ${job.id}] 🛑 CANCELED by user`);
  return json({ success: true, canceled: true, jobId: job.id });
}

/**
 * Проверяет, не сохранил ли analyze-biomarkers результат шага в БД
 * (он мог доработать в фоне после того как шлюз оборвал HTTP на 150s).
 * Если да — помечает шаг выполненным и двигает job дальше.
 */
async function tryRescueStep(
  supabase: any,
  j: Job,
  stepIdx: number,
  stepStartedAt: number,
): Promise<Response | null> {
  const step = j.steps[stepIdx] as any;
  const recType = step.kind === "prescriptions"
    ? "Назначения"
    : (step.payload as any)?.categoryFilter?.[0];
  if (!recType) return null;

  const { data: rec, error: recError } = await supabase
    .from("recommendations")
    .select("text, content_json, created_at")
    .eq("analysis_id", j.analysis_id)
    .eq("type", recType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recError) {
    console.error(`[job ${j.id}] RESCUE query failed for analysis=${j.analysis_id}, type=${recType}: ${recError.message}`);
    return null;
  }
  const savedAt = rec?.created_at ? new Date(rec.created_at).getTime() : 0;
  const savedDuringStep = savedAt >= stepStartedAt - 5000;
  const contentLen = (rec?.text ?? "").length;
  // Категорийный отчёт — большой текст. У «Назначений» поле text намеренно
  // содержит только короткое резюме, а фактический результат находится в
  // content_json и таблице prescriptions. Старый общий порог >500 символов
  // поэтому навечно оставлял успешно сохранённые назначения в waiting.
  let resultReady = contentLen > 500;
  if (step.kind === "prescriptions") {
    const content = rec?.content_json;
    const lifestyle = content?.lifestyle;
    const hasLifestyle = ["nutrition", "activity", "sleep"].some(
      (key) => Array.isArray(lifestyle?.[key]) && lifestyle[key].length > 0,
    );
    const hasFollowUps = Array.isArray(content?.follow_ups) && content.follow_ups.length > 0;
    const hasRawMarkdown = typeof content?.raw_markdown === "string" && content.raw_markdown.trim().length > 0;
    const { count: prescriptionCount, error: countError } = await supabase
      .from("prescriptions")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", j.analysis_id);
    if (countError) {
      console.error(`[job ${j.id}] RESCUE prescriptions count failed: ${countError.message}`);
      return null;
    }
    resultReady = hasLifestyle || hasFollowUps || hasRawMarkdown || (prescriptionCount ?? 0) > 0;
  }
  if (!savedDuringStep || !resultReady) return null;

  const steps = [...j.steps] as any[];
  if (steps[stepIdx]) {
    steps[stepIdx] = { ...steps[stepIdx] };
    delete steps[stepIdx].rescueUntil;
    delete steps[stepIdx].rescueStartedAt;
  }
  const newDone = stepIdx + 1;
  const isLast = newDone >= j.steps.length;
  console.warn(
    `[job ${j.id}] 🛟 RESCUE "${step.label}": результат найден в БД (len=${contentLen}, created_at=${rec.created_at}), шаг OK${isLast ? " — отчёт готов" : ` → next "${j.steps[newDone].label}"`}`,
  );
  // CAS по updated_at: два параллельных rescue-тика не должны оба продвинуть
  // один шаг и запланировать два запуска следующего.
  const { data: advanced, error: advanceError } = await supabase.from("report_jobs").update({
    steps,
    steps_done: newDone,
    attempts: 0,
    current_step: isLast ? null : j.steps[newDone].id,
    status: isLast ? "done" : "running",
    finished_at: isLast ? new Date().toISOString() : null,
    error: null,
  }).eq("id", j.id).eq("updated_at", j.updated_at).select("id").maybeSingle();
  if (advanceError) throw advanceError;
  if (!advanced) {
    console.log(`[job ${j.id}] RESCUE уже обработан параллельным тиком`);
    return json({ success: true, concurrent: true, waiting: true });
  }
  if (!isLast) scheduleTick(j.id);
  return json({ success: true, rescued: true, step: step.id, done: newDone, total: j.steps.length });
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

  // Отложенная RESCUE-проверка: предыдущий тик упёрся в IDLE_TIMEOUT, но
  // analyze-biomarkers мог дописать результат в фоне. Проверяем БД до того,
  // как жечь новую генерацию.
  const rescueUntil = (step as any).rescueUntil as number | undefined;
  if (rescueUntil) {
    const rescueStartedAt = ((step as any).rescueStartedAt as number | undefined) ?? 0;
    const rescued = await tryRescueStep(supabase, j, stepIdx, rescueStartedAt);
    if (rescued) return rescued;
    if (Date.now() < rescueUntil) {
      console.log(`[job ${j.id}] ⏳ "${step.label}" — фонового результата пока нет, ждём ещё 30s`);
      scheduleTick(j.id, 30_000);
      return json({ success: false, waiting: true });
    }
    const steps = [...j.steps] as any[];
    delete steps[stepIdx].rescueUntil;
    delete steps[stepIdx].rescueStartedAt;
    steps[stepIdx] = { ...steps[stepIdx] };
    const newAttempts = j.attempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      const err = (j.error ?? "idle_timeout") as string;
      console.error(`[job ${j.id}] 💀 STEP "${step.label}" ПРОВАЛЕН после ${MAX_ATTEMPTS} попыток: ${err}`);
      await supabase.from("report_jobs").update({
        steps, status: "failed", error: err, finished_at: new Date().toISOString(),
      }).eq("id", j.id);
      return json({ success: false, terminal: true, error: err });
    }
    await supabase.from("report_jobs").update({ steps, attempts: newAttempts }).eq("id", j.id);
    scheduleTick(j.id, 1000);
    return json({ success: false, retrying: true });
  }

  const attemptNo = j.attempts + 1;
  console.log(
    `[job ${j.id}] ▶ STEP ${stepIdx + 1}/${j.steps.length} "${step.label}" (id=${step.id}, kind=${step.kind}, attempt ${attemptNo}/${MAX_ATTEMPTS}, mode=${j.mode})`,
  );


  const stepStartedAt = Date.now();

  // ВАЖНО: помечаем шаг «в работе» с rescue-маркерами ДО тяжёлого вызова.
  // Если саму orchestrator-инвокацию убьёт шлюз (499/wall-clock) прямо во
  // время ожидания analyze-biomarkers, следующий tick (в т.ч. оживляющий,
  // присланный клиентом) сначала перепроверит БД и подхватит результат,
  // который фоновый analyze-biomarkers всё-таки успел сохранить, вместо
  // того чтобы висеть в running навсегда.
  const runningSteps = [...j.steps] as any[];
  if (step.kind === "category" || step.kind === "prescriptions") {
    runningSteps[stepIdx] = {
      ...runningSteps[stepIdx],
      rescueStartedAt: stepStartedAt,
      // Тяжёлая категория с валидацией и повтором модели легко выходит за
      // 150s idle-лимит шлюза, поэтому шаг выполняется в фоне, а мы ждём
      // появления результата в БД до 10 минут.
      rescueUntil: stepStartedAt + 600_000,
    };
  }

  const dispatchToken = crypto.randomUUID();
  runningSteps[stepIdx] = {
    ...runningSteps[stepIdx],
    dispatchToken,
  };
  // Захватываем право запуска шага атомарно. Без CAS два одновременных tick
  // читали один steps_done и оба отправляли дорогой AI-вызов.
  const { data: claimed, error: claimError } = await supabase.from("report_jobs").update({
    status: "running",
    current_step: step.id,
    attempts: j.attempts,
    steps: runningSteps,
  }).eq("id", j.id).eq("updated_at", j.updated_at).select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) {
    console.log(`[job ${j.id}] STEP "${step.label}" уже захвачен параллельным тиком`);
    scheduleTick(j.id, 30_000);
    return json({ success: true, concurrent: true, waiting: true });
  }


  let stepOk = false;
  let stepError: string | null = null;

  try {
    if (step.kind === "category" || step.kind === "prescriptions") {
      // Шаг запускается в фоне (async): analyze-biomarkers сразу отвечает 202
      // и доделывает работу в waitUntil. Так шлюз не рвёт соединение на 150s.
      // Готовность шага определяем rescue-поллингом по БД.
      const url = `${SUPABASE_URL}/functions/v1/analyze-biomarkers`;
      const payload = {
        analysisId: j.analysis_id,
        mode: j.mode,
        async: true,
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
      }, 60_000);
      const text = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      if (!r.ok || !(parsed?.success || parsed?.accepted)) {
        stepError = `analyze-biomarkers status=${r.status} body=${text.slice(0, 400)}`;
      } else if (parsed?.async) {
        // Работа принята в фон — ждём результат через rescue-поллинг.
        console.log(`[job ${j.id}] ⏳ "${step.label}" запущен в фоне, ждём результат в БД`);
        scheduleTick(j.id, 30_000);
        return json({ success: true, accepted: true, waiting: true, step: step.id });
      } else {
        stepOk = true;
      }
    } else if (step.kind === "finalize") {

      // Каждая фаза finalize (summary / bioage) делает один тяжёлый AI-вызов
      // и укладывается в 150с idle timeout. Вызываем синхронно и ждём ответ.
      const url = `${SUPABASE_URL}/functions/v1/finalize-analysis`;
      const phase = (step.payload as any)?.phase ?? "all";
      const r = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({ analysisId: j.analysis_id, mode: j.mode, phase }),
      }, 145_000);
      const text = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      if (!r.ok || !parsed?.success) {
        stepError = `finalize-analysis(phase=${phase}) status=${r.status} body=${text.slice(0, 400)}`;
      } else {
        stepOk = true;
      }
    }
  } catch (e: any) {
    stepError = e?.message ?? String(e);
  }

  const stepDurationMs = Date.now() - stepStartedAt;
  const stepDurationSec = (stepDurationMs / 1000).toFixed(1);

  // Перед тем как писать результат, перепроверяем, не отменил ли пользователь джобу
  // пока мы висели на длинном HTTP-вызове. Если да — не перезаписываем status.
  const { data: freshStatus } = await supabase
    .from("report_jobs").select("status, error").eq("id", j.id).maybeSingle();
  if (freshStatus?.status === "failed" || freshStatus?.status === "done") {
    console.log(`[job ${j.id}] ⏭ STEP "${step.label}" завершился за ${stepDurationSec}s, но job уже ${freshStatus.status} (${freshStatus.error ?? "—"}). Результат игнорируем.`);
    return json({ success: true, terminal: true, status: freshStatus.status });
  }


  if (stepOk) {
    const newDone = stepIdx + 1;
    const isLast = newDone >= j.steps.length;
    console.log(
      `[job ${j.id}] ✅ STEP ${stepIdx + 1}/${j.steps.length} "${step.label}" OK за ${stepDurationSec}s (attempt ${attemptNo}/${MAX_ATTEMPTS})${isLast ? " — отчёт готов" : ` → next "${j.steps[newDone].label}"`}`,
    );
    const doneSteps = [...runningSteps] as any[];
    if (doneSteps[stepIdx]) {
      doneSteps[stepIdx] = { ...doneSteps[stepIdx] };
      delete doneSteps[stepIdx].rescueUntil;
      delete doneSteps[stepIdx].rescueStartedAt;
    }
    await supabase.from("report_jobs").update({
      steps: doneSteps,
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
  console.warn(
    `[job ${j.id}] ❌ STEP ${stepIdx + 1}/${j.steps.length} "${step.label}" FAIL за ${stepDurationSec}s (attempt ${attemptNo}/${MAX_ATTEMPTS}): ${stepError}`,
  );


  // Шаг упал — ретрай или фейл. Единый бюджет MAX_ATTEMPTS для всех kind.
  const idle = isIdleTimeoutError(stepError);
  const markedError = idle ? `idle_timeout: ${stepError}` : stepError;

  // RESCUE: при IDLE_TIMEOUT для category/prescriptions analyze-biomarkers мог
  // успеть сохранить рекомендацию в БД до того как edge убил соединение.
  // Проверяем — если контент есть, считаем шаг успешным и идём дальше.
  if (idle && (step.kind === "category" || step.kind === "prescriptions")) {
    const rescued = await tryRescueStep(supabase, j, stepIdx, stepStartedAt);
    if (rescued) return rescued;

    // Не нашли — но analyze-biomarkers часто продолжает работать в фоне
    // (ретрай с reasoning=medium добавляет ещё 40–90s) и сохраняет результат
    // уже ПОСЛЕ того, как шлюз оборвал наш HTTP-вызов на 150s. Поэтому вместо
    // мгновенного ретрая ждём отложенными тиками: следующий tick сначала
    // перепроверит БД. Так мы не жжём лишнюю дорогую генерацию.
    const steps = [...j.steps] as any[];
    steps[stepIdx] = {
      ...steps[stepIdx],
      rescueStartedAt: stepStartedAt,
      rescueUntil: Date.now() + 150_000,
    };
    console.warn(
      `[job ${j.id}] ⏳ "${step.label}" IDLE_TIMEOUT — ждём фоновое завершение analyze-biomarkers до 150s перед ретраем`,
    );
    await supabase.from("report_jobs").update({ steps, error: markedError }).eq("id", j.id);
    scheduleTick(j.id, 30_000);
    return json({ success: false, waiting: true, error: markedError });
  }

  const newAttempts = j.attempts + 1;
  if (newAttempts < MAX_ATTEMPTS) {
    const reason = idle ? "IDLE_TIMEOUT" : "ERROR";
    console.warn(
      `[job ${j.id}] 🔁 RETRY "${step.label}" (kind=${step.kind}, ${reason}) → попытка ${newAttempts + 1}/${MAX_ATTEMPTS} через 2s: ${stepError}`,
    );
    await supabase.from("report_jobs").update({
      attempts: newAttempts,
      error: markedError,
    }).eq("id", j.id);
    scheduleTick(j.id, 2000); // короткая пауза перед ретраем
    return json({ success: false, retrying: true, error: markedError });
  }


  console.error(`[job ${j.id}] 💀 STEP "${step.label}" (kind=${step.kind}) ПРОВАЛЕН после ${MAX_ATTEMPTS} попыток: ${markedError}`);
  await supabase.from("report_jobs").update({
    status: "failed",
    error: markedError,
    finished_at: new Date().toISOString(),
  }).eq("id", j.id);
  return json({ success: false, terminal: true, error: markedError });
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

async function handleRegenerateCategory(supabase: any, body: any) {
  const { analysisId, userId, category } = body;
  const mode: "standard" | "deep" = body.mode === "deep" ? "deep" : "standard";
  if (!analysisId || !userId || !category) {
    return json({ success: false, error: "analysisId, userId, category обязательны" }, 400);
  }

  // Убеждаемся, что такая категория существует.
  const { data: cat } = await supabase
    .from("biomarker_categories")
    .select("name")
    .eq("name", category)
    .maybeSingle();
  if (!cat) return json({ success: false, error: `Категория «${category}» не найдена` }, 400);

  // Не запускаем поверх активной джобы.
  const { data: existing } = await supabase
    .from("report_jobs")
    .select("id, updated_at")
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    const ageMs = Date.now() - new Date(existing.updated_at).getTime();
    if (ageMs < STALE_RUNNING_THRESHOLD_MS) {
      return json({ success: false, error: "Уже идёт генерация отчёта, дождитесь завершения" }, 409);
    }
    await supabase.from("report_jobs")
      .update({ status: "failed", error: "stalled", finished_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  // Один шаг — только эта категория. Prescriptions/finalize пропускаем:
  // назначения и общее резюме остаются от предыдущей генерации.
  // Предварительно удаляем старую рекомендацию именно этой категории —
  // analyze-biomarkers со skipDelete=true ничего не чистит сам.
  const { error: delErr } = await supabase
    .from("recommendations")
    .delete()
    .eq("analysis_id", analysisId)
    .eq("type", category);
  if (delErr) console.warn("[regenerate_category] delete old recommendation:", delErr.message);

  const steps: StepDef[] = [{
    id: `category:${category}`,
    label: `Перегенерация: ${category}`,
    kind: "category",
    payload: {
      categoryFilter: [category],
      skipDelete: true,
      skipPrescriptions: true,
      skipFinalize: true,
    },
  }];

  const { data: job, error: insErr } = await supabase
    .from("report_jobs")
    .insert({
      analysis_id: analysisId,
      user_id: userId,
      mode,
      status: "running",
      steps,
      steps_total: 1,
      steps_done: 0,
      current_step: steps[0].id,
      metadata: { started_via: "orchestrator", regenerate_category: category },
    })
    .select("*")
    .single();
  if (insErr) throw insErr;

  scheduleTick(job.id);
  return json({ success: true, jobId: job.id, steps_total: 1 });
}

async function handleRegenerateSummary(supabase: any, body: any) {
  const { analysisId, userId } = body;
  const mode: "standard" | "deep" = body.mode === "deep" ? "deep" : "standard";
  if (!analysisId || !userId) {
    return json({ success: false, error: "analysisId, userId обязательны" }, 400);
  }

  // Не запускаем поверх активной джобы.
  const { data: existing } = await supabase
    .from("report_jobs")
    .select("id, updated_at")
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    const ageMs = Date.now() - new Date(existing.updated_at).getTime();
    if (ageMs < STALE_RUNNING_THRESHOLD_MS) {
      return json({ success: false, error: "Уже идёт генерация отчёта, дождитесь завершения" }, 409);
    }
    await supabase.from("report_jobs")
      .update({ status: "failed", error: "stalled", finished_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  // ВАЖНО: prescriptions.recommendation_id ссылается на «Общее резюме».
  // Раньше здесь был прямой DELETE — он каскадно сносил ВСЕ нутрицевтики
  // пациента. Сначала отвязываем назначения, только потом удаляем резюме.
  const { error: unlinkErr } = await supabase
    .from("prescriptions")
    .update({ recommendation_id: null })
    .eq("analysis_id", analysisId);
  if (unlinkErr) {
    console.error("[regenerate_summary] unlink prescriptions failed:", unlinkErr.message);
    return json({ success: false, error: "Не удалось подготовить перегенерацию резюме" }, 500);
  }

  // Удаляем старое общее резюме, чтобы finalize/summary сгенерировал заново.
  const { error: delErr } = await supabase
    .from("recommendations")
    .delete()
    .eq("analysis_id", analysisId)
    .eq("type", "Общее резюме");
  if (delErr) console.warn("[regenerate_summary] delete old summary:", delErr.message);


  const steps: StepDef[] = [{
    id: "finalize:summary",
    label: "Общее резюме",
    kind: "finalize",
    payload: { phase: "summary" },
  }];

  const { data: job, error: insErr } = await supabase
    .from("report_jobs")
    .insert({
      analysis_id: analysisId,
      user_id: userId,
      mode,
      status: "running",
      steps,
      steps_total: 1,
      steps_done: 0,
      current_step: steps[0].id,
      metadata: { started_via: "orchestrator", regenerate_summary: true },
    })
    .select("*")
    .single();
  if (insErr) throw insErr;

  scheduleTick(job.id);
  return json({ success: true, jobId: job.id, steps_total: 1 });
}

/**
 * Перегенерация ТОЛЬКО раздела «Рекомендации» (назначения/нутрицевтики).
 *
 * Источник данных — сырые значения анализа (analysis_values) + уже готовые
 * категорийные разделы отчёта из БД (их подхватывает analyze-biomarkers при
 * skipCategories=true). Тексты общего резюме и категорий НЕ трогаются.
 */
async function handleRegeneratePrescriptions(supabase: any, body: any) {
  const { analysisId, userId } = body;
  const mode: "standard" | "deep" = body.mode === "deep" ? "deep" : "standard";
  if (!analysisId || !userId) {
    return json({ success: false, error: "analysisId, userId обязательны" }, 400);
  }

  // Не запускаем поверх активной джобы.
  const { data: existing } = await supabase
    .from("report_jobs")
    .select("id, updated_at")
    .eq("analysis_id", analysisId)
    .in("status", ["queued", "running"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    const ageMs = Date.now() - new Date(existing.updated_at).getTime();
    if (ageMs < STALE_RUNNING_THRESHOLD_MS) {
      return json({ success: false, error: "Уже идёт генерация отчёта, дождитесь завершения" }, 409);
    }
    await supabase.from("report_jobs")
      .update({ status: "failed", error: "stalled", finished_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  // Чистим прошлые назначения этого анализа: шаг идёт со skipDelete=true,
  // сам analyze-biomarkers ничего не удаляет, иначе получим дубли.
  const { error: rxDelErr } = await supabase
    .from("prescriptions")
    .delete()
    .eq("analysis_id", analysisId);
  if (rxDelErr) {
    console.error("[regenerate_prescriptions] delete prescriptions failed:", rxDelErr.message);
    return json({ success: false, error: "Не удалось очистить старые назначения" }, 500);
  }

  // И текстовый блок «Назначения» — он пересоберётся заново.
  const { error: recDelErr } = await supabase
    .from("recommendations")
    .delete()
    .eq("analysis_id", analysisId)
    .eq("type", "Назначения");
  if (recDelErr) console.warn("[regenerate_prescriptions] delete old block:", recDelErr.message);

  const steps: StepDef[] = [{
    id: "prescriptions",
    label: "Рекомендации",
    kind: "prescriptions",
    payload: {
      skipDelete: true,
      skipCategories: true,
      skipPrescriptions: false,
      skipFinalize: true,
    },
  }];

  const { data: job, error: insErr } = await supabase
    .from("report_jobs")
    .insert({
      analysis_id: analysisId,
      user_id: userId,
      mode,
      status: "running",
      steps,
      steps_total: 1,
      steps_done: 0,
      current_step: steps[0].id,
      metadata: { started_via: "orchestrator", regenerate_prescriptions: true },
    })
    .select("*")
    .single();
  if (insErr) throw insErr;

  scheduleTick(job.id);
  return json({ success: true, jobId: job.id, steps_total: 1 });
}



