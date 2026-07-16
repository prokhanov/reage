import {
  DOMAIN_LABELS,
  DOMAIN_PRIORITY,
  QUESTIONS,
  QUESTIONS_BY_ID,
} from "./questions";
import { MARKER_FALLBACK, QUESTION_MATRIX } from "./matrix";
import type {
  Answers,
  Demography,
  DomainKey,
  DomainScore,
  MarkerWithReason,
  QuizResult,
  ResultItem,
  Tier,
} from "./types";

export function calcBmi(d: Demography): number {
  const m = d.heightCm / 100;
  return Math.round((d.weightKg / (m * m)) * 10) / 10;
}

/**
 * Пороги пересобраны: раньше tier 0 включал в себя случаи, где пользователь
 * отвечал «средне» на большинстве вопросов — это давало ложное «на верном пути».
 */
function tierFromSum(sum: number, twosCount: number): Tier {
  let t: Tier = 0;
  if (sum > 6) t = 1;
  if (sum > 16) t = 2;
  // Правило-предохранитель: 3+ жёстких ответа (score=2) → минимум средний уровень.
  if (twosCount >= 3 && t < 1) t = 1;
  if (twosCount >= 5 && t < 2) t = 2;
  return t;
}

const TIER_COPY: Record<Tier, { headline: string; cta: string }> = {
  0: {
    headline:
      "База неплохая — но пара сигналов, которые стоит проверить, всё же есть.",
    cta:
      "По самоощущению такие сигналы почти не заметны. Что за ними стоит — покажет один разбор биомаркеров.",
  },
  1: {
    headline:
      "Есть несколько сигналов, которые легко списать на усталость или возраст — а за ними обычно стоят измеримые причины.",
    cta:
      "Стоит сверить их с анализами: часть окажется мелочью, часть — тем, что действительно стоит внимания.",
  },
  2: {
    headline:
      "У вас сразу несколько заметных сигналов. По ощущениям их не разделить — на глаз не понять, что причина, а что следствие.",
    cta:
      "Базовые биомаркеры покажут, где реальный источник, а где просто перекрёстное эхо от других систем.",
  },
};

function domainRank(k: DomainKey): number {
  return DOMAIN_PRIORITY.indexOf(k);
}

/** Sort domains: score desc, then priority (lower rank first). */
function sortDomains(list: DomainScore[]): DomainScore[] {
  return [...list].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return domainRank(a.key) - domainRank(b.key);
  });
}

/** Максимальный балл для домена — из его вопросов (по 2 за каждый). */
function maxScoreForDomain(domain: DomainKey): number {
  return QUESTIONS.filter((q) => q.domain === domain).length * 2;
}

/** Top-scoring question inside a domain (with priority for lower-numbered id on ties). */
function pickTopQuestion(
  domain: DomainKey,
  answers: Answers,
): string | null {
  const inDomain = QUESTIONS.filter((q) => q.domain === domain);
  let best: { id: string; score: number } | null = null;
  for (const q of inDomain) {
    const s = answers[q.id];
    if (s == null) continue;
    if (!best || s > best.score) best = { id: q.id, score: s };
  }
  if (!best || best.score === 0) return null;
  return best.id;
}

/** Применяет калибровку к списку маркеров и подтягивает объяснения. */
function applyCalibration(
  baseMarkers: { code: string; why: string }[],
  domain: DomainKey,
  demo: Demography,
  bmi: number,
): MarkerWithReason[] {
  const explain = (code: string): string =>
    MARKER_FALLBACK[code] ?? "Помогает уточнить картину по этой системе.";

  const map = new Map<string, string>();
  for (const m of baseMarkers) map.set(m.code, m.why);

  // Rule 1: BMI < 18.5 — заменяем инсулинорезистентность на дефициты
  if (bmi < 18.5 && (domain === "nutrition" || domain === "stress")) {
    ["Инсулин", "HOMA-IR", "Глюкоза натощак"].forEach((m) => map.delete(m));
    ["Витамин B12", "Ферритин", "ТТГ"].forEach((m) => {
      if (!map.has(m)) map.set(m, explain(m));
    });
  }

  const promotedFront: string[] = [];
  const promote = (code: string) => {
    if (!map.has(code)) map.set(code, explain(code));
    promotedFront.push(code);
  };

  // Rule 2: BMI >= 25 — глюкоза/инсулин/липиды первыми в nutrition/body
  if (bmi >= 25 && (domain === "nutrition" || domain === "body")) {
    ["Глюкоза натощак", "Инсулин", "HOMA-IR", "ЛПНП", "Триглицериды"].forEach(promote);
  }

  const ageBand = demo.ageBand;

  // Rule 3: женщина 18–49 — ферритин/гемоглобин в топ
  const isWomanRepro =
    demo.sex === "female" && (ageBand === "18-29" || ageBand === "30-39" || ageBand === "40-49");
  if (isWomanRepro) {
    ["Ферритин", "Гемоглобин"].forEach(promote);
  }

  // Rule 4: женщина 45+ — sleep/body добавляют гормональный фон
  const isWomanMid =
    demo.sex === "female" && (ageBand === "40-49" || ageBand === "50-64" || ageBand === "65+");
  if (isWomanMid && (domain === "sleep" || domain === "body")) {
    const code = "Гормональный фон (эстрадиол, ФСГ)";
    if (!map.has(code)) map.set(code, explain(code));
  }

  // Rule 5: мужчина 40+ — липиды/СРБ/тестостерон в movement/body/habits
  const isMan40 =
    demo.sex === "male" && (ageBand === "40-49" || ageBand === "50-64" || ageBand === "65+");
  if (isMan40 && (domain === "movement" || domain === "body" || domain === "habits")) {
    ["Липидный профиль", "СРБ", "Тестостерон"].forEach(promote);
  }

  // Rule 6: возраст 50+ — СРБ первой строкой
  if (ageBand === "50-64" || ageBand === "65+") {
    promote("СРБ");
  }

  // Build ordered output
  const seen = new Set<string>();
  const out: MarkerWithReason[] = [];
  for (const code of promotedFront) {
    if (!seen.has(code) && map.has(code)) {
      out.push({ code, why: map.get(code)! });
      seen.add(code);
    }
  }
  for (const m of baseMarkers) {
    if (!seen.has(m.code) && map.has(m.code)) {
      out.push({ code: m.code, why: map.get(m.code)! });
      seen.add(m.code);
    }
  }
  for (const [code, why] of map) {
    if (!seen.has(code)) {
      out.push({ code, why });
      seen.add(code);
    }
  }
  return out.slice(0, 5);
}

export function computeResult(
  answers: Answers,
  demo: Demography,
): QuizResult {
  const bmi = calcBmi(demo);

  // 1. Domain sums
  const domainSums: Record<DomainKey, number> = {
    nutrition: 0,
    sleep: 0,
    movement: 0,
    stress: 0,
    habits: 0,
    body: 0,
  };

  for (const q of QUESTIONS) {
    if (q.id === "q17" || q.id === "q18") continue;
    domainSums[q.domain] += answers[q.id] ?? 0;
  }

  // 2. q18 amplifier
  const q18 = answers["q18"] ?? 0;
  if (q18 > 0) {
    const initial: DomainScore[] = (
      Object.keys(domainSums) as DomainKey[]
    ).map((k) => ({
      key: k,
      label: DOMAIN_LABELS[k],
      score: domainSums[k],
      maxScore: maxScoreForDomain(k),
      topQuestionId: null,
    }));
    const top = sortDomains(initial)[0];
    domainSums[top.key] += q18;
  }

  // 3. Tier: raw sum + количество жёстких ответов
  let baseSum = 0;
  let twosCount = 0;
  for (const q of QUESTIONS) {
    if (q.id === "q17") continue;
    const a = answers[q.id] ?? 0;
    baseSum += a;
    if (a === 2) twosCount += 1;
  }
  let tier: Tier = tierFromSum(baseSum, twosCount);

  // 4. q17 amplifier
  if ((answers["q17"] ?? 0) === 2) {
    tier = Math.min(2, tier + 1) as Tier;
  }

  // 5. Все домены
  const allDomains: DomainScore[] = sortDomains(
    (Object.keys(domainSums) as DomainKey[]).map((k) => ({
      key: k,
      label: DOMAIN_LABELS[k],
      score: domainSums[k],
      maxScore: maxScoreForDomain(k),
      topQuestionId: pickTopQuestion(k, answers),
    })),
  );

  // 6. Разделение: strong = score >= 2, weak = 1, clean = 0.
  //    В items берём strong (мин 2, макс 4), плюс — если strong < 2 — добираем из weak,
  //    чтобы у пользователя всегда было хотя бы 2 карточки для разбора.
  const strong = allDomains.filter((d) => d.score >= 2);
  const weak = allDomains.filter((d) => d.score === 1);
  const clean = allDomains.filter((d) => d.score === 0);

  const chosen: DomainScore[] = [];
  for (const d of strong) {
    if (chosen.length >= 4) break;
    chosen.push(d);
  }
  if (chosen.length < 2) {
    for (const d of weak) {
      if (chosen.length >= 2) break;
      chosen.push(d);
    }
  }

  // 7. Build items
  const items: ResultItem[] = chosen.map((d) => {
    const qId = d.topQuestionId ?? QUESTIONS.find((q) => q.domain === d.key)!.id;
    const q = QUESTIONS_BY_ID[qId];
    const matrix = QUESTION_MATRIX[qId];
    const markers = applyCalibration(matrix.markers, d.key, demo, bmi);
    return {
      domain: d,
      observation: q.observationOnMax,
      cause: matrix.cause,
      hypothesis: matrix.hypothesis,
      markers,
    };
  });

  // Веаk-домены, которые НЕ попали в items — идут в свёрнутый блок «мелкие сигналы».
  const chosenKeys = new Set(chosen.map((d) => d.key));
  const weakOut = weak.filter((d) => !chosenKeys.has(d.key));

  return {
    tier,
    toneHeadline: TIER_COPY[tier].headline,
    toneCta: TIER_COPY[tier].cta,
    items,
    allDomains,
    weakDomains: weakOut,
    cleanDomains: clean,
    bmi,
  };
}
