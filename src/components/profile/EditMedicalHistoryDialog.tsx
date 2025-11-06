import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Check, Heart, Brain, Utensils, Activity, Bone, Shield, Flower2, Droplet, Pill } from "lucide-react";

interface MedicalCondition {
  id: string;
  category: string;
  condition: string;
}

interface EditMedicalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalHistory: MedicalCondition[];
  userId: string | null;
  onSuccess: () => void;
}

const medicalCategories = [
  {
    title: "Сердечно-сосудистая система",
    icon: Heart,
    conditions: [
      "Гипертония (повышенное давление)",
      "Гипотония (пониженное давление)",
      "Ишемическая болезнь сердца (ИБС)",
      "Аритмия",
      "Инфаркт миокарда в прошлом",
      "Инсульт",
      "Повышенный холестерин / атеросклероз",
      "Варикозная болезнь",
      "Тромбоз / тромбофлебит"
    ]
  },
  {
    title: "Нервная система и психоэмоциональное состояние",
    icon: Brain,
    conditions: [
      "Хронический стресс",
      "Бессонница",
      "Тревожное расстройство",
      "Депрессия",
      "Панические атаки",
      "Мигрени",
      "Невроз",
      "Эпилепсия"
    ]
  },
  {
    title: "Пищеварительная система",
    icon: Utensils,
    conditions: [
      "Гастрит",
      "Язва желудка или двенадцатиперстной кишки",
      "ГЭРБ (рефлюкс, изжога)",
      "Синдром раздражённого кишечника (СРК)",
      "Непереносимость лактозы",
      "Целиакия",
      "Хронический панкреатит"
    ]
  },
  {
    title: "Метаболические нарушения",
    icon: Droplet,
    conditions: [
      "Избыточный вес / ожирение",
      "Сахарный диабет 1 или 2 типа",
      "Инсулинорезистентность",
      "Метаболический синдром",
      "Подагра (высокая мочевая кислота)"
    ]
  },
  {
    title: "Гормональные и эндокринные нарушения",
    icon: Activity,
    conditions: [
      "Заболевания щитовидной железы",
      "Повышенный ТТГ",
      "Снижение тестостерона",
      "Снижение эстрогенов / климакс",
      "СПКЯ",
      "Повышенный пролактин"
    ]
  },
  {
    title: "Опорно-двигательная система",
    icon: Bone,
    conditions: [
      "Артрит / артроз",
      "Остеохондроз",
      "Грыжа позвоночника",
      "Сколиоз",
      "Остеопороз",
      "Хронические боли в спине"
    ]
  },
  {
    title: "Иммунная система / воспалительные заболевания",
    icon: Shield,
    conditions: [
      "Частые простуды (более 4 раз в год)",
      "Аутоиммунные болезни",
      "Хронические воспаления",
      "Повышенный CRP",
      "Аллергии",
      "Астма"
    ]
  }
];

export function EditMedicalHistoryDialog({ 
  open, 
  onOpenChange, 
  medicalHistory,
  userId,
  onSuccess 
}: EditMedicalHistoryDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(
    new Set(medicalHistory.map(m => `${m.category}|${m.condition}`))
  );
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMedicalConditions();
      setSelectedConditions(new Set(medicalHistory.map(m => `${m.category}|${m.condition}`)));
    }
  }, [open, medicalHistory]);

  const loadMedicalConditions = async () => {
    try {
      const { data } = await supabase
        .from("medical_conditions_templates")
        .select("*")
        .order("category", { ascending: true })
        .order("condition", { ascending: true });

      if (data && data.length > 0) {
        const grouped = data.reduce((acc: any, item) => {
          const existing = acc.find((cat: any) => cat.title === item.category);
          if (existing) {
            existing.conditions.push(item.condition);
          } else {
            acc.push({
              title: item.category,
              icon: getCategoryIcon(item.category),
              conditions: [item.condition]
            });
          }
          return acc;
        }, []);
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
    const newSelected = new Set(selectedConditions);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedConditions(newSelected);
  };

  const isSelected = (category: string, condition: string) => {
    return selectedConditions.has(`${category}|${condition}`);
  };

  const toggleCategory = (title: string) => {
    setOpenCategories(prev =>
      prev.includes(title)
        ? prev.filter(c => c !== title)
        : [...prev, title]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!userId) throw new Error("Не авторизован");

      // Delete all existing
      await supabase
        .from("medical_history")
        .delete()
        .eq("user_id", userId);

      // Insert new selections
      if (selectedConditions.size > 0) {
        const medicalData = Array.from(selectedConditions).map(key => {
          const [category, condition] = key.split('|');
          return {
            user_id: userId,
            category,
            condition
          };
        });

        const { error } = await supabase
          .from("medical_history")
          .insert(medicalData);

        if (error) throw error;
      }

      toast({
        title: "Успешно сохранено! ✅",
        description: `Обновлено ${selectedConditions.size} записей`
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error saving medical history:", error);
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Попробуйте еще раз",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const categoriesToUse = dynamicCategories.length > 0 ? dynamicCategories : medicalCategories;

  const filteredCategories = categoriesToUse.map(category => ({
    ...category,
    conditions: category.conditions.filter(c =>
      c.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.conditions.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Редактировать историю болезней</DialogTitle>
          <DialogDescription>
            Выберите перенесенные заболевания
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          ) : (
            <>
              {/* Selected Count */}
              {selectedConditions.size > 0 && (
                <div className="flex items-center justify-center">
                  <Badge variant="secondary" className="text-sm">
                    Выбрано: {selectedConditions.size}
                  </Badge>
                </div>
              )}

              {/* Search */}
              <Input
                type="text"
                placeholder="Поиск по заболеваниям..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Categories */}
              <div className="space-y-3">
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
                              <p className="font-medium text-sm">{category.title}</p>
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
            </>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
