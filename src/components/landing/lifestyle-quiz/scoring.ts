import {
  DOMAIN_LABELS,
  DOMAIN_PRIORITY,
  QUESTIONS,
  QUESTIONS_BY_ID,
} from "./questions";
import { QUESTION_MATRIX } from "./matrix";
import type {
  Answers,
  Demography,
  DomainKey,
  DomainScore,
  QuizResult,
  ResultItem,
  Tier,
} from "./types";

export function calcBmi(d: Demography): number {
  const m = d.heightCm / 100;
  return Math.round((d.weightKg / (m * m)) * 10) / 10;
}

function tierFromSum(sum: number): Tier {
  if (sum <= 10) return 0;
  if (sum <= 20) return 1;
  return 2;
}

const TIER_COPY: Record<Tier, { headline: string; cta: string }> = {
  0: {
    headline: "Похоже, вы на верном пути.",
    cta:
      "Проверить, совпадает ли самоощущение с реальными маркерами, можно за одно исследование.",
  },
  1: {
    headline:
      "Эти сигналы легко списать на усталость или возраст — но за ними могут стоять конкретные, измеримые причины.",
    cta:
      "Стоит сверить их с анализами, чтобы понять, что причина, а что следствие.",
  },
  2: {
    headline:
      "У вас сразу несколько сигналов, которые стоит сверить с анализами — на глаз не определить, что причина, а что следствие.",
    cta:
      "Это не видно по самочувствию: базовые биомаркеры покажут картину точнее.",
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

function applyCalibration(
  markers: string[],
  domain: DomainKey,
  demo: Demography,
  bmi: number,
): string[] {
  const set = new Set(markers);

  // Rule 1: BMI < 18.5 — заменяем инсулинорезистентность на дефициты в nutrition/stress
  if (bmi < 18.5 && (domain === "nutrition" || domain === "stress")) {
    ["Инсулин", "HOMA-IR", "Глюкоза натощак"].forEach((m) => set.delete(m));
    ["Витамин B12", "Ферритин", "ТТГ"].forEach((m) => set.add(m));
  }

  // Rule 2: BMI >= 25 — глюкоза/инсулин/липиды первыми в nutrition/body
  const promotedFront: string[] = [];
  if (bmi >= 25 && (domain === "nutrition" || domain === "body")) {
    ["Глюкоза натощак", "Инсулин", "HOMA-IR", "ЛПНП", "Триглицериды"].forEach(
      (m) => {
        set.add(m);
        promotedFront.push(m);
      },
    );
  }

  // Rule 3: женщина 18–45 — ферритин/гемоглобин в топ во всех активных доменах
  const ageBand = demo.ageBand;
  const isWomanRepro =
    demo.sex === "female" && (ageBand === "18-29" || ageBand === "30-39" || ageBand === "40-49");
  if (isWomanRepro) {
    ["Ферритин", "Гемоглобин"].forEach((m) => {
      set.add(m);
      promotedFront.push(m);
    });
  }

  // Rule 4: женщина 45+ — в sleep/body добавляется упоминание гормональных колебаний
  const isWomanMid =
    demo.sex === "female" && (ageBand === "40-49" || ageBand === "50-64" || ageBand === "65+");
  if (isWomanMid && (domain === "sleep" || domain === "body")) {
    set.add("Гормональный фон (эстрадиол, ФСГ)");
  }

  // Rule 5: мужчина 40+ — липиды/СРБ/тестостерон в топ в movement/body/habits
  const isMan40 =
    demo.sex === "male" && (ageBand === "40-49" || ageBand === "50-64" || ageBand === "65+");
  if (isMan40 && (domain === "movement" || domain === "body" || domain === "habits")) {
    ["Липидный профиль", "СРБ", "Тестостерон"].forEach((m) => {
      set.add(m);
      promotedFront.push(m);
    });
  }

  // Rule 6: возраст 50+ — СРБ первой строкой во всех доменах с баллом ≥1
  if (ageBand === "50-64" || ageBand === "65+") {
    set.add("СРБ");
    promotedFront.unshift("СРБ");
  }

  // Build output: promotedFront (dedup, preserving order) then rest
  const seen = new Set<string>();
  const front: string[] = [];
  for (const m of promotedFront) {
    if (set.has(m) && !seen.has(m)) {
      front.push(m);
      seen.add(m);
    }
  }
  const rest: string[] = [];
  for (const m of markers) {
    if (set.has(m) && !seen.has(m)) {
      rest.push(m);
      seen.add(m);
    }
  }
  // Also any markers added via calibration but not in original list
  for (const m of set) {
    if (!seen.has(m)) {
      rest.push(m);
      seen.add(m);
    }
  }
  return [...front, ...rest].slice(0, 8);
}

export function computeResult(
  answers: Answers,
  demo: Demography,
): QuizResult {
  const bmi = calcBmi(demo);

  // 1. Domain sums (base — все вопросы домена, кроме отдельной логики q17/q18)
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
  // q12 is already in stress via domain assignment — no extra step needed.

  // 2. q18 amplifier — прибавляется к домену с максимальным баллом (ничья по приоритету)
  const q18 = answers["q18"] ?? 0;
  if (q18 > 0) {
    const initial: DomainScore[] = (
      Object.keys(domainSums) as DomainKey[]
    ).map((k) => ({
      key: k,
      label: DOMAIN_LABELS[k],
      score: domainSums[k],
      topQuestionId: null,
    }));
    const top = sortDomains(initial)[0];
    domainSums[top.key] += q18;
  }

  // 3. Base tier from raw sum of q1..q16 + q18 (q17 отдельно)
  let baseSum = 0;
  for (const q of QUESTIONS) {
    if (q.id === "q17") continue;
    baseSum += answers[q.id] ?? 0;
  }
  let tier: Tier = tierFromSum(baseSum);

  // 4. q17 amplifier: если = 2, tier +1 (clamped)
  if ((answers["q17"] ?? 0) === 2) {
    tier = Math.min(2, tier + 1) as Tier;
  }

  // 5. Build sorted domain list
  const scored: DomainScore[] = (Object.keys(domainSums) as DomainKey[]).map(
    (k) => ({
      key: k,
      label: DOMAIN_LABELS[k],
      score: domainSums[k],
      topQuestionId: pickTopQuestion(k, answers),
    }),
  );
  const sorted = sortDomains(scored).filter((d) => d.score > 0);

  // 6. How many domains to show
  const takeCount = tier === 0 ? 1 : tier === 1 ? 2 : 3;
  const chosen = sorted.slice(0, takeCount);

  // 7. Build items
  const items: ResultItem[] = chosen.map((d) => {
    // Pick hypothesis based on top question in domain; fallback to first question
    const qId = d.topQuestionId ?? QUESTIONS.find((q) => q.domain === d.key)!.id;
    const q = QUESTIONS_BY_ID[qId];
    const matrix = QUESTION_MATRIX[qId];
    const markers = applyCalibration(matrix.markers, d.key, demo, bmi);
    return {
      domain: d,
      observation: q.observationOnMax,
      hypothesis: matrix.hypothesis,
      markers,
    };
  });

  // Fallback: если ничего не набралось (все нули), показываем "низкий" tier с nutrition
  if (items.length === 0) {
    return {
      tier: 0,
      toneHeadline: TIER_COPY[0].headline,
      toneCta: TIER_COPY[0].cta,
      items: [],
      bmi,
    };
  }

  return {
    tier,
    toneHeadline: TIER_COPY[tier].headline,
    toneCta: TIER_COPY[tier].cta,
    items,
    bmi,
  };
}
