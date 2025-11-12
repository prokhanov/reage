import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateAge } from "@/lib/biomarkerNorms";

interface DemoData {
  profile: {
    chronological_age: number;
    weight: number;
    height: number;
  };
  analysis: any;
  biomarkers: any[];
  symptoms: any[];
  weight_history: any[];
  prescriptions: any[];
  recommendations: any[];
  risk_zones: any;
}

export const useDemoMode = () => {
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDemoModeStatus();
  }, []);

  const adaptDemoDataToUser = (
    templateData: any,
    userAge: number,
    userWeight: number,
    userHeight: number
  ): DemoData => {
    const adapted = JSON.parse(JSON.stringify(templateData));
    
    const ageDiff = userAge - 45;
    adapted.profile.chronological_age = userAge;
    adapted.analysis.biological_age = Math.round(49 + ageDiff);
    
    adapted.profile.weight = userWeight;
    adapted.profile.height = userHeight;
    
    const weightRatio = userWeight / templateData.profile.weight;
    adapted.weight_history = adapted.weight_history.map((entry: any) => ({
      ...entry,
      weight: Math.round(entry.weight * weightRatio * 10) / 10
    }));
    
    return adapted;
  };

  const fetchDemoModeStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('demo_mode_enabled, gender, birth_date, weight, height')
        .eq('id', user.id)
        .single();

      if (profile?.demo_mode_enabled) {
        setDemoMode(true);
        await loadDemoData(
          profile.gender || 'male',
          profile.birth_date ? calculateAge(profile.birth_date) : 45,
          profile.weight || (profile.gender === 'female' ? 68 : 85),
          profile.height || (profile.gender === 'female' ? 165 : 178)
        );
      } else {
        setDemoMode(false);
      }
    } catch (error) {
      console.error('Error fetching demo mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = async (
    gender: string,
    age: number,
    weight: number,
    height: number
  ) => {
    try {
      const { data: template } = await supabase
        .from('demo_data_templates')
        .select('*')
        .eq('id', 'default')
        .single();

      if (template) {
        const genderData = gender === 'female' ? template.female_data : template.male_data;
        const adaptedData = adaptDemoDataToUser(genderData, age, weight, height);
        setDemoData(adaptedData);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
    }
  };

  const toggleDemoMode = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      if (enabled) {
        const { count } = await supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

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
        .eq('id', user.id);

      if (error) throw error;

      setDemoMode(enabled);
      if (enabled) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender, birth_date, weight, height')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          await loadDemoData(
            profile.gender || 'male',
            profile.birth_date ? calculateAge(profile.birth_date) : 45,
            profile.weight || (profile.gender === 'female' ? 68 : 85),
            profile.height || (profile.gender === 'female' ? 165 : 178)
          );
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
