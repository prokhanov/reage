/**
 * Utility functions for calculating age-dependent biomarker normal ranges
 * and 4-tier biomarker status classification
 */

export type BiomarkerStatus = 'optimal' | 'acceptable' | 'risk' | 'critical';

export interface BiomarkerStatusInfo {
  status: BiomarkerStatus;
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export interface AgeRange {
  age_from: number;
  age_to: number;
  min: number;
  max: number;
  optimal_min?: number;
  optimal_max?: number;
  critical_min?: number;
  critical_max?: number;
}

export interface AgeRanges {
  male?: AgeRange[];
  female?: AgeRange[];
}

const STATUS_MAP: Record<BiomarkerStatus, BiomarkerStatusInfo> = {
  optimal: {
    status: 'optimal',
    label: 'Оптимально',
    emoji: '🟢',
    colorClass: 'text-status-optimal',
    bgClass: 'bg-status-optimal/20',
    borderClass: 'border-status-optimal/30',
  },
  acceptable: {
    status: 'acceptable',
    label: 'Допустимо',
    emoji: '🟡',
    colorClass: 'text-status-acceptable',
    bgClass: 'bg-status-acceptable/20',
    borderClass: 'border-status-acceptable/30',
  },
  risk: {
    status: 'risk',
    label: 'Риск',
    emoji: '🟠',
    colorClass: 'text-status-risk',
    bgClass: 'bg-status-risk/20',
    borderClass: 'border-status-risk/30',
  },
  critical: {
    status: 'critical',
    label: 'Критично',
    emoji: '🔴',
    colorClass: 'text-status-critical',
    bgClass: 'bg-status-critical/20',
    borderClass: 'border-status-critical/30',
  },
};

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
  // 1. Check age_ranges first (only if range_mode is 'age')
  if (biomarker.range_mode === 'age' && biomarker.age_ranges?.[gender]) {
    const ageRange = biomarker.age_ranges[gender].find(
      (range: AgeRange) => age >= range.age_from && age <= range.age_to
    );
    if (ageRange) {
      return { min: ageRange.min, max: ageRange.max };
    }
  }
  
  // 2. Fallback to gender-specific norms
  if (gender === 'male' && biomarker.normal_min_male !== null && biomarker.normal_min_male !== undefined) {
    return {
      min: biomarker.normal_min_male,
      max: biomarker.normal_max_male
    };
  }
  if (gender === 'female' && biomarker.normal_min_female !== null && biomarker.normal_min_female !== undefined) {
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
 * Get optimal range for a biomarker based on age and gender
 */
export function getOptimalRangeForAge(
  biomarker: any,
  age: number,
  gender: 'male' | 'female'
): { min: number | null; max: number | null } {
  // 1. Check age_ranges first (only if range_mode is 'age')
  if (biomarker.range_mode === 'age' && biomarker.age_ranges?.[gender]) {
    const ageRange = biomarker.age_ranges[gender].find(
      (range: AgeRange) => age >= range.age_from && age <= range.age_to
    );
    if (ageRange && ageRange.optimal_min !== undefined && ageRange.optimal_max !== undefined) {
      return { min: ageRange.optimal_min, max: ageRange.optimal_max };
    }
  }
  
  // 2. Fallback to gender-specific optimal norms
  if (gender === 'male' && biomarker.optimal_min_male != null) {
    return { min: biomarker.optimal_min_male, max: biomarker.optimal_max_male };
  }
  if (gender === 'female' && biomarker.optimal_min_female != null) {
    return { min: biomarker.optimal_min_female, max: biomarker.optimal_max_female };
  }
  
  // 3. Fallback to general optimal norms
  if (biomarker.optimal_min != null || biomarker.optimal_max != null) {
    return { min: biomarker.optimal_min, max: biomarker.optimal_max };
  }
  
  // 4. No optimal range defined - return null
  return { min: null, max: null };
}

/**
 * Get critical range for a biomarker based on age and gender
 */
export function getCriticalRangeForAge(
  biomarker: any,
  age: number,
  gender: 'male' | 'female'
): { min: number | null; max: number | null } {
  // 1. Check age_ranges first (only if range_mode is 'age')
  if (biomarker.range_mode === 'age' && biomarker.age_ranges?.[gender]) {
    const ageRange = biomarker.age_ranges[gender].find(
      (range: AgeRange) => age >= range.age_from && age <= range.age_to
    );
    if (ageRange && ageRange.critical_min !== undefined && ageRange.critical_max !== undefined) {
      return { min: ageRange.critical_min, max: ageRange.critical_max };
    }
  }
  
  // 2. Fallback to gender-specific critical norms
  if (gender === 'male' && biomarker.critical_min_male != null) {
    return { min: biomarker.critical_min_male, max: biomarker.critical_max_male };
  }
  if (gender === 'female' && biomarker.critical_min_female != null) {
    return { min: biomarker.critical_min_female, max: biomarker.critical_max_female };
  }
  
  // 3. Fallback to general critical norms
  if (biomarker.critical_min != null || biomarker.critical_max != null) {
    return { min: biomarker.critical_min, max: biomarker.critical_max };
  }
  
  // 4. No critical range defined - return null
  return { min: null, max: null };
}

/**
 * Get 4-tier biomarker status based on value, age and gender.
 * 
 * Logic:
 * - If value is within optimal range → 🟢 Оптимально
 * - If value is within normal range (but outside optimal) → 🟡 Допустимо
 * - If value is outside normal but within critical thresholds → 🟠 Риск
 * - If value is beyond critical thresholds → 🔴 Критично
 * 
 * When optimal/critical ranges are not configured, falls back gracefully:
 * - No optimal → normal range counts as optimal
 * - No critical → anything outside normal is risk (never critical)
 */
export function getBiomarkerStatus(
  value: number,
  biomarker: any,
  age: number | null,
  gender: 'male' | 'female' | null
): BiomarkerStatusInfo {
  const g = gender || 'male';
  const a = age ?? 40;
  
  const normalRange = getNormalRangeForAge(biomarker, a, g);
  const optimalRange = getOptimalRangeForAge(biomarker, a, g);
  const criticalRange = getCriticalRangeForAge(biomarker, a, g);
  
  // If no normal range at all, return acceptable as default
  if (normalRange.min === null && normalRange.max === null) {
    return STATUS_MAP.acceptable;
  }
  
  // Check critical first (most severe)
  if (criticalRange.min !== null || criticalRange.max !== null) {
    if (
      (criticalRange.min !== null && value < criticalRange.min) ||
      (criticalRange.max !== null && value > criticalRange.max)
    ) {
      return STATUS_MAP.critical;
    }
  }
  
  // Check if outside normal range → risk (or critical if no critical range defined)
  const isOutsideNormal = 
    (normalRange.min !== null && value < normalRange.min) ||
    (normalRange.max !== null && value > normalRange.max);
  
  if (isOutsideNormal) {
    // If critical range is defined, being outside normal but inside critical = risk
    // If critical range is NOT defined, outside normal = risk (not critical, since we can't determine severity)
    return STATUS_MAP.risk;
  }
  
  // Value is within normal range. Check optimal.
  if (optimalRange.min !== null || optimalRange.max !== null) {
    const isInOptimal = 
      (optimalRange.min === null || value >= optimalRange.min) &&
      (optimalRange.max === null || value <= optimalRange.max);
    
    if (isInOptimal) {
      return STATUS_MAP.optimal;
    }
    // Within normal but outside optimal → acceptable
    return STATUS_MAP.acceptable;
  }
  
  // No optimal range defined → within normal = optimal
  return STATUS_MAP.optimal;
}

/**
 * Get status info by status key
 */
export function getStatusInfo(status: BiomarkerStatus): BiomarkerStatusInfo {
  return STATUS_MAP[status];
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

/**
 * Get HSL color string for a biomarker status (for use in SVG/inline styles)
 */
export function getStatusHslColor(status: BiomarkerStatus): string {
  switch (status) {
    case 'optimal': return 'hsl(var(--status-optimal))';
    case 'acceptable': return 'hsl(var(--status-acceptable))';
    case 'risk': return 'hsl(var(--status-risk))';
    case 'critical': return 'hsl(var(--status-critical))';
  }
}
