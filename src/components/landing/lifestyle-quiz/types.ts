export type Sex = "male" | "female";
export type AgeBand = "18-29" | "30-39" | "40-49" | "50-64" | "65+";

export type DomainKey =
  | "nutrition"
  | "sleep"
  | "movement"
  | "stress"
  | "habits"
  | "body";

export type Tier = 0 | 1 | 2; // low / medium / high

export interface Demography {
  sex: Sex;
  ageBand: AgeBand;
  heightCm: number;
  weightKg: number;
}

/** Answers: keyed by question id "q1".."q18" → 0 | 1 | 2 */
export type Answers = Record<string, 0 | 1 | 2>;

export interface DomainScore {
  key: DomainKey;
  label: string;
  score: number;
  /** Максимально возможный балл в домене — для нормировки в UI. */
  maxScore: number;
  /** Question id that had the maximum score within domain (for hypothesis pick). */
  topQuestionId: string | null;
}

export interface MarkerWithReason {
  code: string;
  why: string;
}

export interface ResultItem {
  domain: DomainScore;
  /** «Что отметил» — short verbatim of the top-scoring answer */
  observation: string;
  /** Короткая формулировка возможной причины (bridge). */
  cause: string;
  /** Расширенный контекст-гипотеза */
  hypothesis: string;
  /** Ordered markers with per-marker explanation */
  markers: MarkerWithReason[];
}

export interface QuizResult {
  tier: Tier;
  toneHeadline: string;
  toneCta: string;
  /** Домены с максимальными сигналами — развёрнутые карточки */
  items: ResultItem[];
  /** Все 6 доменов, отсортированные по нагрузке — для «Карты образа жизни» */
  allDomains: DomainScore[];
  /** Домены со слабыми сигналами (не попали в items, но score > 0) */
  weakDomains: DomainScore[];
  /** Домены без сигналов (score = 0) */
  cleanDomains: DomainScore[];
  bmi: number;
}
