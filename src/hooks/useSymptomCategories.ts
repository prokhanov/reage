import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SymptomCategory {
  emoji: string;
  title: string;
  symptoms: string[];
}

export function useSymptomCategories() {
  return useQuery({
    queryKey: ["symptom-categories-with-templates"],
    queryFn: async () => {
      // Load categories
      const { data: categories, error: catError } = await supabase
        .from("symptom_categories")
        .select("*")
        .order("display_order");

      if (catError) throw catError;

      // Load templates
      const { data: templates, error: tempError } = await supabase
        .from("symptom_templates")
        .select("*")
        .order("category")
        .order("display_order");

      if (tempError) throw tempError;

      // Group templates by category
      const categoriesWithSymptoms: SymptomCategory[] = (categories || []).map(cat => {
        const categoryTemplates = (templates || [])
          .filter(t => t.category === cat.name)
          .map(t => t.symptom);

        return {
          emoji: cat.emoji,
          title: cat.name,
          symptoms: categoryTemplates
        };
      });

      return categoriesWithSymptoms;
    },
  });
}
