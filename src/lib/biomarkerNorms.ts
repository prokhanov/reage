/**
 * Utility functions for calculating age-dependent biomarker normal ranges
 */

export interface AgeRange {
  age_from: number;
  age_to: number;
  min: number;
  max: number;
}

export interface AgeRanges {
  male?: AgeRange[];
  female?: AgeRange[];
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get normal range for a biomarker based on age and gender
 * Returns age-specific range if available, falls back to gender-specific, then general range
 */
export function getNormalRangeForAge(
  biomarker: any,
  age: number,
  gender: 'male' | 'female'
): { min: number | null; max: number | null } {
  // 1. Check age_ranges first
  if (biomarker.age_ranges?.[gender]) {
    const ageRange = biomarker.age_ranges[gender].find(
      (range: AgeRange) => age >= range.age_from && age <= range.age_to
    );
    if (ageRange) {
      return { min: ageRange.min, max: ageRange.max };
    }
  }
  
  // 2. Fallback to gender-specific norms
  if (gender === 'male' && biomarker.normal_min_male !== null) {
    return {
      min: biomarker.normal_min_male,
      max: biomarker.normal_max_male
    };
  }
  if (gender === 'female' && biomarker.normal_min_female !== null) {
    return {
      min: biomarker.normal_min_female,
      max: biomarker.normal_max_female
    };
  }
  
  // 3. Fallback to general norms
  return {
    min: biomarker.normal_min,
    max: biomarker.normal_max
  };
}

/**
 * Format normal range for display
 */
export function formatNormalRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—';
  if (min === null) return `≤ ${max}`;
  if (max === null) return `≥ ${min}`;
  return `${min} - ${max}`;
}
