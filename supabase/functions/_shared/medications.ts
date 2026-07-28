// Работа со справочником препаратов: нормализация названий, сопоставление
// со справочником medication_dictionary и формирование фактов для AI-контекста.

export interface LabEffect {
  biomarker_code?: string;
  biomarker?: string;
  direction?: "up" | "down" | "variable" | string;
  strength?: "strong" | "moderate" | "weak" | string;
  note?: string;
}

export interface MedicationEntry {
  id?: string;
  inn: string;
  inn_en?: string | null;
  drug_class?: string | null;
  brand_names?: string[] | null;
  search_terms?: string[] | null;
  lab_effects?: LabEffect[] | null;
  clinical_note?: string | null;
  verified?: boolean | null;
}

/** Нормализация строки препарата: нижний регистр, ё→е, без дозировок и форм. */
export function normalizeMedName(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'()\[\]]/g, " ")
    // дозировки и формы выпуска
    .replace(/\b\d+([.,]\d+)?\s*(мг|мкг|г|мл|ме|iu|mg|mcg|g|ml|%)\b/g, " ")
    .replace(/\b(таб|табл|таблетки|капс|капсулы|раствор|сироп|инъекции|спрей|мазь|форте|ретард|сr|sr|xr)\b/g, " ")
    .replace(/[^a-zа-я0-9+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

function candidateTerms(entry: MedicationEntry): string[] {
  const terms = [
    entry.inn,
    entry.inn_en ?? "",
    ...(entry.brand_names ?? []),
    ...(entry.search_terms ?? []),
  ];
  return terms.map(normalizeMedName).filter(Boolean);
}

/** Вхождение термина в строку как отдельного слова (а не куска другого слова). */
function containsAsWord(q: string, term: string): boolean {
  let from = 0;
  for (;;) {
    const i = q.indexOf(term, from);
    if (i < 0) return false;
    const before = i === 0 ? "" : q[i - 1];
    const after = i + term.length >= q.length ? "" : q[i + term.length];
    const isLetter = (c: string) => !!c && /[a-zа-я0-9]/.test(c);
    if (!isLetter(before) && !isLetter(after)) return true;
    from = i + 1;
  }
}

/**
 * Подбор записи справочника под произвольную строку.
 * Порядок: точное совпадение → вхождение термина целым словом (самый длинный термин)
 * → осторожный fuzzy (1 опечатка, только длинные названия).
 * Важно: точный проход идёт по всему справочнику раньше подстрочного, иначе
 * «эзомепразол» цепляется за «омепразол», а «метилпреднизолон» — за «преднизолон».
 */
export function matchMedication(raw: string, dict: MedicationEntry[]): MedicationEntry | null {
  const q = normalizeMedName(raw);
  if (!q) return null;

  const prepared = dict.map((entry) => ({ entry, terms: candidateTerms(entry) }));

  // 1. Точное совпадение
  for (const { entry, terms } of prepared) {
    if (terms.some((t) => t === q)) return entry;
  }

  // 2. Термин как отдельное слово внутри строки — берём самый длинный (самый специфичный)
  let subBest: { entry: MedicationEntry; len: number } | null = null;
  for (const { entry, terms } of prepared) {
    for (const term of terms) {
      if (term.length < 5) continue;
      if (containsAsWord(q, term) && (!subBest || term.length > subBest.len)) {
        subBest = { entry, len: term.length };
      }
    }
  }
  if (subBest) return subBest.entry;

  // 3. Осторожный fuzzy: 1 опечатка и только для длинных названий,
  // иначе разные препараты («Небиксиум» и «Нексиум») склеиваются в один.
  const maxDist = q.length >= 8 ? 1 : 0;
  if (maxDist === 0) return null;
  let fuzzyBest: { entry: MedicationEntry; dist: number } | null = null;
  for (const { entry, terms } of prepared) {
    for (const term of terms) {
      if (Math.abs(term.length - q.length) > maxDist) continue;
      const d = levenshtein(term, q);
      if (d <= maxDist && (!fuzzyBest || d < fuzzyBest.dist)) fuzzyBest = { entry, dist: d };
    }
  }
  return fuzzyBest?.entry ?? null;
}


const DIRECTION_RU: Record<string, string> = {
  up: "повышает",
  down: "понижает",
  variable: "может менять в обе стороны",
};

const STRENGTH_RU: Record<string, string> = {
  strong: "выраженно",
  moderate: "умеренно",
  weak: "слабо",
};

function formatEffect(e: LabEffect): string {
  const marker = e.biomarker_code || e.biomarker || "показатель";
  const dir = DIRECTION_RU[String(e.direction)] ?? String(e.direction ?? "влияет на");
  const strength = STRENGTH_RU[String(e.strength)] ?? "";
  const note = e.note ? ` — ${e.note}` : "";
  return `${marker}: ${dir}${strength ? ` (${strength})` : ""}${note}`;
}

export interface ResolvedMedication {
  raw: string;
  entry: MedicationEntry | null;
}

/** Сопоставляет список препаратов пациента со справочником. */
export function resolveMedications(raws: string[], dict: MedicationEntry[]): ResolvedMedication[] {
  return raws
    .map((r) => String(r ?? "").trim())
    .filter(Boolean)
    .map((raw) => ({ raw, entry: matchMedication(raw, dict) }));
}

/** Текстовый блок фактов о препаратах для промпта. */
export function buildMedicationFactsText(resolved: ResolvedMedication[]): string {
  if (resolved.length === 0) return "  Не указаны";
  const lines: string[] = [];
  for (const { raw, entry } of resolved) {
    if (!entry) {
      lines.push(`  - ${raw} — препарат НЕ распознан. Не угадывай действующее вещество и не строй на нём выводы.`);
      continue;
    }
    const head = `  - ${raw} → ${entry.inn}${entry.drug_class ? ` (${entry.drug_class})` : ""}`;
    lines.push(head);
    const effects = (entry.lab_effects ?? []).filter(Boolean);
    if (effects.length) {
      lines.push(`      Возможное влияние на анализы: ${effects.map(formatEffect).join("; ")}`);
    }
    if (entry.clinical_note) lines.push(`      ${entry.clinical_note}`);
  }
  return lines.join("\n");
}

/** Загружает справочник и возвращает готовые факты по препаратам пациента. */
export async function buildMedicationFacts(
  supabase: { from: (t: string) => any },
  medications: unknown,
): Promise<string> {
  const raws = Array.isArray(medications)
    ? (medications as unknown[]).map((m) => String(m).trim()).filter(Boolean)
    : [];
  if (raws.length === 0) return "  Не указаны";

  try {
    const { data } = await supabase
      .from("medication_dictionary")
      .select("inn, inn_en, drug_class, brand_names, search_terms, lab_effects, clinical_note, verified");
    const dict = (data ?? []) as MedicationEntry[];
    return buildMedicationFactsText(resolveMedications(raws, dict));
  } catch (_e) {
    return raws.map((m) => `  - ${m}`).join("\n");
  }
}
