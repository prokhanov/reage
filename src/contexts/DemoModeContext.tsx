import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateAge } from "@/lib/biomarkerNorms";
import { useViewAsUser } from "@/hooks/useViewAsUser";

export interface DemoData {
  profile: any;
  analyses: any[];
  biomarkers: any[];
  symptoms: any[];
  weight_history: any[];
  prescriptions: any[];
  recommendations: any[];
  risk_zones: any;
}

interface DemoModeContextValue {
  demoMode: boolean;
  demoData: DemoData | null;
  loading: boolean;
  toggleDemoMode: (enabled: boolean) => Promise<boolean>;
  refreshDemoMode: () => Promise<void>;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

const adaptDemoDataToUser = (templateData: any, userProfile: any): DemoData => {
  const genderData = userProfile.gender === 'male' ? templateData.male_data : templateData.female_data;

  const userAge = userProfile.birth_date ? calculateAge(userProfile.birth_date) : null;
  const templateAge = genderData.profile.birth_date ? calculateAge(genderData.profile.birth_date) : 45;

  const realName = [userProfile.first_name, userProfile.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const adaptedProfile = {
    ...genderData.profile,
    first_name: userProfile.first_name || genderData.profile.first_name || genderData.profile.name,
    last_name: userProfile.last_name || genderData.profile.last_name || '',
    name: realName || genderData.profile.name,
    birth_date: userProfile.birth_date || genderData.profile.birth_date,
    chronological_age: userAge || templateAge,
    weight: userProfile.weight || genderData.profile.weight,
    height: userProfile.height || genderData.profile.height,
    gender: userProfile.gender
  };

  const today = new Date();
  const analysisIntervalMonths = 3;
  const numberOfAnalyses = 4;

  const adaptedAnalyses = (genderData.analyses || []).map((analysis: any, index: number) => {
    const monthsBack = (numberOfAnalyses - 1 - index) * analysisIntervalMonths;
    const analysisDate = new Date(today);
    analysisDate.setMonth(analysisDate.getMonth() - monthsBack);

    let biologicalAge = analysis.biological_age;
    if (userAge) {
      const originalDelta = analysis.biological_age - templateAge;
      biologicalAge = userAge + originalDelta;
    }

    return {
      ...analysis,
      date: analysisDate.toISOString().split('T')[0],
      biological_age: biologicalAge
    };
  });

  let adaptedRiskZones = genderData.risk_zones || null;
  if (adaptedRiskZones && userAge && templateAge) {
    adaptedRiskZones = JSON.parse(
      JSON.stringify(adaptedRiskZones)
        .replace(new RegExp(`${templateAge}\\+`, 'g'), `${userAge}+`)
        .replace(new RegExp(`после ${templateAge}`, 'g'), `после ${userAge}`)
        .replace(new RegExp(`возраста ${templateAge}`, 'g'), `возраста ${userAge}`)
    );
  }

  if (adaptedRiskZones && adaptedAnalyses.length > 0) {
    const templateAnalyses = genderData.analyses || [];
    const lastTemplateBio = templateAnalyses[templateAnalyses.length - 1]?.biological_age;
    const lastAdaptedBio = adaptedAnalyses[adaptedAnalyses.length - 1]?.biological_age;

    if (lastTemplateBio && lastAdaptedBio && lastTemplateBio !== lastAdaptedBio) {
      const delta = lastAdaptedBio - lastTemplateBio;
      const templateTarget = 42;
      const adaptedTarget = Math.round((templateTarget + delta) * 10) / 10;

      let riskZonesStr = JSON.stringify(adaptedRiskZones);
      riskZonesStr = riskZonesStr
        .replace(/43\.5/g, String(Math.round(lastAdaptedBio * 10) / 10))
        .replace(/42 года/g, `${adaptedTarget} года`);
      adaptedRiskZones = JSON.parse(riskZonesStr);
    }
  }

  return {
    profile: adaptedProfile,
    analyses: adaptedAnalyses,
    biomarkers: genderData.biomarkers || [],
    symptoms: genderData.symptoms || [],
    weight_history: genderData.weight_history || [],
    prescriptions: genderData.prescriptions || [],
    recommendations: genderData.recommendations || [],
    risk_zones: adaptedRiskZones
  };
};

export const DemoModeProvider = ({ children }: { children: ReactNode }) => {
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getUserId } = useViewAsUser();

  const loadDemoData = useCallback(async (userProfile: any) => {
    try {
      const template = (await import('@/data/demoTemplate.json')).default as any;
      if (template) {
        const adaptedData = adaptDemoDataToUser(template, userProfile);
        setDemoData(adaptedData);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
    }
  }, []);

  const fetchDemoModeStatus = useCallback(async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('demo_mode_enabled, gender, birth_date, weight, height, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.demo_mode_enabled) {
        setDemoMode(true);
        await loadDemoData(profile);
      } else {
        setDemoMode(false);
        setDemoData(null);
      }
    } catch (error) {
      console.error('Error fetching demo mode:', error);
    } finally {
      setLoading(false);
    }
  }, [getUserId, loadDemoData]);

  useEffect(() => {
    fetchDemoModeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDemoMode = useCallback(async (enabled: boolean): Promise<boolean> => {
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
          .select('gender, birth_date, weight, height, first_name, last_name')
          .eq('id', userId)
          .maybeSingle();

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
  }, [getUserId, loadDemoData, toast]);

  return (
    <DemoModeContext.Provider
      value={{
        demoMode,
        demoData,
        loading,
        toggleDemoMode,
        refreshDemoMode: fetchDemoModeStatus,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoModeContext = (): DemoModeContextValue => {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    // Safe fallback for components rendered outside the provider (e.g. public pages).
    return {
      demoMode: false,
      demoData: null,
      loading: false,
      toggleDemoMode: async () => false,
      refreshDemoMode: async () => {},
    };
  }
  return ctx;
};

export const getLatestDemoAnalysis = (demoData: DemoData | null) => {
  if (!demoData || !demoData.analyses || demoData.analyses.length === 0) {
    return null;
  }
  return demoData.analyses[demoData.analyses.length - 1];
};
