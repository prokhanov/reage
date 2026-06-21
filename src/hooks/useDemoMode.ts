import { supabase } from "@/integrations/supabase/client";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";
import {
  useDemoModeContext,
  getLatestDemoAnalysis as _getLatestDemoAnalysis,
  type DemoData,
} from "@/contexts/DemoModeContext";

// Re-export the shared context hook so existing imports keep working
// while all instances now share a single global state.
export const useDemoMode = () => useDemoModeContext();

export const getLatestDemoAnalysis = _getLatestDemoAnalysis;

// Helper function exported for reuse
export const transformDemoBiomarkersToDisplay = async (
  demoBiomarkers: any[],
  demoAnalyses: any[],
  categories: any[]
): Promise<Record<string, any[]>> => {
  const latestAnalysisIndex = demoAnalyses.length - 1;

  const latestBiomarkers = demoBiomarkers
    .filter((b: any) => (b.analysis_index || 0) === latestAnalysisIndex)
    .map((b: any) => ({
      ...b,
      code: DEMO_TO_DB_CODE[b.code] || b.code
    }));

  const uniqueCodes = [...new Set(latestBiomarkers.map((b: any) => b.code))];

  const { data: biomarkersMetadata } = await supabase
    .from('biomarkers')
    .select('*')
    .in('code', uniqueCodes);

  const metadataMap = new Map(
    (biomarkersMetadata || []).map((b: any) => [b.code, b])
  );

  const previousAnalysisIndex = latestAnalysisIndex - 1;
  const previousBiomarkers = demoBiomarkers.filter(
    (b: any) => (b.analysis_index || 0) === previousAnalysisIndex
  );
  const previousValuesMap = new Map(
    previousBiomarkers.map((b: any) => [DEMO_TO_DB_CODE[b.code] || b.code, b.value])
  );

  const enrichedBiomarkers = latestBiomarkers.map((b: any) => {
    const metadata = metadataMap.get(b.code);
    const previousValue = previousValuesMap.get(b.code) || null;

    let trend: "up" | "down" | "stable" | null = null;
    if (previousValue !== null) {
      const diff = b.value - previousValue;
      const threshold = Math.abs(previousValue) * 0.05;
      if (Math.abs(diff) < threshold) {
        trend = "stable";
      } else if (diff > 0) {
        trend = "up";
      } else {
        trend = "down";
      }
    }

    return {
      id: b.code,
      name: metadata?.name || b.code,
      code: b.code,
      category: metadata?.category || b.category,
      unit: metadata?.unit || b.unit || '',
      description: metadata?.description || null,
      normal_min: metadata?.normal_min || null,
      normal_max: metadata?.normal_max || null,
      normal_min_male: metadata?.normal_min_male || null,
      normal_max_male: metadata?.normal_max_male || null,
      normal_min_female: metadata?.normal_min_female || null,
      normal_max_female: metadata?.normal_max_female || null,
      age_ranges: metadata?.age_ranges || null,
      latest_value: b.value,
      latest_date: demoAnalyses[latestAnalysisIndex].analysis_date,
      previous_value: previousValue,
      trend
    };
  });

  const categoryOrderMap = new Map(
    (categories || []).map((cat) => [cat.name, cat.display_order])
  );

  const grouped = enrichedBiomarkers.reduce((acc: any, biomarker: any) => {
    const category = biomarker.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(biomarker);
    return acc;
  }, {});

  const sortedGrouped: any = {};
  Object.keys(grouped)
    .sort((a, b) => {
      const orderA = categoryOrderMap.get(a) ?? 999;
      const orderB = categoryOrderMap.get(b) ?? 999;
      return orderA - orderB;
    })
    .forEach(cat => {
      sortedGrouped[cat] = grouped[cat];
    });

  return sortedGrouped;
};

export type { DemoData };
