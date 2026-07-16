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
  /** Question id that had the maximum score within domain (for hypothesis pick). */
  topQuestionId: string | null;
}

export interface ResultItem {
  domain: DomainScore;
  /** «Что отметил» — short verbatim of the top-scoring answer */
  observation: string;
  /** Hypothesis text */
  hypothesis: string;
  /** Ordered markers, calibrated */
  markers: string[];
}

export interface QuizResult {
  tier: Tier;
  toneHeadline: string;
  toneCta: string;
  items: ResultItem[];
  bmi: number;
}
