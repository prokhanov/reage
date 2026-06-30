import { supabase } from "@/integrations/supabase/client";

export type BioAgeNorm = {
  chrono_age: number;
  gender: "male" | "female";
  mean_bio_age: number;
  sd_bio_age: number;
  source: string;
};

// Стандартный нормальный CDF (Abramowitz & Stegun 26.2.17, ошибка < 7.5e-8)
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/**
 * Возвращает данные для сравнения биовозраста пациента со средним по когорте.
 * percentileBetter: какому проценту людей того же хроновозраста и пола пациент "лучше" (то есть его био-возраст ниже).
 */
export async function getBioAgePercentile(
  chronoAge: number,
  bioAge: number,
  gender: "male" | "female" | "other" | null | undefined,
): Promise<{
  norm: BioAgeNorm;
  z: number;
  percentileBetter: number; // 0..100
  topPercent: number; // 0..100
} | null> {
  const safeGender: "male" | "female" = gender === "female" ? "female" : "male";
  const ageInt = Math.max(18, Math.min(100, Math.round(chronoAge)));

  const { data, error } = await supabase
    .from("bioage_population_norms")
    .select("chrono_age, gender, mean_bio_age, sd_bio_age, source")
    .eq("chrono_age", ageInt)
    .eq("gender", safeGender)
    .maybeSingle();

  if (error || !data) return null;

  const norm = data as BioAgeNorm;
  const z = (bioAge - norm.mean_bio_age) / norm.sd_bio_age;
  // Чем меньше bio, тем лучше -> процентиль = 1 - Φ(z) от тех, кто старше биологически
  const percentileBetter = Math.round((1 - normalCdf(z)) * 100);
  const topPercent = Math.max(1, Math.min(99, 100 - percentileBetter));

  return { norm, z, percentileBetter, topPercent };
}
