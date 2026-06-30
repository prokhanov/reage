import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calcAge(birth: string) {
  const t = new Date();
  const b = new Date(birth);
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

function addMonths(d: Date, m: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function detectAnalysesPerYear(planName?: string | null): number {
  const n = (planName || "").toLowerCase();
  if (n.includes("базов") || n.includes("basic") || n.includes("старт")) return 2;
  if (n.includes("плюс") || n.includes("plus") || n.includes("оптим") || n.includes("optim") || n.includes("стандарт")) return 3;
  if (n.includes("эксперт") || n.includes("expert") || n.includes("прем") || n.includes("premium") || n.includes("макс")) return 4;
  return 3;
}

function normalizeRoadmapText(text?: string | null) {
  return String(text || "")
    .replace(/контрольн(?:ый|ого|ом|ые|ых)\s+анализ(?:а|ы|ов)?/gi, "плановая сдача анализов")
    .replace(/повторн(?:ый|ого|ом|ые|ых)\s+анализ(?:а|ы|ов)?/gi, "плановая сдача анализов")
    .replace(/пересда(?:ть|ча|чи|ём|ем|йте)?/gi, "сдать плановую панель")
    .replace(/отдельн(?:ый|ого|ую|ые|ых)\s+контроль/gi, "плановый этап")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeRationale(text?: string | null) {
  return String(text || "")
    .replace(/Учитывая текущие биомаркеры и хронологический возраст пациента/gi, "Учитывая ваши текущие биомаркеры и хронологический возраст")
    .replace(/Учитывая текущие биомаркеры пациента/gi, "Учитывая ваши текущие биомаркеры")
    .replace(/хронологический возраст пациента/gi, "ваш хронологический возраст")
    .replace(/(?<![а-яё])пациент(?:а|у|ом|е|ы|ов|ам|ах)?(?![а-яё])/gi, "вас")
    .replace(/(?<![а-яё])пациент(?![а-яё])/gi, "вы")
    .replace(/\s{2,}/g, " ")
    .trim();
}



function hasLegacyRoadmap(roadmap: any) {
  if (!Array.isArray(roadmap)) return true;
  const text = JSON.stringify(roadmap).toLowerCase();
  return /контрольн\S*\s+анализ|повторн\S*\s+анализ|пересда/.test(text);
}

type RouteSlot = {
  kind: "start" | "milestone" | "analysis" | "summary";
  date: string;
  title: string;
  analysis_number?: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { userId, force, preview, publish, edited } = body || {};
    const targetUserId = userId || user.id;

    // Helper: superadmin guard for preview/publish on other users
    const requireSuperadminForOther = async () => {
      if (targetUserId === user.id) return true;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle();
      return !!roleRow;
    };

    // PUBLISH MODE — accept edited snapshot and insert without recomputing
    if (publish && edited && typeof edited === "object") {
      const ok = await requireSuperadminForOther();
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!edited.analysis_id) {
        return new Response(JSON.stringify({ error: "analysis_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const insertRow: any = {
        user_id: targetUserId,
        analysis_id: edited.analysis_id,
        current_bio_age: Number(edited.current_bio_age),
        chronological_age: Number(edited.chronological_age),
        target_bio_age: Number(edited.target_bio_age),
        health_index: edited.health_index != null ? Math.round(Number(edited.health_index)) : null,
        system_goals: edited.system_goals ?? [],
        action_map: edited.action_map ?? [],
        rationale: normalizeRationale(edited.rationale),
        cohort_percentile: edited.cohort_percentile ?? null,
        cohort_label: edited.cohort_label ?? null,
        trajectory: edited.trajectory ?? null,
        roadmap: edited.roadmap ?? null,
        key_biomarkers: edited.key_biomarkers ?? null,
        expectations: edited.expectations ?? [],
        analyses_per_year: edited.analyses_per_year ?? null,
        model: "google/gemini-2.5-flash (edited)",
      };
      const { data: saved, error: pubErr } = await supabase
        .from("health_strategy_snapshots")
        .insert(insertRow)
        .select()
        .single();
      if (pubErr) {
        return new Response(JSON.stringify({ error: pubErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(saved), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PREVIEW MODE — require superadmin guard when targeting another user
    if (preview) {
      const ok = await requireSuperadminForOther();
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }


    const { data: latestAnalysisRow } = await supabase
      .from("analyses")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("status", "processed")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!force && !preview && latestAnalysisRow) {
      const { data: cached } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("analysis_id", latestAnalysisRow.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached && cached.roadmap && cached.key_biomarkers && Array.isArray(cached.expectations) && cached.expectations.length > 0 && !hasLegacyRoadmap(cached.roadmap)) {
        return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const [profileRes, analysesRes, prescRes, categoriesRes, complaintsRes, subRes, bookingsRes, adherenceRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).single(),
      supabase.from("analyses").select("*, analysis_values(value, biomarkers(name, code, category, unit, normal_min, normal_max, optimal_min, optimal_max))").eq("user_id", targetUserId).eq("status", "processed").order("date", { ascending: false }).limit(1),
      supabase.from("prescriptions").select("*").eq("user_id", targetUserId).eq("is_archived", false),
      supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
      supabase.from("complaints").select("main_complaints, goals, lifestyle").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("subscriptions").select("plan_id, status, start_date, subscription_plans(name, display_name)").eq("user_id", targetUserId).eq("status", "active").order("start_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("analysis_bookings").select("booking_date, status").eq("user_id", targetUserId).gte("booking_date", new Date().toISOString().slice(0, 10)).order("booking_date", { ascending: true }),
      supabase.from("prescription_adherence").select("status").eq("user_id", targetUserId).gte("date", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)),
    ]);

    const profile = profileRes.data;
    const latest = analysesRes.data?.[0];
    const prescriptions = prescRes.data || [];
    const categories = categoriesRes.data || [];
    const complaints = complaintsRes.data;
    const subscription: any = subRes.data;
    const futureBookings = bookingsRes.data || [];
    const adherenceRows = adherenceRes.data || [];

    if (!profile || !latest || latest.biological_age == null) {
      return new Response(JSON.stringify({ error: "No analysis data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const planName = subscription?.subscription_plans?.display_name || subscription?.subscription_plans?.name || null;
    const analysesPerYear = detectAnalysesPerYear(planName);

    const chronoAge = calcAge(profile.birth_date);
    const currentBio = Number(latest.biological_age);

    // Build biomarker summary + deviation flags
    const byCat: Record<string, Array<{ name: string; code: string; value: number; unit: string; deviated: boolean }>> = {};
    for (const av of latest.analysis_values || []) {
      const b = av.biomarkers;
      if (!b) continue;
      const v = Number(av.value);
      const optMin = b.optimal_min ?? b.normal_min;
      const optMax = b.optimal_max ?? b.normal_max;
      const deviated = (optMin != null && v < Number(optMin)) || (optMax != null && v > Number(optMax));
      byCat[b.category] = byCat[b.category] || [];
      byCat[b.category].push({ name: b.name, code: b.code, value: v, unit: b.unit, deviated });
    }

    const categoriesContext = categories.map((c: any) => {
      const items = (byCat[c.name] || []).slice(0, 14).map((b) => `${b.name} (${b.code}): ${b.value} ${b.unit}${b.deviated ? " [ОТКЛОНЕНИЕ]" : ""}`).join("; ");
      return `${c.name}: ${items || "нет данных"}`;
    }).join("\n");

    const prescContext = prescriptions.map((p: any) => {
      const title = p.name || p.prescription?.slice(0, 80) || "—";
      return `- ${title} | форма: ${p.form || "—"} | дозировка: ${p.dosage || "—"} | длительность: ${p.duration || "—"} | причина: ${p.reason || "—"} | эффект: ${p.effect || "—"}`;
    }).join("\n");

    const systemNames = categories.map((c: any) => c.name);

    // Compute adherence %
    const adherenceTotal = adherenceRows.length;
    const adherenceDone = adherenceRows.filter((r: any) => r.status === "completed" || r.status === "done").length;
    const adherencePct = adherenceTotal > 0 ? Math.round((adherenceDone / adherenceTotal) * 100) : null;

    // Plan analysis dates. AnalysesPerYear is the TOTAL number of full panel
    // submissions within a yearly subscription: Basic = 2 (start + 6m),
    // Plus = 3 (start + 4m + 8m), Expert = 4 (start + 3m + 6m + 9m).
    const startDate = new Date(latest.date);
    const intervalMonths = Math.round(12 / analysesPerYear);
    const plannedAnalysisDates: string[] = [];
    for (let i = 1; i < analysesPerYear; i++) {
      plannedAnalysisDates.push(toIso(addMonths(startDate, i * intervalMonths)));
    }

    // Override with real booking dates where possible
    const realDates = futureBookings.map((b: any) => b.booking_date).slice(0, plannedAnalysisDates.length);
    const finalAnalysisDates = plannedAnalysisDates.map((d, i) => realDates[i] || d);
    // If analysis is already processed (report exists), pull the "report ready"
    // milestone forward to whichever happened first: today or start+14d. This
    // keeps "сейчас" on a meaningful step instead of pinning it to start.
    const todayMs = Date.now();
    const startMs = startDate.getTime();
    const isProcessed = latest.status === "processed";
    const plannedReportMs = startMs + 14 * 86400000;
    const reportReadyMs = isProcessed
      ? Math.max(startMs + 1 * 86400000, Math.min(todayMs, plannedReportMs))
      : plannedReportMs;
    const reportReadyDate = new Date(reportReadyMs);
    const doctorReviewDate = new Date(reportReadyMs + 2 * 86400000);
    const firstEffectDate = new Date(doctorReviewDate.getTime() + 28 * 86400000);

    const complaintsText = [complaints?.main_complaints, complaints?.goals, complaints?.lifestyle].filter(Boolean).join(" | ") || "не указано";

    const FIXED_SYSTEMS = [
      { key: "energy", label: "Энергия и выносливость" },
      { key: "sleep", label: "Сон и восстановление" },
      { key: "gut", label: "ЖКТ и пищеварение" },
      { key: "hormones", label: "Гормональный баланс" },
      { key: "metabolism", label: "Метаболизм" },
      { key: "inflammation", label: "Воспаление и иммунитет" },
    ];

    // Product-specific route points: no separate re-tests. Every future analysis
    // is a full planned subscription panel; intermediate points are report,
    // doctor review, prescription start, and expected first improvements.
    const milestonesCount = analysesPerYear === 2 ? 7 : analysesPerYear === 3 ? 8 : 9;

    // Patient biomarker codes (real, for validation)
    const patientCodes = Object.values(byCat).flat().map((b) => b.code);
    const deviatedCodes = Object.values(byCat).flat().filter((b) => b.deviated).map((b) => b.code);
    const prescTitles = prescriptions.map((p: any) => p.name || p.prescription?.slice(0, 60)).filter(Boolean);

    const startSlots: RouteSlot[] = [
      { kind: "start", date: toIso(startDate), title: "Стартовая точка", analysis_number: 1 },
      { kind: "milestone", date: toIso(reportReadyDate), title: "Отчёт почти готов" },
      { kind: "milestone", date: toIso(doctorReviewDate), title: "Консультация и старт назначений" },
      { kind: "milestone", date: toIso(firstEffectDate), title: "Первое ожидаемое улучшение" },
    ];
    const analysisSlots: RouteSlot[] = finalAnalysisDates.map((date, i) => ({
      kind: "analysis",
      date,
      title: "Плановая сдача анализов",
      analysis_number: i + 2,
    }));
    const correctionSlots: RouteSlot[] = finalAnalysisDates.map((date, i) => ({
      kind: "milestone",
      date: toIso(new Date(new Date(date).getTime() + 16 * 86400000)),
      title: `Коррекция назначений после анализа №${i + 2}`,
    }));
    const correctionCount = Math.max(0, milestonesCount - startSlots.length - analysisSlots.length - 1);
    const requiredSlots = [
      ...startSlots,
      ...analysisSlots,
      ...correctionSlots.slice(0, correctionCount),
      { kind: "summary", date: toIso(addMonths(startDate, 12)), title: "Итоги года" } as RouteSlot,
    ]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, milestonesCount);

    const requiredSlotsText = requiredSlots
      .slice(0, milestonesCount)
      .map((s, i) => `${i + 1}. ${s.date} | kind=${s.kind}${s.analysis_number ? ` | analysis_number=${s.analysis_number}` : ""} | title="${s.title}"`)
      .join("\n");

    const systemPrompt = `Ты — врач превентивной медицины ReAge. Стратегия должна быть ПОЛНОСТЬЮ ПЕРСОНАЛИЗИРОВАННОЙ под этого пользователя — никаких общих шаблонных фраз. Каждое утверждение должно опираться на КОНКРЕТНЫЕ биомаркеры (с кодами), КОНКРЕТНЫЕ назначения пользователя и его реальные жалобы.

КРИТИЧЕСКОЕ ПРАВИЛО: нигде, ни в rationale, ни в описаниях этапов, ни в пунктах roadmap, не используй слова "пациент" / "пациента" / "пациенту" / "пациентом" / "пациенте" / "пациенты" / "пациентов" в 3-м лице. Это личный кабинет человека — обращайся к пользователю через "вы", "ваш", "вас" или пиши нейтрально о данных ("текущие биомаркеры", "ваш хронологический возраст"). За нарушение этого правила ответ будет отклонён.

КАК РАБОТАЕТ ПРОДУКТ ReAge:
- Пользователь покупает годовую подписку и сдаёт ПОЛНУЮ панель анализов по тарифу: Базовый — 2 раза/год, Плюс — 3 раза/год, Эксперт — 4 раза/год.
- Первый анализ уже сдан в стартовой точке. Это Анализ №1, а не «первичная оценка» перед анализами.
- Через 12 дней лаборатория готовит результаты, ещё 2 дня занимает выгрузка и корректировка отчёта, ещё 2 дня — врачебный просмотр и консультация.
- Сразу после готового отчёта и консультации пользователь покупает и начинает принимать назначения. Не откладывай старт препаратов на месяцы.
- В будущем нет отдельных «контрольных анализов», «пересдач отдельных маркеров» или разовых анализов. Есть только ПЛАНОВАЯ сдача полной панели анализов по подписке: следующий полный анализ через ${intervalMonths} мес.
- Для плановых анализов можно указать, на какие маркеры врач будет смотреть особенно внимательно, но нельзя писать, что пользователь «пересдаёт только ferritin/25(OH)D/СРБ».

Сформируй:
1) Реалистичный прогноз биовозраста через 12 мес (target_bio_age, trajectory_points).
2) system_goals — цели по системам со ссылкой на коды биомаркеров пользователя (target_biomarkers — ТОЛЬКО из: ${patientCodes.join(", ") || "—"}).
3) action_map — связь КАЖДОГО назначения с биомаркерами и системами (prescription_name ТОЛЬКО из: ${prescTitles.join("; ") || "(назначений нет — оставь массив пустым)"}).
4) ГОДОВУЮ КАРТУ ПУТИ (roadmap) — ровно ${milestonesCount} майлстоунов. Используй ЭТИ даты, kind, номера анализов и смысл этапов:
${requiredSlotsText}

   ТРЕБОВАНИЯ к каждому майлстоуну:
   - title: КОНКРЕТНЫЙ и соответствующий слоту выше. НЕ добавляй «Контрольный анализ №1», «Повторный анализ», «Пересдача», «Первичная оценка», «Устойчивая динамика», «Промежуточная проверка».
   - description: 1 строка, что именно происходит в этой точке.
   - bullets: 3-4 пункта. Каждый пункт = конкретное действие/измерение с КОДОМ биомаркера или НАЗВАНИЕМ препарата или конкретной жалобой.
   - Для слота «Стартовая точка» (kind=start) описывай ТОЛЬКО факт сдачи полной панели и ожидание результатов. ЗАПРЕЩЕНО перечислять конкретные значения или коды биомаркеров — в момент сдачи крови результаты ещё неизвестны. Допустимо: «сдана полная панель по тарифу», «образец передан в лабораторию», «результаты ожидаются через ~12 дней», «фокус: первичная оценка всех систем». Никаких цифр.
   - Для слота «Консультация и старт назначений» обязательно укажи, что вы начинаете активные назначения сразу после отчёта/врача, с названиями и дозировками из списка назначений.
   - Для слота «Первое ожидаемое улучшение» обязательно напиши, что именно вы должны почувствовать первым и за счёт каких назначений/маркеров (сон, энергия, ЖКТ, воспаление и т.п.).
   - Для kind=analysis пиши: «сдать полную панель по тарифу», «особое внимание при интерпретации: коды ...». Не пиши «пересдать» и не делай отдельный анализ одного маркера.
   - focus: до 40 символов, конкретная цель этапа с маркером (например «D ↑ до 40 нг/мл», «снизить СРБ <1»).
   - ЗАПРЕЩЕНО: «контрольный анализ», «повторный анализ», «пересдать», «улучшение самочувствия», «работа над здоровьем», «первичная оценка», «устойчивая динамика», «системный подход», «комплексная работа», любые общие слова без цифр/кодов/названий, а также любые формы слова «пациент».
    Приоритетные отклонённые коды для работы: ${deviatedCodes.join(", ") || "—"}. Реальные жалобы: ${complaintsText}.
5) key_biomarkers — РОВНО 6 систем (energy, sleep, gut, hormones, metabolism, inflammation). Для каждой 2-4 КОДА СТРОГО из: ${patientCodes.join(", ") || "—"}. Если данных нет — markers пустой.
6) expectations — ТАЙМЛАЙН ОЖИДАЕМЫХ ИЗМЕНЕНИЙ В ОРГАНИЗМЕ (8-14 событий) при соблюдении ваших назначений. Это отдельный блок «что и когда вы должны почувствовать», по принципу приложений отказа от курения («5-й день: лёгкие очищаются»). Каждое событие — ОДНО конкретное ожидаемое изменение, не план действий.
   ТРЕБОВАНИЯ к каждому событию:
   - day_from_start: целое число дней от даты старта (${toIso(startDate)}). Начинай с 7-14 дней (первые ощущения от назначений), доводи до 365 (итог года). Распределяй события неравномерно: больше в первые 90 дней, реже дальше.
   - date_iso: дата = startDate + day_from_start, формат YYYY-MM-DD.
   - category: один из "wellbeing" (самочувствие/энергия/сон/ЖКТ), "biomarker" (конкретная цель по показателю с цифрами от→к), "system" (системный сдвиг — например «снижение системного воспаления»), "milestone" (привязка к контрольной точке roadmap).
   - system_key: ОБЯЗАТЕЛЬНО для wellbeing/system/biomarker, из: energy, sleep, gut, hormones, metabolism, inflammation.
   - title: 3-6 слов, КОНКРЕТНО что произойдёт. Примеры: «Уменьшение утренней усталости», «Витамин D вышел в норму», «Снижение вздутия и тяжести», «СРБ ниже 1 мг/л».
   - description: 1-2 предложения от 2-го лица («вы заметите…», «у вас стабилизируется…»). Без слова «пациент». Объясни КАК это происходит на уровне физиологии в простых словах (например: «клетки получают больше энергии», «слизистая кишечника восстанавливается»).
   - driver: что именно приводит к этому изменению — название конкретных назначений из списка + (при необходимости) образ жизни. Пример: «Omega-3 1000 мг + Магний цитрат 200 мг + сон 7-8 ч». ТОЛЬКО названия из ваших назначений: ${prescTitles.join("; ") || "(назначений нет — опирайся на образ жизни)"}.
   - biomarker_target: ОБЯЗАТЕЛЬНО для category=biomarker. Поля: code (СТРОГО из ${patientCodes.join(", ") || "—"}), from (текущее значение пользователя), to (реалистичная цель), unit. Цели должны быть РЕАЛИСТИЧНЫМИ за указанный срок.
   - linked_roadmap_date: для category=milestone — date_iso из roadmap, к которому это привязано.
   - confidence: "high" | "medium" | "low" — насколько уверены в сроке.
   ЗАПРЕЩЕНО: общие фразы «улучшение здоровья», «комплексный эффект»; события без указания назначений; цели по биомаркерам без чисел; даты позже 365 дней.
   Сортируй по day_from_start по возрастанию.

Допустимый сдвиг биовозраста: -0.3..-2.5 года. Русский язык, без канцелярита. Текст должен звучать как персональное сообщение в личном кабинете, а не как выписка из медкарты.`; 

    const userPrompt = `ВЫ:
- Хроновозраст: ${chronoAge} | Биовозраст: ${currentBio} | Пол: ${profile.gender === "female" ? "женский" : "мужской"}
- Тариф: ${planName || "не указан"} → ${analysesPerYear} анализа/год
- Жалобы и цели: ${complaintsText}
- Приверженность назначениям (30 дн): ${adherencePct != null ? adherencePct + "%" : "нет данных"}
- Дата старта: ${toIso(startDate)}
- Плановые даты следующих полных сдач анализов по тарифу: ${finalAnalysisDates.join(", ") || "нет в рамках года"}
- Отчёт готовится по схеме: +12 дней лаборатория, +2 дня выгрузка/коррекция, +2 дня врачебный просмотр; старт назначений: ${toIso(doctorReviewDate)}

ВАШИ БИОМАРКЕРЫ (с реальными значениями и пометкой отклонений):
${categoriesContext}

ВАШИ АКТИВНЫЕ НАЗНАЧЕНИЯ:
${prescContext || "(нет активных назначений — действия должны строиться вокруг наблюдения и образа жизни)"}

СИСТЕМЫ для goals: ${systemNames.join(", ")}`;


    const tools = [{
      type: "function",
      function: {
        name: "submit_strategy",
        description: "Submit calculated health strategy",
        parameters: {
          type: "object",
          properties: {
            target_bio_age: { type: "number" },
            rationale: { type: "string" },
            system_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  system: { type: "string" },
                  goal: { type: "string" },
                  target_biomarkers: { type: "array", items: { type: "string" } },
                },
                required: ["system", "goal", "target_biomarkers"],
                additionalProperties: false,
              },
            },
            action_map: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prescription_name: { type: "string" },
                  systems: { type: "array", items: { type: "string" } },
                  biomarker_codes: { type: "array", items: { type: "string" } },
                  expected_effect: { type: "string" },
                  effect_eta: { type: "string" },
                },
                required: ["prescription_name", "systems", "biomarker_codes", "expected_effect", "effect_eta"],
                additionalProperties: false,
              },
            },
            cohort_percentile: { type: "integer" },
            cohort_label: { type: "string" },
            trajectory_points: {
              type: "array",
              items: {
                type: "object",
                properties: { month: { type: "integer" }, bio_age: { type: "number" } },
                required: ["month", "bio_age"],
                additionalProperties: false,
              },
            },
            roadmap: {
              type: "array",
              description: `Ровно ${milestonesCount} майлстоунов на год`,
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Короткое название этапа, 2-4 слова" },
                  date_iso: { type: "string", description: "Дата майлстоуна YYYY-MM-DD" },
                  kind: { type: "string", enum: ["start", "milestone", "analysis", "summary"] },
                  analysis_number: { type: "integer", description: "№ анализа 1..N для kind=analysis или summary" },
                  description: { type: "string", description: "Подзаголовок, 1 строка" },
                  bullets: { type: "array", items: { type: "string" }, description: "3-4 пункта что произойдёт/будет сделано" },
                  focus: { type: "string", description: "Фокус этапа, до 40 символов" },
                },
                required: ["title", "date_iso", "kind", "description", "bullets", "focus"],
                additionalProperties: false,
              },
            },
            key_biomarkers: {
              type: "array",
              description: "Ровно 6 систем: energy, sleep, gut, hormones, metabolism, inflammation",
              items: {
                type: "object",
                properties: {
                  system_key: { type: "string", enum: ["energy", "sleep", "gut", "hormones", "metabolism", "inflammation"] },
                  system_label: { type: "string" },
                  markers: { type: "array", items: { type: "string" }, description: "2-4 кода биомаркеров" },
                },
                required: ["system_key", "system_label", "markers"],
                additionalProperties: false,
              },
            },
            expectations: {
              type: "array",
              description: "Таймлайн ожидаемых изменений в организме (8-14 событий), отсортирован по day_from_start",
              items: {
                type: "object",
                properties: {
                  day_from_start: { type: "integer", description: "Число дней от даты старта (1..365)" },
                  date_iso: { type: "string", description: "YYYY-MM-DD = startDate + day_from_start" },
                  category: { type: "string", enum: ["wellbeing", "biomarker", "system", "milestone"] },
                  system_key: { type: "string", enum: ["energy", "sleep", "gut", "hormones", "metabolism", "inflammation", "general"] },
                  title: { type: "string", description: "Короткий заголовок, 3-6 слов" },
                  description: { type: "string", description: "1-2 предложения от 2-го лица" },
                  driver: { type: "string", description: "Конкретные назначения / образ жизни, которые приводят к этому изменению" },
                  biomarker_target: {
                    type: "object",
                    properties: {
                      code: { type: "string" },
                      from: { type: "number" },
                      to: { type: "number" },
                      unit: { type: "string" },
                    },
                    required: ["code", "from", "to", "unit"],
                    additionalProperties: false,
                  },
                  linked_roadmap_date: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["day_from_start", "date_iso", "category", "title", "description", "driver"],
                additionalProperties: false,
              },
            },
          },
          required: ["target_bio_age", "rationale", "system_goals", "action_map", "cohort_percentile", "cohort_label", "trajectory_points", "roadmap", "key_biomarkers", "expectations"],
          additionalProperties: false,
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools,
        tool_choice: { type: "function", function: { name: "submit_strategy" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway failed");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const parsed = JSON.parse(toolCall.function.arguments);

    // Clamp target
    const minTarget = Math.max(currentBio - 2.5, chronoAge - 15);
    const maxTarget = currentBio - 0.3;
    let target = Number(parsed.target_bio_age);
    if (!isFinite(target)) target = currentBio - 0.7;
    target = Math.min(maxTarget, Math.max(minTarget, target));
    target = Math.round(target * 10) / 10;

    const cohortPct = Number.isFinite(parsed.cohort_percentile)
      ? Math.min(99, Math.max(1, Math.round(parsed.cohort_percentile)))
      : null;

    // Trajectory normalization (unchanged)
    let trajectory: Array<{ month: number; bio_age: number }> | null = null;
    if (Array.isArray(parsed.trajectory_points) && parsed.trajectory_points.length >= 2) {
      const map = new Map<number, number>();
      for (const p of parsed.trajectory_points) {
        const m = Math.round(Number(p.month));
        const v = Number(p.bio_age);
        if (m >= 0 && m <= 12 && isFinite(v)) map.set(m, Math.round(v * 10) / 10);
      }
      map.set(0, Math.round(currentBio * 10) / 10);
      map.set(12, target);
      const filled: Array<{ month: number; bio_age: number }> = [];
      const known = [...map.entries()].sort((a, b) => a[0] - b[0]);
      for (let m = 0; m <= 12; m++) {
        if (map.has(m)) { filled.push({ month: m, bio_age: map.get(m)! }); continue; }
        const prev = [...known].reverse().find(([k]) => k < m)!;
        const next = known.find(([k]) => k > m)!;
        const tt = (m - prev[0]) / (next[0] - prev[0]);
        filled.push({ month: m, bio_age: Math.round((prev[1] + (next[1] - prev[1]) * tt) * 10) / 10 });
      }
      trajectory = filled;
    }

    // Roadmap normalization: force product route dates/titles and remove legacy wording
    const ORDINALS: Record<number, string> = {
      2: "Второй", 3: "Третий", 4: "Четвёртый", 5: "Пятый", 6: "Шестой", 7: "Седьмой", 8: "Восьмой",
    };
    let roadmap: any[] = Array.isArray(parsed.roadmap) ? parsed.roadmap.slice(0, milestonesCount) : [];
    if (roadmap.length > 0) {
      roadmap = requiredSlots.slice(0, milestonesCount).map((slot, i) => {
        const incoming = roadmap[i] || {};
        // Force generic, value-free bullets for the start point: at the moment
        // of blood draw we do not yet know any biomarker results.
        let bullets: string[];
        let description: string;
        let focus: string;
        let title: string = normalizeRoadmapText(slot.title);
        if (slot.kind === "start") {
          bullets = [
            "Сдана полная панель анализов по вашему тарифу",
            "Образец передан в лабораторию, обработка ~12 дней",
            "Результаты пока неизвестны — оцениваем все системы с нуля",
            "Следующий шаг: готовый отчёт и врачебный разбор",
          ];
          description = "Полная панель сдана, ждём результаты";
          focus = "Первичная оценка всех систем";
        } else {
          bullets = (Array.isArray(incoming.bullets) ? incoming.bullets : []).slice(0, 4).map((b: string) => normalizeRoadmapText(b));
          if (slot.kind === "analysis") {
            // Drop redundant "Сдать полную панель по тарифу ..." bullets — это и так понятно из заголовка
            bullets = bullets.filter((b) => !/сдать\s+полную\s+панель|полную\s+панель\s+по\s+тарифу|сдать\s+панель\s+по\s+тарифу/i.test(b));
            if (slot.analysis_number && ORDINALS[slot.analysis_number]) {
              title = `${ORDINALS[slot.analysis_number]} этап сдачи анализов`;
            }
          }
          description = normalizeRoadmapText(incoming.description || slot.title);
          focus = normalizeRoadmapText(incoming.focus || slot.title).slice(0, 60);
        }
        return {
          ...incoming,
          title,
          date_iso: slot.date,
          kind: slot.kind,
          analysis_number: slot.analysis_number,
          description,
          bullets,
          focus,
        };
      });
    }

    // Validate key_biomarkers: only keep codes that actually exist for this patient
    const patientCodeSet = new Set(patientCodes);
    const keyBiomarkers = Array.isArray(parsed.key_biomarkers)
      ? parsed.key_biomarkers.map((kb: any) => ({
          system_key: kb.system_key,
          system_label: kb.system_label,
          markers: (Array.isArray(kb.markers) ? kb.markers : []).filter((c: string) => patientCodeSet.has(c)).slice(0, 4),
        }))
      : [];

    // Validate action_map prescriptions: only keep ones referencing real prescriptions
    const prescNameSet = new Set(prescTitles.map((t: string) => t.toLowerCase()));
    const actionMap = Array.isArray(parsed.action_map)
      ? parsed.action_map.filter((a: any) => !a.prescription_name || prescNameSet.has(String(a.prescription_name).toLowerCase()) || prescTitles.some((t: string) => String(a.prescription_name).toLowerCase().includes(t.toLowerCase())))
      : [];

    // Normalize and validate expectations timeline
    const ALLOWED_SYSTEMS = new Set(["energy", "sleep", "gut", "hormones", "metabolism", "inflammation", "general"]);
    const ALLOWED_CATS = new Set(["wellbeing", "biomarker", "system", "milestone"]);
    const startMsForExp = startDate.getTime();
    const expectations = Array.isArray(parsed.expectations)
      ? parsed.expectations
          .map((e: any) => {
            const day = Math.max(1, Math.min(365, Math.round(Number(e.day_from_start) || 0)));
            const dateIso = e.date_iso || toIso(new Date(startMsForExp + day * 86400000));
            const category = ALLOWED_CATS.has(e.category) ? e.category : "wellbeing";
            const sys = ALLOWED_SYSTEMS.has(e.system_key) ? e.system_key : "general";
            let target: any = undefined;
            if (category === "biomarker" && e.biomarker_target && patientCodeSet.has(e.biomarker_target.code)) {
              target = {
                code: e.biomarker_target.code,
                from: Number(e.biomarker_target.from),
                to: Number(e.biomarker_target.to),
                unit: String(e.biomarker_target.unit || ""),
              };
            }
            // Drop biomarker events without a valid target
            if (category === "biomarker" && !target) return null;
            return {
              day_from_start: day,
              date_iso: dateIso,
              category,
              system_key: sys,
              title: normalizeRationale(String(e.title || "")).slice(0, 80),
              description: normalizeRationale(String(e.description || "")).slice(0, 320),
              driver: normalizeRationale(String(e.driver || "")).slice(0, 200),
              biomarker_target: target,
              linked_roadmap_date: e.linked_roadmap_date || undefined,
              confidence: ["high", "medium", "low"].includes(e.confidence) ? e.confidence : "medium",
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.day_from_start - b.day_from_start)
          .slice(0, 16)
      : [];

    const { data: snapshot, error: insErr } = await supabase
      .from("health_strategy_snapshots")
      .insert({
        user_id: targetUserId,
        analysis_id: latest.id,
        current_bio_age: currentBio,
        chronological_age: chronoAge,
        target_bio_age: target,
        health_index: latest.health_index ? Math.round(latest.health_index) : null,
        system_goals: parsed.system_goals,
        action_map: actionMap,
        rationale: normalizeRationale(parsed.rationale),
        cohort_percentile: cohortPct,
        cohort_label: parsed.cohort_label || null,
        trajectory,
        roadmap,
        key_biomarkers: keyBiomarkers,
        expectations,
        analyses_per_year: analysesPerYear,
        model: "google/gemini-2.5-flash",
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ...snapshot, adherence_pct: adherencePct }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
