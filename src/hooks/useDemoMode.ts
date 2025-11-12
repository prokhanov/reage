import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateAge } from "@/lib/biomarkerNorms";
import { DEMO_TO_DB_CODE } from "@/lib/biomarkerCodeMap";
import { useViewAsUser } from "@/hooks/useViewAsUser";

interface DemoData {
  profile: any;
  analyses: any[];  // Changed from single analysis to array
  biomarkers: any[];
  symptoms: any[];
  weight_history: any[];
  prescriptions: any[];
  recommendations: any[];
  risk_zones: any;
}

// Helper to get latest analysis from demo data
export const getLatestDemoAnalysis = (demoData: DemoData | null) => {
  if (!demoData || !demoData.analyses || demoData.analyses.length === 0) {
    return null;
  }
  return demoData.analyses[demoData.analyses.length - 1];
};

export const useDemoMode = () => {
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getUserId } = useViewAsUser();

  useEffect(() => {
    fetchDemoModeStatus();
  }, []);

  const adaptDemoDataToUser = (templateData: any, userProfile: any): DemoData => {
    const genderData = userProfile.gender === 'male' ? templateData.male_data : templateData.female_data;
    
    const userAge = userProfile.birth_date ? calculateAge(userProfile.birth_date) : null;
    const templateAge = genderData.profile.birth_date ? calculateAge(genderData.profile.birth_date) : 45;
    
    // Adapt profile data
    const adaptedProfile = {
      ...genderData.profile,
      chronological_age: userAge || templateAge,
      weight: userProfile.weight || genderData.profile.weight,
      height: userProfile.height || genderData.profile.height,
      gender: userProfile.gender
    };

    // Calculate dates relative to current date (last 9 months: 4 analyses with 3-month intervals)
    const today = new Date();
    const analysisIntervalMonths = 3;
    const numberOfAnalyses = 4;
    
    // Adapt analyses array - adjust biological ages and dates
    const adaptedAnalyses = (genderData.analyses || []).map((analysis: any, index: number) => {
      // Calculate date: most recent analysis is today, each previous one is 3 months earlier
      const monthsBack = (numberOfAnalyses - 1 - index) * analysisIntervalMonths;
      const analysisDate = new Date(today);
      analysisDate.setMonth(analysisDate.getMonth() - monthsBack);
      
      // Adjust biological age if user age is available
      let biologicalAge = analysis.biological_age;
      if (userAge) {
        const originalDelta = analysis.biological_age - templateAge;
        biologicalAge = userAge + originalDelta;
      }
      
      return {
        ...analysis,
        date: analysisDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
        biological_age: biologicalAge
      };
    });

    return {
      profile: adaptedProfile,
      analyses: adaptedAnalyses,
      biomarkers: genderData.biomarkers || [],  // Keep all biomarkers for trends
      symptoms: genderData.symptoms || [],
      weight_history: genderData.weight_history || [],
      prescriptions: genderData.prescriptions || [],
      recommendations: genderData.recommendations || [],
      risk_zones: genderData.risk_zones || null
    };
  };

  const fetchDemoModeStatus = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('demo_mode_enabled, gender, birth_date, weight, height')
        .eq('id', userId)
        .single();

      if (profile?.demo_mode_enabled) {
        setDemoMode(true);
        await loadDemoData(profile);
      } else {
        setDemoMode(false);
      }
    } catch (error) {
      console.error('Error fetching demo mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = async (userProfile: any) => {
    try {
      const { data: template } = await supabase
        .from('demo_data_templates')
        .select('*')
        .eq('id', 'default')
        .single();

      if (template) {
        const adaptedData = adaptDemoDataToUser(template, userProfile);
        setDemoData(adaptedData);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
    }
  };

  const toggleDemoMode = async (enabled: boolean) => {
    try {
      const userId = await getUserId();
      if (!userId) return false;

      if (enabled) {
        const { count } = await supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (count && count > 0) {
          toast({
            title: "Невозможно включить демо-режим",
            description: "У вас уже есть реальные анализы. Демо-режим доступен только новым пользователям.",
            variant: "destructive"
          });
          return false;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ demo_mode_enabled: enabled })
        .eq('id', userId);

      if (error) throw error;

      setDemoMode(enabled);
      if (enabled) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender, birth_date, weight, height')
          .eq('id', userId)
          .single();
        
        if (profile) {
          await loadDemoData(profile);
        }
      } else {
        setDemoData(null);
      }

      toast({
        title: enabled ? "Демо-режим включен" : "Демо-режим выключен",
        description: enabled 
          ? "Теперь вы видите примерные данные"
          : "Теперь отображаются только ваши реальные данные"
      });

      return true;
    } catch (error) {
      console.error('Error toggling demo mode:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус демо-режима",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    demoMode,
    demoData,
    loading,
    toggleDemoMode,
    refreshDemoMode: fetchDemoModeStatus
  };
};

// Helper function exported for reuse
export const transformDemoBiomarkersToDisplay = async (
  demoBiomarkers: any[],
  demoAnalyses: any[],  // Changed to accept analyses array
  categories: any[]
): Promise<Record<string, any[]>> => {
  // Use the latest analysis for display
  const latestAnalysisIndex = demoAnalyses.length - 1;

  // Filter biomarkers for the latest analysis and map demo codes to database codes
  const latestBiomarkers = demoBiomarkers
    .filter((b: any) => (b.analysis_index || 0) === latestAnalysisIndex)
    .map((b: any) => ({
      ...b,
      code: DEMO_TO_DB_CODE[b.code] || b.code
    }));
  
  // Get unique codes
  const uniqueCodes = [...new Set(latestBiomarkers.map((b: any) => b.code))];
  
  // Fetch biomarker metadata from DB
  const { data: biomarkersMetadata } = await supabase
    .from('biomarkers')
    .select('*')
    .in('code', uniqueCodes);

  // Map metadata by code
  const metadataMap = new Map(
    (biomarkersMetadata || []).map((b: any) => [b.code, b])
  );

  // For trend calculation, find previous analysis values
  const previousAnalysisIndex = latestAnalysisIndex - 1;
  const previousBiomarkers = demoBiomarkers.filter(
    (b: any) => (b.analysis_index || 0) === previousAnalysisIndex
  );
  const previousValuesMap = new Map(
    previousBiomarkers.map((b: any) => [DEMO_TO_DB_CODE[b.code] || b.code, b.value])
  );

  // Combine demo data with DB metadata
  const enrichedBiomarkers = latestBiomarkers.map((b: any) => {
    const metadata = metadataMap.get(b.code);
    const previousValue = previousValuesMap.get(b.code) || null;
    
    // Calculate trend
    let trend: "up" | "down" | "stable" | null = null;
    if (previousValue !== null) {
      const diff = b.value - previousValue;
      const threshold = Math.abs(previousValue) * 0.05; // 5% change
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

  // Group by category
  const grouped = enrichedBiomarkers.reduce((acc: any, biomarker: any) => {
    const category = biomarker.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(biomarker);
    return acc;
  }, {});

  // Sort categories by display_order
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
