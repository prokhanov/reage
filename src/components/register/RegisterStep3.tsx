import { useState } from "react";
import { Check, ArrowLeft, Heart, Brain, Utensils, Activity, Bone, Shield, Flower2, Droplet, Baby, BabyIcon, Eye, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RegisterFormData } from "@/pages/Register";
import { ChevronDown } from "lucide-react";

interface RegisterStep3Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const medicalCategories = [
  {
    emoji: "🫀",
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
      "Тромбоз / тромбофлебит",
      "Перикардит / миокардит"
    ]
  },
  {
    emoji: "🧠",
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
      "Эпилепсия",
      "Синдром хронической усталости",
      "Тремор / болезнь Паркинсона"
    ]
  },
  {
    emoji: "🍽",
    title: "Пищеварительная система",
    icon: Utensils,
    conditions: [
      "Гастрит",
      "Язва желудка или двенадцатиперстной кишки",
      "ГЭРБ (рефлюкс, изжога)",
      "Синдром раздражённого кишечника (СРК)",
      "Непереносимость лактозы",
      "Целиакия",
      "Хронический панкреатит",
      "Холецистит / камни в желчном пузыре",
      "Гепатит (A, B, C, неуточнённый)",
      "Жировой гепатоз печени",
      "Повышенные ферменты АЛТ/АСТ",
      "Проблемы с микробиотой (дисбиоз, вздутие, частые запоры/поносы)"
    ]
  },
  {
    emoji: "🩸",
    title: "Метаболические нарушения",
    icon: Droplet,
    conditions: [
      "Избыточный вес / ожирение",
      "Сахарный диабет 1 или 2 типа",
      "Инсулинорезистентность",
      "Метаболический синдром",
      "Подагра (высокая мочевая кислота)",
      "Дислипидемия",
      "Повышенные триглицериды"
    ]
  },
  {
    emoji: "🧘‍♀️",
    title: "Гормональные и эндокринные нарушения",
    icon: Activity,
    conditions: [
      "Заболевания щитовидной железы (гипо-, гипертиреоз, аутоиммунный тиреоидит)",
      "Повышенный ТТГ",
      "Снижение тестостерона",
      "Снижение эстрогенов / климакс",
      "СПКЯ (синдром поликистозных яичников)",
      "Повышенный пролактин",
      "Надпочечниковая недостаточность",
      "Болезнь Кушинга",
      "Проблемы с кортизолом (низкий/высокий)"
    ]
  },
  {
    emoji: "💪",
    title: "Опорно-двигательная система",
    icon: Bone,
    conditions: [
      "Артрит / артроз",
      "Остеохондроз",
      "Грыжа позвоночника",
      "Сколиоз",
      "Остеопороз",
      "Хронические боли в спине",
      "Подагра"
    ]
  },
  {
    emoji: "🦠",
    title: "Иммунная система / воспалительные заболевания",
    icon: Shield,
    conditions: [
      "Частые простуды (более 4 раз в год)",
      "Аутоиммунные болезни (СЛЕ, ревматоидный артрит и др.)",
      "Хронические воспаления (гайморит, тонзиллит, цистит, простатит)",
      "Повышенный CRP",
      "Аллергии (пищевая, пыльцевая, кожная)",
      "Атопический дерматит",
      "Астма"
    ]
  },
  {
    emoji: "💊",
    title: "Инфекционные заболевания в прошлом",
    icon: Pill,
    conditions: [
      "COVID-19 (особенно если тяжело перенесён)",
      "Мононуклеоз (EBV)",
      "Цитомегаловирус",
      "Герпес-вирусы (HSV-1/2)",
      "ВПЧ",
      "Хронический кандидоз",
      "Паразитарные инфекции (лямблии, гельминты)"
    ]
  }
];

export function RegisterStep3({ formData, updateFormData, onSubmit, onBack, isSubmitting }: RegisterStep3Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);

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

  const filteredCategories = medicalCategories.map(category => ({
    ...category,
    conditions: category.conditions.filter(c =>
      c.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.conditions.length > 0);

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
                      <p className="font-medium">{category.title}</p>
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
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? "Создание..." : "Создать аккаунт"}
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
