import { useState, useEffect } from "react";
import { Check, ArrowLeft, Heart, Brain, Utensils, Activity, Bone, Shield, Flower2, Droplet, Baby, BabyIcon, Eye, Pill, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RegisterFormData } from "@/pages/Register";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RegisterStep3Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RegisterStep3({ formData, updateFormData, onNext, onBack }: RegisterStep3Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMedicalConditions();
  }, []);

  const loadMedicalConditions = async () => {
    try {
      const { data: conditions } = await supabase
        .from("medical_conditions_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (conditions && conditions.length > 0) {
        // Extract unique categories preserving order of first appearance
        const categoryOrder: string[] = [];
        const categoryMap: Record<string, string[]> = {};
        
        for (const c of conditions) {
          if (!categoryMap[c.category]) {
            categoryMap[c.category] = [];
            categoryOrder.push(c.category);
          }
          categoryMap[c.category].push(c.condition);
        }

        const grouped = categoryOrder.map(cat => ({
          title: cat,
          icon: getCategoryIcon(cat),
          conditions: categoryMap[cat]
        }));
        
        setDynamicCategories(grouped);
      }
    } catch (error) {
      console.error("Error loading medical conditions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      "🫀 Сердечно-сосудистая система": Heart,
      "🧠 Нервная система": Brain,
      "🍽 Пищеварительная система": Utensils,
      "🩸 Метаболические нарушения": Droplet,
      "🧘‍♀️ Гормональные нарушения": Activity,
      "💪 Опорно-двигательная система": Bone,
      "🦠 Иммунная система": Shield,
      "🩸 Кроветворная система": Droplet,
      "💊 Инфекционные заболевания": Pill,
      "🧬 Онкология": Activity
    };
    return iconMap[category] || Activity;
  };

  const toggleCondition = (category: string, condition: string) => {
    const key = `${category}|${condition}`;
    const newHistory = formData.medicalHistory.includes(key)
      ? formData.medicalHistory.filter(c => c !== key)
      : [...formData.medicalHistory, key];
    
    updateFormData({ medicalHistory: newHistory });
  };

  const isSelected = (category: string, condition: string) => {
    return formData.medicalHistory.includes(`${category}|${condition}`);
  };

  const toggleCategory = (title: string) => {
    setOpenCategories(prev =>
      prev.includes(title)
        ? prev.filter(c => c !== title)
        : [...prev, title]
    );
  };

  // Use dynamic categories loaded from DB
  const categoriesToUse = dynamicCategories;

  const filteredCategories = categoriesToUse.map(category => ({
    ...category,
    conditions: category.conditions.filter(c =>
      c.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.conditions.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">История болезней</h2>
        <p className="text-muted-foreground">
          Отметьте перенесенные заболевания (необязательно)
        </p>
      </div>

      {/* Selected Count */}
      {formData.medicalHistory.length > 0 && (
        <div className="flex items-center justify-center">
          <Badge variant="secondary" className="text-sm">
            Выбрано: {formData.medicalHistory.length}
          </Badge>
        </div>
      )}

      {/* Search */}
      <Input
        type="text"
        placeholder="Поиск по заболеваниям..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full"
      />

      {/* Categories */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {filteredCategories.map((category) => {
          const Icon = category.icon;
          const selectedCount = category.conditions.filter(c => 
            isSelected(category.title, c)
          ).length;

          return (
            <Collapsible
              key={category.title}
              open={openCategories.includes(category.title)}
              onOpenChange={() => toggleCategory(category.title)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{category.title.replace(/^\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic})*\ufe0f?\s*/u, '')}</p>
                      {selectedCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedCount} выбрано
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      openCategories.includes(category.title) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2 pl-4">
                {category.conditions.map((condition) => {
                  const selected = isSelected(category.title, condition);
                  
                  return (
                    <button
                      key={condition}
                      onClick={() => toggleCondition(category.title, condition)}
                      className={`
                        w-full text-left p-3 rounded-md border transition-all text-sm
                        ${selected 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border/50 hover:border-primary/30'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span>{condition}</span>
                        {selected && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <div className="flex gap-3 pt-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
          size="lg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Button 
          onClick={onNext}
          className="flex-1"
          size="lg"
        >
          Продолжить
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
